import { type NextRequest, NextResponse } from "next/server"
import { createEmailTemplate, createEmailSection } from "@/lib/email-templates"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { order, previousStatus, newStatus } = await request.json()

    if (!order || !newStatus) {
      return NextResponse.json({ error: "Order and new status are required" }, { status: 400 })
    }

    // Helper function to get country code from country name

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
    
    // Determine preferred currency code based on order data / locale
    // 1) Try explicit currency fields on the order, if present
    const explicitCurrency = order.currencyCode || order.currency || order.currency_code

    // 2) Fallback to country-based detection (shipping country)
    const countryCode = order.shippingAddress?.countryCode || 
                        order.shipping_address?.countryCode || 
                        order.shipping_address?.country_code ||
                        (order.shippingAddress?.country && getCountryCodeFromName(order.shippingAddress.country)) ||
                        (order.shipping_address?.country && getCountryCodeFromName(order.shipping_address.country)) ||
                        'US'
    
    console.log("📧 [EMAIL UPDATE] Extracted country code:", countryCode)
    console.log("📧 [EMAIL UPDATE] Order shippingAddress:", JSON.stringify(order.shippingAddress, null, 2))
    
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
    
    // Prefer explicit currency from the order if available,
    // otherwise derive it from the shipping country.
    const derivedCurrencyCode = COUNTRY_TO_CURRENCY[countryCode] || "USD"
    const currencyCode = (typeof explicitCurrency === "string" && explicitCurrency.trim()) || derivedCurrencyCode
    console.log("📧 [EMAIL UPDATE] Using currency code:", currencyCode)
    
    // Helper to fetch a near real-time exchange rate (USD -> target currency)
    const fetchExchangeRateForEmail = async (targetCurrency: string): Promise<number> => {
      try {
        if (!targetCurrency || targetCurrency === "USD") {
          return 1
        }

        // Primary API
        try {
          const response = await fetch(
            `https://api.exchangerate.host/latest?base=USD&symbols=${encodeURIComponent(targetCurrency)}`,
            { cache: "no-store" }
          )
          if (response.ok) {
            const data = await response.json()
            const rate = data?.rates?.[targetCurrency]
            if (typeof rate === "number" && rate > 0) {
              return rate
            }
          }
        } catch (err) {
          console.warn("📧 [EMAIL UPDATE] Primary exchange rate API failed, trying fallback...", err)
        }

        // Fallback API
        try {
          const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
            cache: "no-store",
          })
          if (response.ok) {
            const data = await response.json()
            const rate = data?.rates?.[targetCurrency]
            if (typeof rate === "number" && rate > 0) {
              return rate
            }
          }
        } catch (err) {
          console.warn("📧 [EMAIL UPDATE] Fallback exchange rate API failed", err)
        }

        console.error(`📧 [EMAIL UPDATE] Failed to fetch exchange rate for ${targetCurrency}, using 1`)
        return 1
      } catch (err) {
        console.error("📧 [EMAIL UPDATE] Unexpected error while fetching exchange rate", err)
        return 1
      }
    }

    // Get exchange rate (order.total is in USD, need to convert to customer's currency)
    const exchangeRate = await fetchExchangeRateForEmail(currencyCode)
    
    // Convert USD amounts to customer's currency
    const convertToCurrency = (usdAmount: number) => {
      return usdAmount * exchangeRate
    }
    
    // Get status-specific content
    const statusContent = getStatusContent(newStatus, order)
    const customerEmail = order.shippingAddress.email

    // Create email content sections
    const greeting = createEmailSection({
      content: `
        <h2>Hello ${order.shippingAddress.name},</h2>
        <p>Your order status has been updated. Here's what's happening with your order:</p>
      `
    })

    const orderStatusSection = createEmailSection({
      title: `Order #${order.id}`,
      highlight: true,
      content: `
        <div style="margin-bottom: 20px;">
          <span class="status-badge" style="background: ${statusContent.badgeColor};">${statusContent.title}</span>
        </div>
        
        <p><strong>Previous Status:</strong> ${previousStatus || 'New Order'}</p>
        <p><strong>Current Status:</strong> ${newStatus}</p>
        <p><strong>Updated:</strong> ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
      `
    })

    const orderSummarySection = createEmailSection({
      title: "Order Summary",
      content: `
        ${order.items
          .map(
            (item: any) => {
              // Convert item price from USD to customer's currency
              const itemTotalUSD = item.price * item.quantity
              const itemTotal = convertToCurrency(itemTotalUSD)
              return `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid currentColor; opacity: 0.3;">
                <div>
                    <strong>${item.name}</strong><br>
                    <small>${item.size} (${item.volume}) × ${item.quantity}</small>
                </div>
                <div>${itemTotal.toFixed(2)} ${currencyCode}</div>
            </div>
        `
            }
          )
          .join("")}
        <div style="font-weight: bold; font-size: 18px; padding-top: 15px; border-top: 2px solid currentColor; text-align: right; margin-top: 15px;">
            Total: ${convertToCurrency(order.total).toFixed(2)} ${currencyCode}
        </div>
      `
    })

    const statusDescriptionSection = statusContent.description ? createEmailSection({
      content: statusContent.description
    }) : ''

    const ctaSection = createEmailSection({
      content: `
        ${statusContent.cta ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${statusContent.cta.url}" class="btn btn-primary">${statusContent.cta.text}</a>
        </div>
        ` : ''}
        
        <hr class="divider">
        
        <p style="text-align: center;">
          Have questions about your order? Contact us at <a href="mailto:alanodalqadi@gmail.com">alanodalqadi@gmail.com</a> or WhatsApp: +971 50 299 6885
        </p>
      `
    })

    const emailContent = greeting + orderStatusSection + orderSummarySection + statusDescriptionSection + ctaSection

    const htmlContent = createEmailTemplate({
      title: "Order Update - Alanoud Alqadi Atelier",
      preheader: `Order #${order.id} status: ${newStatus}`,
      content: emailContent,
      theme: { mode: 'light' }
    })

    // Send email via Brevo
    await sendEmail({
      to: customerEmail,
      subject: `Order Update #${order.id} - ${statusContent.title}`,
      html: htmlContent,
      fromName: "Alanoud Alqadi Atelier",
    })

    console.log(`✅ Order update email sent to ${customerEmail} - Status: ${newStatus}`)

    return NextResponse.json({ success: true, message: "Update email sent" })
  } catch (error) {
    console.error("❌ Error sending order update email:", error)
    return NextResponse.json({ error: "Failed to send update email" }, { status: 500 })
  }
}

