import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createEmailTemplate, createEmailSection } from "@/lib/email-templates"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 })
    }

    // Get active offers
    const now = new Date().toISOString()
    const { data: offers } = await supabase
      .from("offers")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3)

    // Generate offers section
    const offersSection = offers && offers.length > 0
      ? createEmailSection({
          title: "🎁 Current Offers Just For You!",
          highlight: true,
          content: offers
            .map((offer) => {
              const title = offer.title ? offer.title : ""
              const description = offer.description ? offer.description : ""
              const discountCode = offer.link_url
                ? `<div class="status-badge status-badge-info" style="font-family: monospace;">
                     ${offer.link_url}
                   </div>`
                : ""

              return `
                <div class="email-card" style="margin: 15px 0;">
                  ${title ? `<h4 style="margin: 0 0 10px 0;">${title}</h4>` : ""}
                  ${description ? `<p style="margin: 0 0 15px 0;">${description}</p>` : ""}
                  ${discountCode}
                </div>
              `
            })
            .join(""),
        })
      : ""

    // Create email content sections
    const greeting = createEmailSection({
      content: `
        <h2>Welcome to Alanoud Alqadi Atelier, ${name}!</h2>
        <p>Thank you for joining our couture community. We cannot wait to dress your unforgettable evenings with silhouettes that shimmer, sculpt, and celebrate you.</p>
      `
    })

    const welcomeBenefits = createEmailSection({
      title: "🎁 Welcome Benefits",
      highlight: true,
      content: `
        <div class="email-card" style="margin: 0;">
          <strong>Complimentary Styling Call</strong> with our atelier concierge
        </div>
        <div class="email-card" style="margin: 0;">
          <strong>Priority Access</strong> to new capsule drops and trunk shows
        </div>
        <div class="email-card" style="margin: 0;">
          <strong>Exclusive Lookbook</strong> delivered straight to your inbox each season
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.alanoudalqadi.com'}/products" class="btn btn-primary">
            Discover the Collections
          </a>
        </div>
      `
    })

    const whyChooseUs = createEmailSection({
      title: "Why Alanoud Alqadi?",
      content: `
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Hand-finished gowns crafted by specialist artisans</li>
          <li>Custom tailoring for every silhouette and celebration</li>
          <li>On-call atelier concierge for fittings and styling</li>
          <li>Private previews of limited capsules and archive releases</li>
        </ul>
        
        <hr class="divider">
        
        <p style="text-align: center; margin: 0;">
          Stay connected with us for atelier diaries, runway teasers, and couture care tips. Follow us on social media and never miss an update!
        </p>
      `
    })

    const emailContent = greeting + offersSection + welcomeBenefits + whyChooseUs

    // Send welcome email with offers via Brevo
    await sendEmail({
      to: email,
      subject: "Welcome to Alanoud Alqadi Atelier",
      html: createEmailTemplate({
        title: "Welcome to Alanoud Alqadi Atelier",
        preheader: `Welcome ${name}! Discover couture benefits and styling support.`,
        content: emailContent,
        theme: { mode: 'light' }
      })
    })

    return NextResponse.json({ message: "Welcome email sent successfully" })
  } catch (error) {
    console.error("Welcome email error:", error)
    return NextResponse.json({ error: "Failed to send welcome email" }, { status: 500 })
  }
}
