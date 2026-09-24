import { getTrustedApplicationOrigin } from "./app-origin"

export const EMAIL_LEGAL_NAME = "ShadowNode Operations Bureau Limited"
export const EMAIL_BRAND_NAME = "ShadowNode Operations Bureau"

export type EmailDetail = {
  label: string
  value: string
}

export type EmailTemplateInput = {
  preheader: string
  category: string
  heading: string
  recipientName?: string | null
  paragraphs: string[]
  cta?: {
    label: string
    url: string
    showFallbackUrl?: boolean
  }
  details?: EmailDetail[]
  expiryNotice?: string
  securityNotice?: string
}

export type RenderedEmail = {
  html: string
  text: string
}

export function escapeEmailHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function getEmailApplicationOrigin() {
  return getTrustedApplicationOrigin()
}

export function createEmailActionUrl(
  pathname: string,
  parameters: Record<string, string>,
) {
  const origin = getEmailApplicationOrigin()
  if (!origin) return null

  const url = new URL(pathname, origin)
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}

export function validateEmailActionUrl(value: string) {
  const origin = getEmailApplicationOrigin()
  if (!origin) throw new Error("Application URL is not configured")

  const url = new URL(value)
  if (url.origin !== origin) {
    throw new Error("Email action URL must use the configured application origin")
  }
  return url.toString()
}

function cleanName(value: string | null | undefined) {
  const name = value?.replace(/\s+/g, " ").trim()
  return name || null
}

export function renderShadowNodeEmail(input: EmailTemplateInput): RenderedEmail {
  const origin = getEmailApplicationOrigin()
  if (!origin) throw new Error("Application URL is not configured")

  const year = new Date().getFullYear()
  const name = cleanName(input.recipientName)
  const ctaUrl = input.cta ? validateEmailActionUrl(input.cta.url) : null
  const greeting = name ? `Dear ${name},` : "Hello,"
  const bodyHtml = input.paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;color:#253044;font-size:16px;line-height:1.65;">${escapeEmailHtml(paragraph)}</p>`)
    .join("")
  const detailsHtml = input.details?.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border:1px solid #d9e0e8;background:#f5f7fa;"><tr><td style="padding:16px 18px;">${input.details.map((detail) => `<p style="margin:0 0 8px;color:#253044;font-size:14px;line-height:1.5;"><strong>${escapeEmailHtml(detail.label)}:</strong> ${escapeEmailHtml(detail.value)}</p>`).join("")}</td></tr></table>`
    : ""
  const ctaHtml = input.cta && ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0;"><tr><td bgcolor="#245b91" style="border-radius:4px;"><a href="${escapeEmailHtml(ctaUrl)}" style="display:inline-block;padding:13px 22px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">${escapeEmailHtml(input.cta.label)}</a></td></tr></table>${input.cta.showFallbackUrl ? `<p style="margin:0 0 20px;color:#526176;font-size:13px;line-height:1.55;word-break:break-all;">If the button does not work, open this secure link:<br><a href="${escapeEmailHtml(ctaUrl)}" style="color:#245b91;">${escapeEmailHtml(ctaUrl)}</a></p>` : ""}`
    : ""
  const notice = (label: string, value?: string) => value
    ? `<p style="margin:12px 0 0;color:#526176;font-size:13px;line-height:1.55;"><strong>${escapeEmailHtml(label)}:</strong> ${escapeEmailHtml(value)}</p>`
    : ""

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#edf1f5;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeEmailHtml(input.preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#edf1f5;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border-collapse:collapse;"><tr><td style="padding:24px 28px;background:#101827;border-bottom:4px solid #b8964e;"><div style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;">ShadowNode</div><div style="margin-top:4px;color:#d7dde7;font-family:Arial,Helvetica,sans-serif;font-size:12px;">Operations Bureau</div></td></tr><tr><td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;"><p style="margin:0 0 10px;color:#8a6b2f;font-size:12px;font-weight:700;text-transform:uppercase;">${escapeEmailHtml(input.category)}</p><h1 style="margin:0 0 22px;color:#101827;font-size:26px;line-height:1.25;">${escapeEmailHtml(input.heading)}</h1><p style="margin:0 0 16px;color:#253044;font-size:16px;line-height:1.65;">${escapeEmailHtml(greeting)}</p>${bodyHtml}${detailsHtml}${ctaHtml}${notice("Expiry", input.expiryNotice)}${notice("Security", input.securityNotice)}</td></tr><tr><td style="padding:22px 28px;background:#f5f7fa;border-top:1px solid #d9e0e8;font-family:Arial,Helvetica,sans-serif;color:#526176;font-size:12px;line-height:1.6;"><strong style="color:#253044;">${EMAIL_LEGAL_NAME}</strong><br><a href="${escapeEmailHtml(origin)}" style="color:#245b91;">${escapeEmailHtml(origin)}</a><br><br>This is an automated service notification. Replies are not monitored.<br>&copy; ${year} ${EMAIL_LEGAL_NAME}.</td></tr></table></td></tr></table></body></html>`

  const lines = [
    EMAIL_BRAND_NAME,
    input.category,
    input.heading,
    "",
    greeting,
    "",
    ...input.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(input.details?.flatMap((detail) => [`${detail.label}: ${detail.value}`]) || []),
    ...(input.details?.length ? [""] : []),
    ...(input.cta && ctaUrl ? [`${input.cta.label}: ${ctaUrl}`, ""] : []),
    ...(input.expiryNotice ? [`Expiry: ${input.expiryNotice}`, ""] : []),
    ...(input.securityNotice ? [`Security: ${input.securityNotice}`, ""] : []),
    EMAIL_LEGAL_NAME,
    origin,
    "This is an automated service notification. Replies are not monitored.",
    `(c) ${year} ${EMAIL_LEGAL_NAME}.`,
  ]

  return { html, text: lines.join("\n").trim() }
}