function getStatusContent(status: string, order: any) {
  switch (status) {
    case 'processing':
      return {
        title: 'Processing',
        badgeColor: '#FFA500',
        description: `
          <h3>Your order is being processed!</h3>
          <p>We're carefully preparing your couture pieces for shipment. This usually takes 1-2 business days.</p>
          <ul>
            <li>Quality checking each product</li>
            <li>Packaging with care</li>
            <li>Preparing shipping documents</li>
          </ul>
        `
      }
    
    case 'shipped':
      return {
        title: 'Shipped',
        badgeColor: '#2196F3',
        description: `
          <h3>Your order is on its way!</h3>
          <p>Your order has been shipped and is heading to your address. The shipment is expected to arrive within 15 to 20 days.</p>
          <ul>
            <li>Package has been picked up by courier</li>
            <li>Estimated delivery: 15 to 20 days</li>
            <li>Note: Custom designs outside our collection may require additional time</li>
            <li>You'll receive a call from the courier before delivery</li>
          </ul>
        `
      }
    
    case 'delivered':
      return {
        title: 'Delivered',
        badgeColor: '#4CAF50',
        description: `
          <h3>Your order has been delivered!</h3>
          <p>We hope you love your new look! Please take a moment to share your experience with us.</p>
          <ul>
            <li>Enjoy your new couture pieces</li>
            <li>Share your experience with a review</li>
            <li>Help other customers make informed decisions</li>
          </ul>
        `,
        cta: {
          text: 'Leave a Review',
          url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.alanoudalqadi.com'}/account`
        }
      }
    
    case 'cancelled':
      return {
        title: 'Cancelled',
        badgeColor: '#F44336',
        description: `
          <h3>Order Cancelled</h3>
          <p>Your order has been cancelled. If you have any questions about this cancellation, please contact us.</p>
          <p>If you'd like to place a new order, we'd be happy to help!</p>
        `
      }
    
    default:
      return {
        title: 'Status Updated',
        badgeColor: '#9E9E9E',
        description: `
          <h3>Order Status Updated</h3>
          <p>Your order status has been updated to: <strong>${status}</strong></p>
        `
      }
  }
}

