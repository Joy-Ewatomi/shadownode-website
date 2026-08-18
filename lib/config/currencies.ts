/**
 * ShadowNode Supported Currencies
 *
 * These are the currencies that may be used for
 * client-facing quotes, negotiations, invoices,
 * and payments.
 */

export const SUPPORTED_CURRENCIES = [
  "USD",
  "NGN",
  "GBP",
  "EUR",
  "CAD",
  "AUD",
  "INR",
  "ZAR",
  "KES",
  "GHS",
] as const

export type SupportedCurrency =
  (typeof SUPPORTED_CURRENCIES)[number]

export const SUPPORTED_CURRENCY_SET =
  new Set<string>(SUPPORTED_CURRENCIES)

export function normalizeCurrency(
  currency: string | null | undefined,
): string {
  return (
    currency?.trim().toUpperCase() || "USD"
  )
}

export function isSupportedCurrency(
  currency: string | null | undefined,
): currency is SupportedCurrency {
  if (!currency) return false

  return SUPPORTED_CURRENCY_SET.has(
    currency.trim().toUpperCase(),
  )
}

export function requireSupportedCurrency(
  currency: string | null | undefined,
): SupportedCurrency {
  const normalized =
    normalizeCurrency(currency)

  if (
    !SUPPORTED_CURRENCY_SET.has(
      normalized,
    )
  ) {
    throw new Error(
      `Unsupported currency: ${normalized}`,
    )
  }

  return normalized as SupportedCurrency
}