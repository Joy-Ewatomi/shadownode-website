import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input"

export const COMMUNICATION_PREFERENCES = ["portal", "email", "whatsapp"] as const
export type CommunicationPreference = (typeof COMMUNICATION_PREFERENCES)[number]

export class CommunicationPreferenceError extends Error {}

export function normalizeCommunicationPreference(value: unknown): CommunicationPreference {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (normalized === "portal" || normalized === "portal_notification" || normalized === "portal_only") return "portal"
  if (normalized === "email" || normalized === "email_updates" || normalized === "email_notification") return "email"
  if (normalized === "whatsapp" || normalized === "whats_app" || normalized === "whatsapp_updates") return "whatsapp"
  throw new CommunicationPreferenceError("Select Portal, Email or WhatsApp.")
}

export function normalizeWhatsAppNumber(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  try {
    const phone = parsePhoneNumber(value.trim())
    return phone && isValidPhoneNumber(phone.number) ? phone.number : null
  } catch {
    return null
  }
}

export function validateCommunicationSelection(input: {
  preference: unknown
  whatsappNumber?: unknown
  whatsappConsent?: unknown
}) {
  const preference = normalizeCommunicationPreference(input.preference)
  const whatsappNumber = normalizeWhatsAppNumber(input.whatsappNumber)
  const whatsappConsent = input.whatsappConsent === true
  if (preference === "whatsapp" && !whatsappNumber) {
    throw new CommunicationPreferenceError("Enter a valid WhatsApp number including its country code.")
  }
  if (preference === "whatsapp" && !whatsappConsent) {
    throw new CommunicationPreferenceError("WhatsApp consent is required to select WhatsApp.")
  }
  return { preference, whatsappNumber, whatsappConsent }
}

export function maskWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.length < 5) return "Hidden"
  return `+${digits.slice(0, 3)}••••${digits.slice(-3)}`
}

export function validMailbox(value: string | undefined) {
  const mailbox = value?.trim() || ""
  if (!mailbox || /[\r\n]/.test(mailbox)) return null
  const match = mailbox.match(/^(?:[^<>]{1,100}\s*)?<([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>$/)
  const address = match?.[1] || mailbox
  return /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(address) ? mailbox : null
}

export function validReplyTo(value: string | undefined) {
  const mailbox = validMailbox(value)
  if (!mailbox) return null
  const match = mailbox.match(/<([^<>]+)>$/)
  return match?.[1] || mailbox
}

export function operationalEmailFrom() {
  return validMailbox(process.env.CLIENT_SERVICES_EMAIL_FROM) || validMailbox(process.env.EMAIL_FROM)
}
