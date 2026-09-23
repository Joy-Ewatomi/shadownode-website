import {
  attachSession,
  auditLog,
  clearTwoFactorChallenge,
  createSession,
  decryptSecret,
  getTwoFactorChallenge,
  hashToken,
  isAuthRole,
  verifyTotp,
  type AppUser,
} from "@/lib/auth"
import { withTransaction } from "@/lib/db"
import { assessPendingTwoFactorChallenge } from "@/lib/two-factor-challenge"
import { NextRequest, NextResponse } from "next/server"

type ChallengeRow = AppUser & {
  challenge_id: string
  challenge_user_id: string
  expires_at: string
  consumed_at: string | null
  attempts: number
  max_attempts: number
  totp_secret_encrypted: string | null
}

const GENERIC_ERROR = "Invalid or expired authentication challenge"

export async function POST(request: NextRequest) {
  try {
    const challengeToken = await getTwoFactorChallenge()
    const body = await request.json().catch(() => null)
    const code =
      body && typeof body.code === "string"
        ? body.code.trim()
        : ""

    if (
      !challengeToken ||
      !/^[A-Za-z0-9_-]{40,128}$/.test(challengeToken)
    ) {
      return clearTwoFactorChallenge(
        NextResponse.json({ error: GENERIC_ERROR }, { status: 401 }),
      )
    }

    const result = await withTransaction(async (client) => {
      const challengeResult = await client.query<ChallengeRow>(
        `
          SELECT
            c.id AS challenge_id,
            c.user_id AS challenge_user_id,
            c.expires_at,
            c.consumed_at,
            c.attempts,
            c.max_attempts,
            u.id,
            u.username,
            u.email,
            u.role,
            u.email_verified_at,
            u.totp_enabled,
            u.totp_secret_encrypted
          FROM pending_two_factor_challenges c
          JOIN app_users u ON u.id = c.user_id
          WHERE c.token_hash = $1
          LIMIT 1
          FOR UPDATE
        `,
        [hashToken(challengeToken)],
      )

      const row = challengeResult.rows[0]
      let codeValid = false

      if (
        row?.totp_enabled &&
        row.totp_secret_encrypted &&
        /^\d{6}$/.test(code)
      ) {
        try {
          codeValid = verifyTotp(
            decryptSecret(row.totp_secret_encrypted),
            code,
          )
        } catch {
          codeValid = false
        }
      }

      const decision = assessPendingTwoFactorChallenge(
        {
          exists: Boolean(row),
          userMatches: Boolean(row && row.id === row.challenge_user_id),
          expiresAt: row ? new Date(row.expires_at) : null,
          consumedAt: row?.consumed_at ? new Date(row.consumed_at) : null,
          attempts: row?.attempts ?? 0,
          maxAttempts: row?.max_attempts ?? 5,
        },
        codeValid,
      )

      if (row && decision.incrementAttempts) {
        await client.query(
          `
            UPDATE pending_two_factor_challenges
            SET
              attempts = attempts + 1,
              consumed_at = CASE
                WHEN attempts + 1 >= max_attempts THEN now()
                ELSE consumed_at
              END
            WHERE id = $1
          `,
          [row.challenge_id],
        )
      } else if (row && decision.consume) {
        await client.query(
          `
            UPDATE pending_two_factor_challenges
            SET consumed_at = COALESCE(consumed_at, now())
            WHERE id = $1
          `,
          [row.challenge_id],
        )
      }

      if (!decision.accepted || !row || !isAuthRole(row.role)) {
        return null
      }

      return {
        id: row.id,
        username: row.username,
        email: row.email,
        role: row.role,
        email_verified_at: row.email_verified_at,
        totp_enabled: row.totp_enabled,
      } satisfies AppUser
    })

    if (!result) {
      return NextResponse.json(
        { error: GENERIC_ERROR },
        { status: 401 },
      )
    }

    const sessionToken = await createSession(result, request)
    await auditLog(result.id, "two_factor_login_verified", request)

    const response = attachSession(
      NextResponse.json({
        message: "Login successful",
        user: {
          id: result.id,
          username: result.username,
          email: result.email,
          role: result.role,
        },
      }),
      sessionToken,
    )

    return clearTwoFactorChallenge(response)
  } catch (error) {
    console.error(
      "2FA VERIFICATION ERROR:",
      error instanceof Error ? error.message : "Unknown error",
    )
    return clearTwoFactorChallenge(
      NextResponse.json({ error: GENERIC_ERROR }, { status: 401 }),
    )
  }
}
