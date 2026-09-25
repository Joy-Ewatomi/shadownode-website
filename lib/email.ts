import { createPasswordResetActionUrl } from "@/lib/app-origin"
import {
  createEmailActionUrl,
  renderShadowNodeEmail,
  type EmailTemplateInput,
} from "@/lib/email-template"
import { validMailbox } from "@/lib/email-address"

export type EmailAttachment = {
  filename: string
  type?: string
  data: string
}

export async function sendEmail(options: {
  to: string | string[]
  subject: string
  content: EmailTemplateInput
  attachments?: EmailAttachment[]
  replyTo?: string
  from?: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = validMailbox(options.from || process.env.EMAIL_FROM)
  if (!apiKey || !from) return false

  const rendered = renderShadowNodeEmail(options.content)
  const body: {
    from: string
    to: string[]
    subject: string
    html: string
    text: string
    reply_to?: string
    attachments?: Array<{ filename: string; type: string; data: string }>
  } = {
    from,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: rendered.html,
    text: rendered.text,
  }

  if (options.replyTo) body.reply_to = options.replyTo

  if (options.attachments?.length) {
    body.attachments = options.attachments.map((attachment) => ({
      filename: attachment.filename,
      type: attachment.type || "application/octet-stream",
      data: attachment.data,
    }))
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Email send failed with status ${response.status}`)
  }
  return true
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  recipientName?: string | null,
) {
  const verificationUrl = createEmailActionUrl(
    "/api/auth/verify-email",
    { token },
  )
  if (!verificationUrl) return false

  return sendEmail({
    to: email,
    subject: "Verify your ShadowNode account",
    content: {
      preheader: "Complete your email verification to secure your ShadowNode account.",
      category: "Account security",
      heading: "Verify your email address",
      recipientName,
      paragraphs: [
        "Thank you for creating a ShadowNode account.",
        "Email verification is required before you can access protected ShadowNode services.",
      ],
      cta: {
        label: "Verify email address",
        url: verificationUrl,
        showFallbackUrl: true,
      },
      expiryNotice: "This verification link expires in 24 hours.",
      securityNotice: "If you did not create this account, you can safely ignore this email.",
    },
  })
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  recipientName?: string | null,
) {
  const resetUrl = createPasswordResetActionUrl(token)
  if (!resetUrl) return false

  return sendEmail({
    to: email,
    subject: "Reset your ShadowNode password",
    content: {
      preheader: "A secure password-reset request was made for your ShadowNode account.",
      category: "Account security",
      heading: "Reset your password",
      recipientName,
      paragraphs: [
        "We received a request to reset the password for your ShadowNode account.",
        "Use the secure link below to choose a new password.",
      ],
      cta: {
        label: "Reset password",
        url: resetUrl,
        showFallbackUrl: true,
      },
      expiryNotice: "This secure link expires in 15 minutes and can only be used once.",
      securityNotice: "If you did not request this reset, ignore this email and consider reviewing your account security.",
    },
  })
}

export async function sendWelcomeEmail(
  email: string,
  recipientName?: string | null,
) {
  const firstName = recipientName?.trim().split(/\s+/)[0] || null
  const portalUrl = createEmailActionUrl("/dashboard/client", {})
  if (!portalUrl) return false

  return sendEmail({
    to: email,
    subject: "Welcome to ShadowNode Operations Bureau",
    content: {
      preheader: "Your secure ShadowNode client account is ready.",
      category: "Client account",
      heading: "Welcome to ShadowNode Operations Bureau",
      recipientName: firstName,
      paragraphs: [
        "Welcome to ShadowNode Operations Bureau Limited. Your secure client account is ready.",
        "Use the portal to submit and track service requests, review quotations and decisions, communicate through approved channels, and access reports, training information and certificates.",
        "Requests remain subject to review and are not automatically accepted.",
      ],
      cta: { label: "Open client portal", url: portalUrl },
      securityNotice: "Keep your login credentials private, enable two-factor authentication, and access sensitive information only through the official secure portal.",
      closingLines: [
        "Warm regards,",
        "",
        "Joy Ewatomi",
        "Chief Executive Officer",
        "ShadowNode Operations Bureau Limited",
      ],
    },
  })
}
