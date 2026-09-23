import type { NextRequest } from "next/server"
export type OAuthProvider = "google" | "github"
const STATE_COOKIE_PREFIX = "shadownode_oauth_state"
function origin(value: string | undefined) { if (!value) return null; try { const u = new URL(value.trim()); return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null } catch { return null } }
export function getOAuthBaseUrl(request: NextRequest) {
  for (const value of [process.env.NETLIFY === "true" ? process.env.URL : undefined, process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL, process.env.URL, request.nextUrl.origin]) { const valueOrigin = origin(value); if (valueOrigin) return valueOrigin }
  throw new Error("OAuth application URL is not configured")
}
export function getOAuthCallbackUrl(request: NextRequest, provider: OAuthProvider) { return `${getOAuthBaseUrl(request)}/api/auth/oauth/${provider}/callback` }
export function getOAuthStateCookieName(provider: OAuthProvider) { return `${STATE_COOKIE_PREFIX}_${provider}` }
export function getOAuthStateCookieOptions(request: NextRequest) { return { httpOnly: true, secure: getOAuthBaseUrl(request).startsWith("https://"), sameSite: "lax" as const, path: "/", maxAge: 600 } }
