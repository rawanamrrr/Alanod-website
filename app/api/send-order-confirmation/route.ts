import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { createEmailTemplate, createEmailSection, createOrderItemsTable } from "@/lib/email-templates"

export async function POST(request: NextRequest) {
  try {
    const { order } = await request.json()

    if (!order) {
      return NextResponse.json({ error: "Order is required" }, { status: 400 })
    }

    // Get customer email from order details
    const customerEmail = order.shippingAddress?.email

    if (!customerEmail) {
      return NextResponse.json({ error: "Customer email not found in order details" }, { status: 400 })
    }

    console.log("📧 [EMAIL] Order confirmation request received")
    console.log("📧 [EMAIL] Order ID:", order.id)
    console.log("📧 [EMAIL] Customer Email:", customerEmail)
    console.log("📧 [EMAIL] Order structure:", JSON.stringify(order, null, 2))

    // Check environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("❌ [EMAIL] Missing email configuration")
      console.error("   EMAIL_USER:", !!process.env.EMAIL_USER)
      console.error("   EMAIL_PASS:", !!process.env.EMAIL_PASS)
      return NextResponse.json({ 
        error: "Email configuration missing. Please check EMAIL_USER and EMAIL_PASS environment variables." 
      }, { status: 500 })
    }

    // Create transporter
    console.log("📧 [EMAIL] Creating email transporter...")
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    // Verify transporter configuration
    console.log("📧 [EMAIL] Verifying transporter configuration...")
    try {
      await transporter.verify()
      console.log("✅ [EMAIL] Transporter verification successful")
    } catch (verifyError) {
      console.error("❌ [EMAIL] Transporter verification failed:", verifyError)
      return NextResponse.json({ 
        error: "Email service configuration error. Please check your email credentials.", 
        details: verifyError instanceof Error ? verifyError.message : String(verifyError)
      }, { status: 500 })
    }

    // Get country code and currency first (needed for conversion)
    // Check multiple possible locations for country code
    const countryCode = order.shippingAddress?.countryCode || 
                        order.shipping_address?.countryCode || 
                        order.shipping_address?.country_code ||
                        (order.shippingAddress?.country && getCountryCodeFromName(order.shippingAddress.country)) ||
                        (order.shipping_address?.country && getCountryCodeFromName(order.shipping_address.country)) ||
                        'US'
    
    console.log("📧 [EMAIL] Extracted country code:", countryCode)
    console.log("📧 [EMAIL] Order shippingAddress:", JSON.stringify(order.shippingAddress, null, 2))
    console.log("📧 [EMAIL] Order shipping_address:", JSON.stringify(order.shipping_address, null, 2))
    
    // Helper function to get country code from country name
    function getCountryCodeFromName(countryName: string): string {
      const nameToCode: Record<string, string> = {
        "United States": "US",
        "Saudi Arabia": "SA",
        "United Arab Emirates": "AE",
        "Kuwait": "KW",
        "Qatar": "QA",
        "United Kingdom": "GB",
        "Egypt": "EG",
        "Oman": "OM",
        "Bahrain": "BH",
        "Iraq": "IQ",
        "Jordan": "JO",
        "Turkey": "TR",
        "Lebanon": "LB",
      }
      return nameToCode[countryName] || 'US'
    }
    
    // Map country code to currency code
    const COUNTRY_TO_CURRENCY: Record<string, string> = {
      "US": "USD",
      "SA": "SAR",
      "AE": "AED",
      "KW": "KWD",
      "QA": "QAR",
      "GB": "GBP",
      "EG": "EGP",
      "OM": "OMR",
      "BH": "BHD",
      "IQ": "IQD",
      "JO": "JOD",
      "TR": "TRY",
      "LB": "LBP",
    }
    
    const currencyCode = COUNTRY_TO_CURRENCY[countryCode] || "USD"
    console.log("📧 [EMAIL] Using currency code:", currencyCode)
    
    // Get exchange rate (order total is in USD, need to convert to customer's currency)
    const DEFAULT_RATES: Record<string, number> = {
      USD: 1,
      SAR: 3.75,
      AED: 3.67,
      KWD: 0.31,
      QAR: 3.64,
      GBP: 0.79,
      EGP: 50,
      OMR: 0.38,
      BHD: 0.38,
      IQD: 1310,
      JOD: 0.71,
      TRY: 32,
      LBP: 15000,
    }
    
    const exchangeRate = DEFAULT_RATES[currencyCode] || 1
    
    // Convert USD amounts to customer's currency
    const convertToCurrency = (usdAmount: number) => {
      return usdAmount * exchangeRate
    }

    // Calculate totals (order.total is in USD, convert to customer's currency)
    const subtotalUSD = order.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
    const shippingUSD = order.total - subtotalUSD + (order.discountAmount || 0)
    
    // Convert to customer's currency for display
    const subtotal = convertToCurrency(subtotalUSD)
    const shipping = convertToCurrency(shippingUSD)
    const discountAmount = convertToCurrency(order.discountAmount || 0)
    const total = convertToCurrency(order.total)
    
    // Create order items for the table (convert prices to customer's currency)
    console.log("📧 [EMAIL] Processing order items...")
    console.log("📧 [EMAIL] Order items:", order.items)
    
    const orderItems = order.items.map((item: any) => {
      console.log("📧 [EMAIL] Processing item:", item)
      const itemPriceUSD = item.price || 0
      const itemQuantity = item.quantity || 1
      const itemTotalUSD = itemPriceUSD * itemQuantity
      return {
        name: `${item.name}${item.size ? ` - ${item.size}` : ''}${item.volume ? ` (${item.volume})` : ''}`,
        quantity: itemQuantity,
        price: convertToCurrency(itemPriceUSD),
        total: convertToCurrency(itemTotalUSD)
      }
    })

    // Create email content sections
    console.log("📧 [EMAIL] Creating greeting section...")
    const greeting = createEmailSection({
      content: `
        <h2>Hello ${order.shippingAddress?.name || 'Valued Customer'},</h2>
        <p>Thank you for your order! We've received your order and it's being processed. Here are your order details:</p>
      `
    })

    console.log("📧 [EMAIL] Creating order summary section...")
    let orderTable
    try {
      orderTable = createOrderItemsTable(orderItems)
      console.log("📧 [EMAIL] Order table created successfully")
    } catch (tableError) {
      console.error("📧 [EMAIL] Error creating order table:", tableError)
      orderTable = '<p>Order items will be listed in a separate email.</p>'
    }

    const orderSummary = createEmailSection({
      title: `Order #${order.id}`,
      highlight: true,
      content: `
        <div style="margin-bottom: 20px;">
          <span class="status-badge status-badge-success">Confirmed</span>
        </div>
        <p><strong>Order Date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
        <p><strong>Payment Method:</strong> Cash on Delivery</p>
        
        <h4>Items Ordered:</h4>
        ${orderTable}
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid currentColor;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)} ${currencyCode}</span>
          </div>
          
          ${order.discountAmount ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #16a34a;">
            <span>Discount (${order.discountCode}):</span>
            <span>-${discountAmount.toFixed(2)} ${currencyCode}</span>
          </div>
          ` : ''}
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <span>Shipping:</span>
            <span>${shipping > 0 ? `${shipping.toFixed(2)} ${currencyCode}` : "Free"}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 600; padding-top: 15px; border-top: 2px solid currentColor;">
            <span>Total:</span>
            <span>${total.toFixed(2)} ${currencyCode}</span>
          </div>
        </div>
      `
    })

    console.log("📧 [EMAIL] Creating shipping info section...")
    const shippingAddress = order.shippingAddress || {}
    const shippingInfo = createEmailSection({
      title: "Shipping Address",
      content: `
        <p style="line-height: 1.8; margin: 0;">
          <strong>${shippingAddress.name || 'N/A'}</strong><br>
          ${shippingAddress.address || 'N/A'}<br>
          ${shippingAddress.city || 'N/A'}${shippingAddress.country ? `, ${shippingAddress.country}` : shippingAddress.governorate ? `, ${shippingAddress.governorate}` : ''}<br>
          ${shippingAddress.postalCode ? `${shippingAddress.postalCode}<br>` : ''}
          <strong>Phone:</strong> ${shippingAddress.phone || 'N/A'}
        </p>
      `
    })

    const nextSteps = createEmailSection({
      title: "What's Next?",
      content: `
        <ul style="margin: 0; padding-left: 20px;">
          <li>We'll process your order within 1-2 business days</li>
          <li>You'll receive a shipping confirmation with tracking details</li>
          <li>Your order is expected to arrive within 15 to 20 days</li>
          <li>Note: Custom designs outside our collection may require additional time, depending on the style and level of detail</li>
          <li>Payment will be collected upon delivery</li>
        </ul>
        
        <hr class="divider">
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.alanoudalqadi.com'}/account" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 5px; font-weight: 600;">
            Track Your Order
          </a>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.alanoudalqadi.com'}/products" style="display: inline-block; background-color: transparent; color: #000; padding: 12px 24px; text-decoration: none; border: 2px solid #000; border-radius: 4px; margin: 5px; font-weight: 600;">
            Continue Shopping
          </a>
        </div>
        
        <p style="text-align: center; margin-top: 20px;">
          Have questions? Contact us at <a href="mailto:alanodalqadi@gmail.com">alanodalqadi@gmail.com</a> or WhatsApp: +971 50 299 6885
        </p>
      `
    })

    console.log("📧 [EMAIL] Building email content...")
    const emailContent = greeting + orderSummary + shippingInfo + nextSteps

    console.log("📧 [EMAIL] Creating email template...")
    let htmlContent
    try {
      htmlContent = createEmailTemplate({
        title: "Order Confirmation - Alanoud Alqadi Atelier",
        preheader: `Order #${order.id} confirmed - Thank you for choosing Alanoud Alqadi Atelier!`,
        content: emailContent,
        theme: { mode: 'light' }
      })
      console.log("📧 [EMAIL] Email template created successfully")
    } catch (templateError) {
      console.error("📧 [EMAIL] Error creating email template:", templateError)
      throw new Error(`Email template creation failed: ${templateError}`)
    }

    // Send email
    console.log("📧 [EMAIL] Sending email to:", customerEmail)
    try {
      await transporter.sendMail({
        from: `"Alanoud Alqadi Atelier" <${process.env.EMAIL_USER}>`,
        to: customerEmail,
        subject: `Order Confirmation #${order.id} - Alanoud Alqadi Atelier`,
        html: htmlContent,
      })

      console.log("✅ [EMAIL] Order confirmation email sent successfully to:", customerEmail)
      return NextResponse.json({ success: true, message: "Confirmation email sent" })
    } catch (emailError) {
      console.error("❌ [EMAIL] Failed to send email:", emailError)
      throw emailError
    }
  } catch (error) {
    console.error("❌ Error sending order confirmation email:", error)
    return NextResponse.json({ error: "Failed to send confirmation email" }, { status: 500 })
  }
}
