import {
  attachSession,
  clearSession,
  clearTwoFactorChallenge,
  createSession,
  decryptSecret,
  getTwoFactorChallenge,
  verifyTotp,
} from "@/lib/auth"
import { query } from "@/lib/db"
import {
  NextRequest,
  NextResponse,
} from "next/server"

type TwoFactorUser = {
  id: string
  username: string
  email: string
  role:
    | "client"
    | "investigator"
    | "analyst"
    | "administrator"
    | "administrator"
    | "super_administrator"
  email_verified_at: string | null
  totp_enabled: boolean
  totp_secret_encrypted: string | null
}

export async function POST(
  request: NextRequest
) {
  try {
    const challenge =
      await getTwoFactorChallenge()

    const body = await request.json()

    const code =
      typeof body.code === "string"
        ? body.code.trim()
        : ""

    if (!challenge || !code) {
      return clearSession(
        NextResponse.json(
          {
            error:
              "Your sign-in challenge expired",
          },
          {
            status: 401,
          }
        )
      )
    }

    const { rows } =
      await query<TwoFactorUser>(
        `
        SELECT
          id,
          username,
          email,
          role,
          email_verified_at,
          totp_enabled,
          totp_secret_encrypted
        FROM app_users
        WHERE id = $1
        LIMIT 1
        `,
        [challenge.userId]
      )

    const user = rows[0]

    if (
      !user ||
      !user.totp_enabled ||
      !user.totp_secret_encrypted
    ) {
      return NextResponse.json(
        {
          error:
            "Two-factor authentication is not configured",
        },
        {
          status: 401,
        }
      )
    }

    let secret: string

    try {
      secret = decryptSecret(
        user.totp_secret_encrypted
      )
    } catch (error) {
      console.error(
        "TOTP DECRYPTION ERROR:",
        error
      )

      return NextResponse.json(
        {
          error:
            "Unable to verify authentication code",
        },
        {
          status: 500,
        }
      )
    }

    const valid = verifyTotp(
      secret,
      code
    )

    if (!valid) {
      return NextResponse.json(
        {
          error:
            "Invalid authentication code",
        },
        {
          status: 401,
        }
      )
    }

    const token = await createSession(
      user,
      request
    )

    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })

    attachSession(
      response,
      token
    )

    return clearTwoFactorChallenge(
      response
    )
  } catch (error) {
    console.error(
      "2FA LOGIN ERROR:",
      error
    )

    return NextResponse.json(
      {
        error: "Server error",
      },
      {
        status: 500,
      }
    )
  }
}