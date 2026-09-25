import crypto from "crypto"

import {
  attachSession,
  attachTwoFactorChallenge,
  createSession,
  hashPassword,
} from "@/lib/auth"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { deliverWelcomeEmail, registerWelcomeEmailEligibility } from "@/lib/welcome-email"
import { clearOAuthStateCookie, getOAuthBaseUrl, getOAuthCallbackUrl, getOAuthStateCookieName, oauthJson, oauthRedirect, safeOAuthErrorCode, verifyOAuthCallback, type OAuthProvider as Provider } from "@/lib/oauth"

import {
  NextRequest,
  NextResponse,
} from "next/server"

type OAuthUser = {
  id: string
  username: string
  email: string
  role:
    | "client"
    | "staff"
    | "investigator"
    | "analyst"
    | "administrator"
    | "super_administrator"
  email_verified_at: string | null
  totp_enabled: boolean
}

const config: Record<
  Provider,
  {
    token: string
    user: string
  }
> = {
  google: {
    token:
      "https://oauth2.googleapis.com/token",
    user:
      "https://openidconnect.googleapis.com/v1/userinfo",
  },

  github: {
    token:
      "https://github.com/login/oauth/access_token",
    user:
      "https://api.github.com/user",
  },
}

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
export const revalidate = 0

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
  let callbackProvider: Provider | null = null
  const callbackJson = (body: unknown, init?: ResponseInit) => {
    const response = oauthJson(body, init)
    return callbackProvider
      ? clearOAuthStateCookie(response, request, callbackProvider)
      : response
  }

  try {
    const {
      provider: rawProvider,
    } = await params

    // --------------------------------
    // PROVIDER VALIDATION
    // --------------------------------

    if (
      !Object.prototype.hasOwnProperty.call(
        config,
        rawProvider
      )
    ) {
      return callbackJson(
        {
          error: "Unsupported OAuth provider",
        },
        {
          status: 404,
        }
      )
    }

    const provider =
      rawProvider as Provider
    callbackProvider = provider

    // --------------------------------
    // OAUTH PARAMETERS
    // --------------------------------

    const code =
      request.nextUrl.searchParams.get(
        "code"
      )

    const state =
      request.nextUrl.searchParams.get(
        "state"
      )

    const stateCookieName = getOAuthStateCookieName(provider)
    const stateCookie = request.cookies.get(stateCookieName)?.value

    const clientId =
      process.env[
        `OAUTH_${provider.toUpperCase()}_CLIENT_ID`
      ]

    const clientSecret =
      process.env[
        `OAUTH_${provider.toUpperCase()}_CLIENT_SECRET`
      ]

    const providerErrorCode = safeOAuthErrorCode(
      request.nextUrl.searchParams.get("error")
    )
    const verification = verifyOAuthCallback({
      code,
      returnedState: state,
      stateCookie,
      clientId,
      clientSecret,
    })

    if (!verification.valid || providerErrorCode) {
      console.warn("OAuth callback verification", {
        provider,
        requestHostname: request.nextUrl.hostname,
        providerErrorCode,
        hasCode: verification.hasCode,
        hasReturnedState: verification.hasReturnedState,
        hasStateCookie: verification.hasStateCookie,
        stateMatches: verification.stateMatches,
        hasClientId: verification.hasClientId,
        hasClientSecret: verification.hasClientSecret,
      })
    }

    const loginError = providerErrorCode && verification.stateMatches
      ? providerErrorCode === "access_denied"
        ? "provider_access_denied"
        : "provider_error"
      : verification.failure

    if (loginError) {
      const loginUrl = new URL("/login", getOAuthBaseUrl(request))
      loginUrl.searchParams.set("oauthError", loginError)
      const response = oauthRedirect(loginUrl)
      return clearOAuthStateCookie(response, request, provider)
    }

    if (!code || !clientId || !clientSecret) {
      throw new Error("OAuth callback verification invariant failed")
    }

    // --------------------------------
    // REDIRECT URI
    // --------------------------------

    const redirectUri = getOAuthCallbackUrl(request, provider)

    // --------------------------------
    // EXCHANGE CODE FOR ACCESS TOKEN
    // --------------------------------

    const tokenResponse =
      await fetch(
        config[provider].token,
        {
          method: "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body:
            new URLSearchParams({
              code,

              client_id:
                clientId,

              client_secret:
                clientSecret,

              redirect_uri:
                redirectUri,

              grant_type:
                "authorization_code",
            }),
        }
      )

    if (!tokenResponse.ok) {
      console.error(
        "OAuth token exchange failed:",
        tokenResponse.status
      )

      return callbackJson(
        {
          error:
            "OAuth token exchange failed",
        },
        {
          status: 401,
        }
      )
    }

    const tokenData =
      await tokenResponse.json()

    // IMPORTANT:
    // This is the PROVIDER access token.
    // It is NOT the ShadowNode session token.

    const accessToken =
      tokenData.access_token as
        | string
        | undefined

    if (!accessToken) {
      return callbackJson(
        {
          error:
            "OAuth token exchange failed",
        },
        {
          status: 401,
        }
      )
    }

    // --------------------------------
    // GET PROVIDER PROFILE
    // --------------------------------

    const profileResponse =
      await fetch(
        config[provider].user,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            Accept:
              "application/json",

            "User-Agent":
              "ShadowNode",
          },
        }
      )

    if (!profileResponse.ok) {
      console.error(
        "OAuth profile request failed:",
        profileResponse.status
      )

      return callbackJson(
        {
          error:
            "Unable to retrieve OAuth profile",
        },
        {
          status: 401,
        }
      )
    }

    const profile =
      await profileResponse.json()

    // --------------------------------
    // PROVIDER ACCOUNT ID
    // --------------------------------

    const providerId =
      String(
        profile.sub ??
          profile.id ??
          ""
      )

    // --------------------------------
    // EMAIL
    // --------------------------------

    let email =
      String(
        profile.email ?? ""
      )
        .trim()
        .toLowerCase()

    // --------------------------------
    // GITHUB EMAIL FALLBACK
    // --------------------------------

    if (
      provider === "github" &&
      !email
    ) {
      const emailResponse =
        await fetch(
          "https://api.github.com/user/emails",
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,

              "User-Agent":
                "ShadowNode",

              Accept:
                "application/json",
            },
          }
        )

      if (emailResponse.ok) {
        const emails =
          await emailResponse.json()

        email =
          emails.find(
            (
              item: {
                primary?: boolean
                verified?: boolean
                email?: string
              }
            ) =>
              item.primary &&
              item.verified &&
              item.email
          )?.email
            ?.trim()
            .toLowerCase() ?? ""
      }
    }

    // --------------------------------
    // VALIDATE PROVIDER DATA
    // --------------------------------

    if (
      !providerId ||
      !email
    ) {
      return callbackJson(
        {
          error:
            "The OAuth provider did not supply a verified email address",
        },
        {
          status: 400,
        }
      )
    }

    // --------------------------------
    // FIND LINKED ACCOUNT
    // --------------------------------

    const {
      data: linked,
      error: linkedError,
    } =
      await supabaseAdmin
        .from("oauth_accounts")
        .select(
          `
          app_users(
            id,
            username,
            email,
            role,
            email_verified_at,
            totp_enabled
          )
          `
        )
        .eq(
          "provider",
          provider
        )
        .eq(
          "provider_account_id",
          providerId
        )
        .maybeSingle()

    if (linkedError) {
      console.error(
        "OAuth linked-account lookup error:",
        linkedError
      )
    }


    let user =
      linked?.app_users as
        | unknown as
        | OAuthUser
        | null

    // --------------------------------
    // FIND USER BY EMAIL
    // --------------------------------

    if (!user) {
      const {
        data: existing,
        error: existingError,
      } =
        await supabaseAdmin
          .from("app_users")
          .select(
            `
            id,
            username,
            email,
            role,
            email_verified_at,
            totp_enabled
            `
          )
          .eq(
            "email",
            email
          )
          .maybeSingle()

      if (existingError) {
        console.error(
          "OAuth existing-user lookup error:",
          existingError
        )
      }

      user =
        existing as
          | OAuthUser
          | null
    }

    // --------------------------------
    // CREATE NEW USER
    // --------------------------------

    if (!user) {
      const baseUsername =
        String(
          profile.login ??
            profile.name ??
            email.split("@")[0]
        )
          .replace(
            /[^a-zA-Z0-9_-]/g,
            ""
          )
          .slice(0, 21) ||
        "user"

      const username =
        `${baseUsername}-${crypto
          .randomUUID()
          .slice(0, 8)}`

      const {
        data: created,
        error: createError,
      } =
        await supabaseAdmin
          .from("app_users")
          .insert({
            username,

            email,
            role: "client",

            password_login_enabled: false,

            password_hash:
              await hashPassword(
                crypto
                  .randomBytes(32)
                  .toString(
                    "base64url"
                  )
              ),

            email_verified_at:
              new Date().toISOString(),
          })
          .select(
            `
            id,
            username,
            email,
            role,
            email_verified_at,
            totp_enabled
            `
          )
          .single()

      if (
        createError ||
        !created
      ) {
        console.error(
          "OAuth user creation error:",
          createError
        )

        return callbackJson(
          {
            error:
              "Could not create OAuth account",
          },
          {
            status: 500,
          }
        )
      }

      user =
        created as OAuthUser
      await registerWelcomeEmailEligibility(user.id)
    }

    // --------------------------------
    // LINK OAUTH ACCOUNT
    // --------------------------------

    const {
      error: linkError,
    } =
      await supabaseAdmin
        .from("oauth_accounts")
        .upsert(
          {
            user_id:
              user.id,

            provider,

            provider_account_id:
              providerId,

            email,
          },
          {
            onConflict:
              "provider,provider_account_id",
          }
        )

    if (linkError) {
      console.error(
        "OAuth account linking error:",
        linkError
      )

      return callbackJson(
        {
          error:
            "Could not link OAuth account",
        },
        {
          status: 500,
        }
      )
    }

    await deliverWelcomeEmail({
      userId: user.id,
      email: user.email,
      recipientName: typeof profile.name === "string" ? profile.name : null,
      registerEligibility: false,
    })

    // --------------------------------
    // TWO FACTOR AUTHENTICATION
    // --------------------------------

    if (
      user.totp_enabled
    ) {
      const response =
        oauthRedirect(
          new URL(
            "/login?twoFactorRequired=1",
            getOAuthBaseUrl(request)
          )
        )

      await attachTwoFactorChallenge(
        response,
        user.id,
        request,
        provider,
      )

      return clearOAuthStateCookie(response, request, provider)
    }

    // --------------------------------
    // CREATE SHADOWNODE SESSION
    // --------------------------------

    const sessionToken =
      await createSession(
        user,
        request
      )

    const response =
      oauthRedirect(
        new URL(
          "/dashboard",
          request.url
        )
      )

    attachSession(
      response,
      sessionToken
    )

    return clearOAuthStateCookie(response, request, provider)

  } catch (error) {
    console.error(
      "OAUTH CALLBACK ERROR:",
      error
    )

    return callbackJson(
      {
        error:
          "OAuth authentication failed",
      },
      {
        status: 500,
      }
    )
  }
}
