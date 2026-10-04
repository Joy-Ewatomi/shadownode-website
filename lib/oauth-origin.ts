export function oauthRequestUsesCanonicalHost(input: {
  canonicalOrigin: string
  forwardedHost?: string | null
  host?: string | null
  requestHost: string
}) {
  const canonicalHostname = new URL(input.canonicalOrigin).hostname.toLowerCase()
  const forwardedHost = input.forwardedHost
    ?.split(",")[0]
    ?.trim()
    .toLowerCase()
  const requestHostname = (forwardedHost || input.host || input.requestHost)
    .split(":")[0]
    .toLowerCase()

  return requestHostname === canonicalHostname
}
