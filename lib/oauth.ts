import crypto from "crypto"
import { NextResponse, type NextRequest } from "next/server.js"

export type OAuthProvider = "google" | "github"

const STATE_COOKIE_PREFIX = "shadownode_oauth_state"
const OAUTH_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
  Expires: "0",
}

function origin(value: string | undefined) {
  if (!value) return null

  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.origin
      : null
  } catch {
    return null
  }
}

export function getOAuthBaseUrl(request: NextRequest) {
  const candidates = [
    process.env.NETLIFY === "true" ? process.env.URL : undefined,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.URL,
    request.nextUrl.origin,
  ]

  for (const value of candidates) {
    const valueOrigin = origin(value)
    if (valueOrigin) return valueOrigin
  }

  throw new Error("OAuth application URL is not configured")
}

export function getOAuthCallbackUrl(
  request: NextRequest,
  provider: OAuthProvider,
) {
  return `${getOAuthBaseUrl(request)}/api/auth/oauth/${provider}/callback`
}

export function getOAuthStateCookieName(provider: OAuthProvider) {
  return `${STATE_COOKIE_PREFIX}_${provider}`
}

export function getOAuthStateCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    secure: getOAuthBaseUrl(request).startsWith("https://"),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  }
}

export function createOAuthInitiationResponse(
  request: NextRequest,
  provider: OAuthProvider,
  authorizationUrl: URL,
  state: string,
) {
  const response = new NextResponse(null, {
    status: 302,
    headers: {
      ...OAUTH_CACHE_HEADERS,
      Location: authorizationUrl.toString(),
    },
  })

  const cookieName = getOAuthStateCookieName(provider)
  response.cookies.set(cookieName, state, getOAuthStateCookieOptions(request))

  const setCookie = response.headers.get("set-cookie")
  if (!setCookie || !setCookie.includes(cookieName + "=")) {
    throw new Error("OAuth state cookie was not attached to the initiation response")
  }

  return response
}

export function clearOAuthStateCookie(
  response: NextResponse,
  request: NextRequest,
  provider: OAuthProvider,
) {
  response.cookies.set(getOAuthStateCookieName(provider), "", {
    ...getOAuthStateCookieOptions(request),
    maxAge: 0,
    expires: new Date(0),
  })
  return response
}

export function safeOAuthErrorCode(value: string | null) {
  return value && /^[a-z][a-z0-9_]{0,63}$/i.test(value) ? value : null
}

function statesMatch(returnedState: string | null, stateCookie: string | undefined) {
  if (!returnedState || !stateCookie) return false

  const returned = Buffer.from(returnedState)
  const stored = Buffer.from(stateCookie)

  return returned.length === stored.length && crypto.timingSafeEqual(returned, stored)
}

export type OAuthCallbackVerification = {
  valid: boolean
  failure: "missing_code" | "missing_state" | "missing_cookie" | "state_mismatch" | "missing_client_id" | "missing_client_secret" | null
  hasCode: boolean
  hasReturnedState: boolean
  hasStateCookie: boolean
  stateMatches: boolean
  hasClientId: boolean
  hasClientSecret: boolean
}

export function verifyOAuthCallback(input: {
  code: string | null
  returnedState: string | null
  stateCookie: string | undefined
  clientId: string | undefined
  clientSecret: string | undefined
}): OAuthCallbackVerification {
  const hasCode = Boolean(input.code)
  const hasReturnedState = Boolean(input.returnedState)
  const hasStateCookie = Boolean(input.stateCookie)
  const stateMatches = statesMatch(input.returnedState, input.stateCookie)
  const hasClientId = Boolean(input.clientId)
  const hasClientSecret = Boolean(input.clientSecret)

  const failure = !hasCode
    ? "missing_code"
    : !hasReturnedState
      ? "missing_state"
      : !hasStateCookie
        ? "missing_cookie"
        : !stateMatches
          ? "state_mismatch"
          : !hasClientId
            ? "missing_client_id"
            : !hasClientSecret
              ? "missing_client_secret"
              : null

  return {
    valid: failure === null,
    failure,
    hasCode,
    hasReturnedState,
    hasStateCookie,
    stateMatches,
    hasClientId,
    hasClientSecret,
  }
}

function noStore<T extends NextResponse>(response: T) {
  for (const [name, value] of Object.entries(OAUTH_CACHE_HEADERS)) {
    response.headers.set(name, value)
  }
  return response
}

export function oauthJson(body: unknown, init?: ResponseInit) {
  return noStore(NextResponse.json(body, init))
}

export function oauthRedirect(
  url: string | URL,
  init?: Parameters<typeof NextResponse.redirect>[1],
) {
  return noStore(NextResponse.redirect(url, init))
}
