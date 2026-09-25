import { attachSession, auditLog, clearTwoFactorChallenge, createSession, decryptSecret, getTwoFactorChallenge, hashToken, isAuthRole, verifyTotp, type AppUser } from "@/lib/auth"
import { withTransaction } from "@/lib/db"
import { consumeRecoveryCode } from "@/lib/recovery-codes"
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
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0" }
const errorResponse = () => NextResponse.json({ error: GENERIC_ERROR }, { status: 401, headers: PRIVATE_HEADERS })

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const challengeToken = await getTwoFactorChallenge()
    const body = await request.json().catch(() => null)
    const code = body && typeof body.code === "string" ? body.code.trim() : ""
    const method = body?.method === "recovery" ? "recovery" : "totp"

    if (!challengeToken || !/^[A-Za-z0-9_-]{40,128}$/.test(challengeToken)) {
      return clearTwoFactorChallenge(errorResponse())
    }

    const result = await withTransaction(async (client) => {
      const challengeResult = await client.query<ChallengeRow>(
        `SELECT c.id AS challenge_id, c.user_id AS challenge_user_id, c.expires_at,
           c.consumed_at, c.attempts, c.max_attempts, u.id, u.username, u.email,
           u.role, u.email_verified_at, u.totp_enabled, u.totp_secret_encrypted
         FROM pending_two_factor_challenges c
         JOIN app_users u ON u.id = c.user_id
         WHERE c.token_hash = $1
         LIMIT 1
         FOR UPDATE`,
        [hashToken(challengeToken)],
      )
      const row = challengeResult.rows[0]
      const challengeState = {
        exists: Boolean(row),
        userMatches: Boolean(row && row.id === row.challenge_user_id),
        expiresAt: row ? new Date(row.expires_at) : null,
        consumedAt: row?.consumed_at ? new Date(row.consumed_at) : null,
        attempts: row?.attempts ?? 0,
        maxAttempts: row?.max_attempts ?? 5,
      }
      const challengeEligible = assessPendingTwoFactorChallenge(challengeState, true).accepted
      let codeValid = false

      if (method === "totp" && challengeEligible && row?.totp_enabled && row.totp_secret_encrypted && /^\d{6}$/.test(code)) {
        try { codeValid = verifyTotp(decryptSecret(row.totp_secret_encrypted), code) } catch { codeValid = false }
      } else if (method === "recovery" && challengeEligible && row?.totp_enabled) {
        codeValid = await consumeRecoveryCode(client, row.id, code)
      }

      const decision = assessPendingTwoFactorChallenge(challengeState, codeValid)
      if (row && decision.incrementAttempts) {
        await client.query(
          `UPDATE pending_two_factor_challenges
           SET attempts = attempts + 1,
               consumed_at = CASE WHEN attempts + 1 >= max_attempts THEN now() ELSE consumed_at END
           WHERE id = $1`,
          [row.challenge_id],
        )
      } else if (row && decision.consume) {
        await client.query(
          "UPDATE pending_two_factor_challenges SET consumed_at = COALESCE(consumed_at, now()) WHERE id = $1",
          [row.challenge_id],
        )
      }

      if (!decision.accepted || !row || !isAuthRole(row.role)) {
        return { user: null, method, userId: row?.id || null }
      }
      return {
        user: {
          id: row.id,
          username: row.username,
          email: row.email,
          role: row.role,
          email_verified_at: row.email_verified_at,
          totp_enabled: row.totp_enabled,
        } satisfies AppUser,
        method,
        userId: row.id,
      }
    })

    if (!result.user) {
      if (result.method === "recovery" && result.userId) {
        await auditLog(result.userId, "two_factor_recovery_code_failed", request)
      }
      return errorResponse()
    }

    const sessionToken = await createSession(result.user, request)
    await auditLog(
      result.user.id,
      result.method === "recovery" ? "two_factor_recovery_code_used" : "two_factor_login_verified",
      request,
    )
    const response = attachSession(
      NextResponse.json({
        message: "Login successful",
        user: { id: result.user.id, username: result.user.username, email: result.user.email, role: result.user.role },
      }, { headers: PRIVATE_HEADERS }),
      sessionToken,
    )
    return clearTwoFactorChallenge(response)
  } catch {
    return clearTwoFactorChallenge(errorResponse())
  }
}
