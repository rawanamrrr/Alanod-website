type EmailRecipient = {
  email: string
  name?: string
}

export interface SendEmailOptions {
  to: string | EmailRecipient | Array<string | EmailRecipient>
  subject: string
  html: string
  fromEmail?: string
  fromName?: string
  replyTo?: EmailRecipient
}

function normalizeRecipients(to: SendEmailOptions["to"]): EmailRecipient[] {
  if (Array.isArray(to)) {
    return to.map((item) => (typeof item === "string" ? { email: item } : item))
  }

  if (typeof to === "string") {
    return [{ email: to }]
  }

  return [to]
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = options.fromEmail || process.env.EMAIL_USER

  if (!apiKey || !senderEmail) {
    console.error("❌ [EMAIL] Missing email configuration", {
      hasApiKey: !!apiKey,
      hasSenderEmail: !!senderEmail,
    })

    throw new Error(
      "Email configuration missing. Please check BREVO_API_KEY and EMAIL_USER environment variables.",
    )
  }

  console.log("📧 [EMAIL] Sending with sender email:", senderEmail)

  const sender: EmailRecipient = {
    email: senderEmail,
    ...(options.fromName ? { name: options.fromName } : {}),
  }

  const to = normalizeRecipients(options.to)

  const payload: any = {
    sender,
    to,
    subject: options.subject,
    htmlContent: options.html,
  }

  if (options.replyTo) {
    payload.replyTo = options.replyTo
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let errorBody: string | undefined

    try {
      errorBody = await response.text()
    } catch {
      errorBody = undefined
    }

    console.error("❌ [EMAIL] Brevo send email failed", {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
    })

    throw new Error(`Brevo email send failed with status ${response.status}`)
  }
}
