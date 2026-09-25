const MAX_WHATSAPP_MESSAGE_LENGTH = 1200

export type ManualWhatsAppPreparation = {
  destination: string
  message: string
  url: string
}

export interface WhatsAppDeliveryProvider {
  prepare(input: { destination: string; message: string }): ManualWhatsAppPreparation
  send(): Promise<never>
  getStatus(): Promise<"manual_confirmation_required">
}

export function createWaMeUrl(destination: string, message: string) {
  const digits = destination.replace(/\D/g, "")
  if (!/^\d{8,15}$/.test(digits) || !message.trim() || message.length > MAX_WHATSAPP_MESSAGE_LENGTH) {
    throw new Error("Invalid manual WhatsApp delivery.")
  }
  const url = new URL(`https://wa.me/${digits}`)
  url.searchParams.set("text", message)
  if (url.protocol !== "https:" || url.hostname !== "wa.me") throw new Error("Invalid WhatsApp destination.")
  return url.toString()
}

export const manualWhatsAppProvider: WhatsAppDeliveryProvider = {
  prepare({ destination, message }) {
    const normalizedMessage = message.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
    return { destination, message: normalizedMessage, url: createWaMeUrl(destination, normalizedMessage) }
  },
  async send() {
    throw new Error("Manual WhatsApp delivery requires operator confirmation.")
  },
  async getStatus() {
    return "manual_confirmation_required"
  },
}
