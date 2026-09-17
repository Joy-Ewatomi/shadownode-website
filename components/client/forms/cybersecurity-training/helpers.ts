import { COUNTRY_CURRENCY_MAP } from "./constants"

export function getCurrency(country: string): string {
  return COUNTRY_CURRENCY_MAP[country] || "USD"
}

export function toggleArray(
  current: string[],
  value: string
): string[] {
  if (current.includes(value)) {
    return current.filter((item) => item !== value)
  }

  return [...current, value]
}

export function isEmailMethod(method: string) {
  return method === "email"
}

export function isWhatsappMethod(method: string) {
  return method === "whatsapp"
}

export function isSignalMethod(method: string) {
  return false
}

export function isPortalMethod(method: string) {
  return method === "portal" || method === "portal_notification"
}
