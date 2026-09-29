const DEFAULT_PAYSTACK_CURRENCIES = new Set(["NGN"])

export function paystackSupportsCurrency(
  currency: string,
  environment: Record<string, string | undefined> = process.env,
) {
  const configured = environment.PAYSTACK_SUPPORTED_CURRENCIES?.trim()
  const supported = configured
    ? new Set(
        configured
          .split(",")
          .map((value) => value.trim().toUpperCase())
          .filter((value) => /^[A-Z]{3}$/.test(value)),
      )
    : DEFAULT_PAYSTACK_CURRENCIES

  return supported.has(currency.trim().toUpperCase())
}

export function hasPaystackConfiguration(
  environment: Record<string, string | undefined> = process.env,
) {
  return Boolean(environment.PAYSTACK_SECRET_KEY?.trim())
}
