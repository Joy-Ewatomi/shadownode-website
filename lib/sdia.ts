import { domainToASCII } from "node:url"

export function normalizeDomainInput(value: unknown) {
  if (typeof value !== "string") return null
  const input = value.trim().toLowerCase().replace(/\.$/, "")
  if (!input || input.length > 253 || input.includes("://") || /[\s/@?#]/.test(input)) return null
  const domain = domainToASCII(input)
  if (!domain || domain.length > 253 || !domain.includes(".")) return null
  const labels = domain.split(".")
  if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return null
  if (/^\d+(?:\.\d+){3}$/.test(domain)) return null
  return domain
}

export function sdiaBaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.SDIA_API_URL?.trim()
  const candidate = configured || (env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "")
  if (!candidate) return null
  try {
    const url = new URL(candidate)
    const localDevelopment = env.NODE_ENV === "development" && url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname)
    if (url.protocol !== "https:" && !localDevelopment) return null
    if (url.username || url.password || url.search || url.hash) return null
    return url
  } catch { return null }
}

export function sdiaDomainEndpoint(env: NodeJS.ProcessEnv = process.env) {
  const base = sdiaBaseUrl(env)
  return base ? new URL("/api/v1/analyze/domain", base) : null
}
