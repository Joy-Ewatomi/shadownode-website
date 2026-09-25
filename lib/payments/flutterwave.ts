import crypto from "crypto"

export const FLUTTERWAVE_API_BASE = "https://api.flutterwave.com/v3"

const SUPPORTED_CURRENCIES = new Set([
  "NGN", "USD", "GBP", "EUR", "GHS", "KES", "UGX", "RWF",
  "TZS", "ZAR", "XAF", "XOF", "MWK", "ZMW", "EGP",
])

export type FlutterwaveConfig = {
  secretKey: string
  secretHash: string
}

export function getFlutterwaveConfig(
  environment: Record<string, string | undefined> = process.env,
): FlutterwaveConfig | null {
  const secretKey = environment.FLUTTERWAVE_SECRET_KEY?.trim()
  const secretHash = environment.FLUTTERWAVE_SECRET_HASH?.trim()
  const publicKey = environment.FLUTTERWAVE_PUBLIC_KEY?.trim()

  if (!secretKey || !secretHash || !secretKey.startsWith("FLWSECK_TEST-")) return null
  if (publicKey && !publicKey.startsWith("FLWPUBK_TEST-")) return null

  return { secretKey, secretHash }
}

export function flutterwaveSupportsCurrency(currency: string) {
  return SUPPORTED_CURRENCIES.has(currency.trim().toUpperCase())
}

export function verifyFlutterwaveWebhookSignature(
  rawBody: string,
  signature: string | null,
  secretHash: string,
) {
  if (!signature) return false
  const expected = crypto.createHmac("sha256", secretHash).update(rawBody).digest("base64")
  const supplied = Buffer.from(signature)
  const wanted = Buffer.from(expected)
  return supplied.length === wanted.length && crypto.timingSafeEqual(supplied, wanted)
}

export function moneyToMinorUnits(value: string | number, currency: string) {
  const raw = String(value)
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return null
  const exponent = ["JPY", "UGX", "RWF", "XAF", "XOF"].includes(currency.toUpperCase()) ? 0 : 2
  const [whole, fraction = ""] = raw.split(".")
  if (fraction.length > exponent && /[1-9]/.test(fraction.slice(exponent))) return null
  const normalizedFraction = (fraction.slice(0, exponent) + "0".repeat(exponent)).slice(0, exponent)
  const minorUnits = `${whole}${normalizedFraction}`.replace(/^0+(?=\d)/, "")
  return minorUnits || "0"
}

export function isSafeFlutterwaveReference(value: string) {
  return /^SOB-FLW-[A-Za-z0-9_-]{20,100}$/.test(value)
}
