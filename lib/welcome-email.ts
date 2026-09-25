import { query } from "@/lib/db"
import { sendWelcomeEmail } from "@/lib/email"

export async function registerWelcomeEmailEligibility(userId: string) {
  try {
    await query(
      `INSERT INTO welcome_email_deliveries (user_id, status) VALUES ($1, 'pending') ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    )
    return true
  } catch {
    return false
  }
}

export async function deliverWelcomeEmail(input: {
  userId: string
  email: string
  recipientName?: string | null
  registerEligibility: boolean
}) {
  try {
    if (input.registerEligibility && !await registerWelcomeEmailEligibility(input.userId)) return false

    const claimed = await query<{ user_id: string }>(
      `UPDATE welcome_email_deliveries
       SET status = 'sending', attempt_count = attempt_count + 1,
           last_attempt_at = now(), updated_at = now(), error_code = NULL
       WHERE user_id = $1
         AND (
           status IN ('pending', 'failed')
           OR (status = 'sending' AND last_attempt_at < now() - interval '10 minutes')
         )
       RETURNING user_id`,
      [input.userId],
    )
    if (!claimed.rows[0]) return false

    try {
      const sent = await sendWelcomeEmail(input.email, input.recipientName)
      if (!sent) throw new Error("delivery_unavailable")
      await query(
        `UPDATE welcome_email_deliveries
         SET status = 'sent', sent_at = now(), updated_at = now(), error_code = NULL
         WHERE user_id = $1 AND status = 'sending'`,
        [input.userId],
      )
      return true
    } catch {
      await query(
        `UPDATE welcome_email_deliveries
         SET status = 'failed', updated_at = now(), error_code = 'delivery_failed'
         WHERE user_id = $1 AND status = 'sending'`,
        [input.userId],
      ).catch(() => undefined)
      return false
    }
  } catch {
    return false
  }
}
