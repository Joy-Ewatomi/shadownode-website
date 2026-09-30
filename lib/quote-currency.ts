export const AUTHORITATIVE_QUOTE_CURRENCY = "NGN" as const

export function requireAuthoritativeQuoteCurrency(
  value: string | null | undefined,
) {
  const currency = String(value ?? "").trim().toUpperCase()
  if (currency !== AUTHORITATIVE_QUOTE_CURRENCY) {
    throw new Error("ShadowNode quotations must be issued in NGN")
  }
  return AUTHORITATIVE_QUOTE_CURRENCY
}
