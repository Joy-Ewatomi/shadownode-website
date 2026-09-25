import { query, withTransaction } from "@/lib/db"
import { transitionCaseStatus } from "@/lib/services/case-status-service"
import { notifySuperAdmins, notifyUser } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"
import { moneyToMinorUnits } from "@/lib/payments/flutterwave"

export async function recordPaymentFailure(
  paymentId: string,
  requestId: string | null,
  category: string,
) {
  const changed = await query<{ id: string }>(
    `UPDATE payments SET status = 'failed', failure_reason_category = $2
     WHERE id = $1 AND status <> 'paid'
       AND failure_reason_category IS DISTINCT FROM $2 RETURNING id`,
    [paymentId, category],
  )

  if (changed.rows[0]) {
    await notifySuperAdmins({
      type: "payment_review_required",
      title: "Payment requires review",
      message: "A payment attempt requires verification review.",
      metadata: {
        payment_id: paymentId,
        request_id: requestId,
        resource_type: "request",
        resource_id: requestId,
        audience: "super_administrator",
      },
    }).catch(() => undefined)
  }
}

export async function completeVerifiedPayment(input: {
  paymentId: string
  provider: "flutterwave"
  providerTransactionId: string
  paidAt: string | null
}) {
  const completed = await withTransaction(async (client) => {
    const locked = await client.query<{
      id: string
      request_id: string
      case_id: string | null
      training_engagement_id: string | null
      status: string
      quote_version_id: string
      accepted_quote_version_id: string
      amount: string
      currency: string
      quote_price: string
      quote_currency: string
      user_id: string
    }>(
      `SELECT p.id, p.request_id, p.case_id, p.training_engagement_id,
              p.status, p.quote_version_id, p.amount, p.currency,
              q.price AS quote_price, q.currency AS quote_currency,
              r.accepted_quote_version_id, r.user_id
       FROM payments p
       JOIN requests r ON r.id = p.request_id
       JOIN quote_versions q ON q.id = p.quote_version_id AND q.request_id = r.id
       WHERE p.id = $1 AND p.provider = $2
       FOR UPDATE OF p, r, q`,
      [input.paymentId, input.provider],
    )

    const payment = locked.rows[0]
    if (!payment) throw new Error("Payment attempt was not found")
    if (payment.status === "paid") return { ...payment, newlyCompleted: false }

    if (
      payment.quote_version_id !== payment.accepted_quote_version_id ||
      moneyToMinorUnits(payment.amount, payment.currency) !==
        moneyToMinorUnits(payment.quote_price, payment.quote_currency) ||
      payment.currency.toUpperCase() !== payment.quote_currency.toUpperCase()
    ) {
      throw new Error("Payment quote linkage changed during verification")
    }

    const winner = await client.query<{ id: string }>(
      `SELECT id FROM payments
       WHERE quote_version_id = $1 AND status = 'paid' AND id <> $2 LIMIT 1`,
      [payment.quote_version_id, payment.id],
    )

    if (winner.rows[0]) {
      await client.query(
        `UPDATE payments SET status = 'cancelled', failure_reason_category = 'superseded'
         WHERE id = $1`,
        [payment.id],
      )
      return { ...payment, status: "cancelled", newlyCompleted: false }
    }

    await client.query(
      `UPDATE payments SET status = 'paid', provider_transaction_id = $2,
         verified_at = NOW(), paid_at = COALESCE($3::timestamptz, NOW()),
         failure_reason_category = NULL WHERE id = $1`,
      [payment.id, input.providerTransactionId, input.paidAt],
    )
    await client.query(
      `UPDATE payments SET status = 'cancelled',
         failure_reason_category = COALESCE(failure_reason_category, 'superseded')
       WHERE quote_version_id = $1 AND id <> $2
         AND status IN ('pending', 'failed', 'unpaid', 'awaiting_payment')`,
      [payment.quote_version_id, payment.id],
    )
    await client.query(
      `UPDATE quote_versions SET status = 'paid'
       WHERE id = $1 AND status IN ('accepted', 'paid')`,
      [payment.quote_version_id],
    )

    if (payment.case_id) {
      await client.query(
        `UPDATE cases SET payment_status = 'paid', updated_at = NOW() WHERE id = $1`,
        [payment.case_id],
      )
      await transitionCaseStatus({
        caseId: payment.case_id,
        to: "awaiting_assignment",
        actor: "system",
        reason: "Verified online payment confirmed.",
        sourceAction: "online_payment_verified",
        executor: client,
      })
      await client.query(
        `UPDATE requests SET status = 'awaiting_assignment', updated_at = NOW() WHERE id = $1`,
        [payment.request_id],
      )
    } else if (payment.training_engagement_id) {
      await client.query(
        `UPDATE training_engagements SET payment_status = 'paid', status = 'active',
           started_at = COALESCE(started_at, NOW()), updated_at = NOW() WHERE id = $1`,
        [payment.training_engagement_id],
      )
      await client.query(
        `UPDATE requests SET status = 'active', updated_at = NOW() WHERE id = $1`,
        [payment.request_id],
      )
    }

    await recordRequestAudit(
      payment.request_id,
      null,
      "payment_verified",
      {
        payment_id: payment.id,
        provider: input.provider,
        amount: payment.amount,
        currency: payment.currency,
      },
      client,
      { strict: true },
    )

    return { ...payment, status: "paid", newlyCompleted: true }
  })

  if (completed.newlyCompleted) {
    await notifyUser(completed.user_id, {
      type: "payment_confirmed",
      title: "Payment confirmed",
      message: `Your ${completed.currency} ${completed.amount} payment has been verified.`,
      metadata: {
        request_id: completed.request_id,
        payment_id: completed.id,
        resource_type: "request",
        resource_id: completed.request_id,
        target_page: "payment",
      },
    }).catch(() => undefined)
  }

  return {
    success: completed.status === "paid",
    already_processed: !completed.newlyCompleted,
    payment_id: completed.id,
    request_id: completed.request_id,
    case_id: completed.case_id || undefined,
    training_engagement_id: completed.training_engagement_id || undefined,
    status: completed.status,
  }
}
