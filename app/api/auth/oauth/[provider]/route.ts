import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getOAuthCallbackUrl, getOAuthStateCookieName, getOAuthStateCookieOptions, type OAuthProvider } from "@/lib/oauth"

const providers = {
  google: {
    authorize:
      "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "openid email profile",
  },

  github: {
    authorize:
      "https://github.com/login/oauth/authorize",
    scope: "read:user user:email",
  },
} as const

const oauthClientKey = `client_${"id"}`

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      provider: string
    }>
  }
) {
  try {
    const { provider } = await params

    // --------------------------------
    // PROVIDER VALIDATION
    // --------------------------------

    if (
      !Object.prototype.hasOwnProperty.call(
        providers,
        provider
      )
    ) {
      return NextResponse.json(
        {
          error: "Unsupported OAuth provider",
        },
        {
          status: 404,
        }
      )
    }

    const name = provider as OAuthProvider

    // --------------------------------
    // CLIENT CONFIGURATION
    // --------------------------------

    const clientId =
      process.env[
        `OAUTH_${provider.toUpperCase()}_CLIENT_ID`
      ]

    if (!clientId) {
      return NextResponse.json(
        {
          error:
            "OAuth provider is not configured",
        },
        {
          status: 503,
        }
      )
    }

    // --------------------------------
    // OAUTH STATE
    // --------------------------------

    const state =
      crypto
        .randomBytes(24)
        .toString("base64url")

    // --------------------------------
    // REDIRECT URI
    // --------------------------------

    const redirectUri = getOAuthCallbackUrl(request, name)

    // --------------------------------
    // AUTHORIZATION URL
    // --------------------------------

    const url = new URL(
      providers[name].authorize
    )

    url.searchParams.set(
      oauthClientKey,
      clientId
    )

    url.searchParams.set(
      "redirect_uri",
      redirectUri
    )

    url.searchParams.set(
      "response_type",
      "code"
    )

    url.searchParams.set(
      "scope",
      providers[name].scope
    )

    url.searchParams.set(
      "state",
      state
    )

    // --------------------------------
    // STATE COOKIE
    // --------------------------------

    const response =
      NextResponse.redirect(url)

    response.cookies.set(
      getOAuthStateCookieName(name),
      state,
      getOAuthStateCookieOptions(request)
    )

    return response
  } catch (error) {
    console.error(
      "OAUTH INITIATION ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "OAuth authentication could not be started",
      },
      {
        status: 500,
      }
    )
  }
}