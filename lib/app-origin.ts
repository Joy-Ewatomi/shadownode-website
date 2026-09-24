export type ApplicationOriginSource =
  | "APP_URL"
  | "NEXT_PUBLIC_APP_URL"
  | "URL"
  | "DEPLOY_PRIME_URL"

export type TrustedApplicationOrigin = {
  origin: string
  source: ApplicationOriginSource
}

const ORIGIN_SOURCES: readonly ApplicationOriginSource[] = [
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "URL",
  "DEPLOY_PRIME_URL",
]

export function validateApplicationOrigin(
  value: string | undefined,
  production = process.env.NODE_ENV === "production",
) {
  if (!value || value !== value.trim()) return null
  if (/[\u0000-\u001f\u007f]/.test(value)) return null
  if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(value)) return null
  if (/[<>{}\[\]`()]/.test(value)) return null

  try {
    const parsed = new URL(value)
    if (parsed.protocol !== "https:" && (production || parsed.protocol !== "http:")) return null
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null
    if (parsed.pathname !== "/") return null
    if (!parsed.hostname) return null
    return parsed.origin
  } catch {
    return null
  }
}

export function resolveTrustedApplicationOrigin(
  environment: Record<string, string | undefined> = process.env,
  production = process.env.NODE_ENV === "production",
): TrustedApplicationOrigin | null {
  for (const source of ORIGIN_SOURCES) {
    const origin = validateApplicationOrigin(environment[source], production)
    if (origin) return { origin, source }
  }
  return null
}

export function getTrustedApplicationOrigin() {
  return resolveTrustedApplicationOrigin()?.origin || null
}

export function createPasswordResetActionUrl(
  rawToken: string,
  trustedOrigin = getTrustedApplicationOrigin(),
) {
  if (!trustedOrigin) return null
  const resetUrl = new URL("/reset-password", trustedOrigin)
  resetUrl.searchParams.set("token", rawToken)
  return resetUrl.toString()
}
