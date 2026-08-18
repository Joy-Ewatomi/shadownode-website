import {
  attachSession,
  attachTwoFactorChallenge,
  createSession,
  getIp,
  verifyPassword,
} from "@/lib/auth"
import { query } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

type LoginUser = {
  id: string
  username: string
  email: string
  password_hash: string
  role:
    | "client"
    | "investigator"
    | "analyst"
    | "administrator"
    | "administrator"
    | "super_administrator"
  email_verified_at: string | null
  totp_enabled: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : ""

    const password =
      typeof body.password === "string"
        ? body.password
        : ""

    const identifier = username.toLowerCase()

    if (!identifier || !password) {
      return NextResponse.json(
        {
          error:
            "Email or username and password are required",
        },
        {
          status: 400,
        }
      )
    }

    const lookup = identifier.includes("@")
      ? "email"
      : "username"

    const { rows } = await query<LoginUser>(
      `
      SELECT
        id,
        username,
        email,
        password_hash,
        role,
        email_verified_at,
        totp_enabled
      FROM app_users
      WHERE ${lookup} = $1
      LIMIT 1
      `,
      [identifier]
    )

    const user = rows[0]

    const valid = user
      ? await verifyPassword(
          password,
          user.password_hash
        )
      : false

    await query(
      `
      INSERT INTO login_history
      (
        user_id,
        identifier,
        ip,
        user_agent,
        success,
        failure_reason
      )
      VALUES
      ($1, $2, $3, $4, $5, $6)
      `,
      [
        user?.id ?? null,
        identifier,
        getIp(request),
        request.headers.get("user-agent"),
        valid,
        valid
          ? null
          : "invalid_credentials",
      ]
    )

    if (!user || !valid) {
      return NextResponse.json(
        {
          error: "Invalid credentials",
        },
        {
          status: 401,
        }
      )
    }

    if (!user.email_verified_at) {
      return NextResponse.json(
        {
          error:
            "Verify your email before signing in",
        },
        {
          status: 403,
        }
      )
    }

    if (user.totp_enabled) {
      const response = NextResponse.json({
        requiresTwoFactor: true,
      })

      return attachTwoFactorChallenge(
        response,
        user.id
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

    return attachSession(
      response,
      token
    )
  } catch (error) {
    console.error(
      "LOGIN ERROR:",
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