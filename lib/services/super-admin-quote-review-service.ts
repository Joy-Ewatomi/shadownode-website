import { query } from "@/lib/db"
import { notifyUser } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"
import { createQuoteVersion } from "@/lib/services/quote-version-service"

export type SuperAdminQuoteReviewAction = "accept" | "adjust" | "reject"

export async function reviewQuoteAsSuperAdmin(input: {
  requestId: string
  actorUserId: string
  actorRole: string
  action: SuperAdminQuoteReviewAction
  amount?: number | null
  currency?: string | null
  notes?: string | null
  reason: string
  estimated_completion?: string | null
}) {
  if (!input.requestId) throw new Error("Request id is required")
  if (!input.actorUserId) throw new Error("Actor user id is required")
  if (input.actorRole !== "super_administrator") throw new Error("Only super administrators can review quotes")

  const reason = input.reason?.trim() || ""
  if (!reason) throw new Error("A reason is required for every decision")

  const current = await query<{
    id: string
    user_id: string | null
    title: string | null
    status: string | null
    approved_quote_amount: number | null
    approved_quote_currency: string | null
    approved_quote_notes: string | null
    approved_estimated_completion: string | null
  }>(
    `
      SELECT id, user_id, title, status, approved_quote_amount, approved_quote_currency, approved_quote_notes, approved_estimated_completion
      FROM requests
      WHERE id = $1
      FOR UPDATE
      LIMIT 1
    `,
    [input.requestId],
  )

  const request = current.rows[0]
  const adminQuoteResult = await query<{
  price: number
  currency: string
  estimated_completion: string | null
  notes: string | null
}>(
  `
  SELECT
    price,
    currency,
    estimated_completion,
    notes
  FROM quote_versions
  WHERE request_id = $1
    AND source = 'administrator'
  ORDER BY version_number DESC
  LIMIT 1
  `,
  [input.requestId]
)

const adminQuote = adminQuoteResult.rows[0]
  if (!request) throw new Error("Request not found")

  const allowedStatuses = new Set(["pending_super_admin_review", "admin_reviewed", "quote_sent", "revised_quote_sent"])
  if (!allowedStatuses.has(request.status || "")) {
    throw new Error("This request is not awaiting super administrator review")
  }

  if (input.action === "reject") {
    const updated = await query(
      `
        UPDATE requests
        SET
          status = 'rejected',
          super_admin_reviewed_by = $2,
          super_admin_reviewed_at = NOW(),
          super_admin_quote_action = 'rejected',
          super_admin_quote_notes = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [input.requestId, input.actorUserId, reason],
    )

    const row = updated.rows[0] as {
      id: string
      user_id?: string | null
      title?: string | null
    }

    await recordRequestAudit(input.requestId, input.actorUserId, "super_admin_reviewed_quote", {
      action: "reject",
      reason,
    })

    if (row?.user_id) {
      await notifyUser(row.user_id, {
        type: "quote_rejected",
        title: "Quote rejected",
        message: row.title ? `The quote for ${row.title} was rejected.` : "A quote was rejected.",
        metadata: { request_id: input.requestId, target_page: "client_quote_review", action: "view_request" },
      })
    }

    return row
  }

const amount = Number(input.amount ?? adminQuote?.price ?? request.approved_quote_amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("A valid quote amount is required")
  }

  const currency = String(
  input.currency ||
  adminQuote?.currency ||
  request.approved_quote_currency ||
  "NGN"
).trim().slice(0, 10)

  const notes = input.notes?.trim() || request.approved_quote_notes || null
 const estimated_completion =
  input.estimated_completion?.trim() ||
  adminQuote?.estimated_completion ||
  request.approved_estimated_completion ||
  null


  const updated = await query(
    `
      UPDATE requests
      SET
        status = $2,
        approved_quote_amount = $3::numeric,
        approved_quote_currency = $4,
        approved_quote_notes = $5,
        approved_estimated_completion = $6,
        super_admin_reviewed_by = $7,
        super_admin_reviewed_at = NOW(),
        super_admin_quote_action = $8,
        super_admin_quote_notes = $9,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      input.requestId,
      input.action === "adjust"
? "pending_super_admin_review"
: "awaiting_client_acceptance",
      amount,
      currency,
      notes,
      estimated_completion,
      input.actorUserId,
      input.action === "adjust" ? "adjusted" : "accepted",
      reason,
    ],
  )

  const row = updated.rows[0] as {
    id: string
    user_id?: string | null
    title?: string | null
  }

if (input.action === "accept" || input.action === "adjust") {
  try {
    const superVersion = await createQuoteVersion({
      requestId: input.requestId,
      userId: input.actorUserId,
      role: input.actorRole,
      source: "super_administrator",
      price: amount,
      currency,
      estimated_completion,
      reasoning: reason,
      status: "approved",
    })

    console.log("SUPER ADMIN VERSION", superVersion)
  } catch (err) {
    console.error("CREATE SUPER VERSION FAILED", err)
    throw err
  }
}

  await recordRequestAudit(input.requestId, input.actorUserId, "super_admin_reviewed_quote", {
    action: input.action,
    reason,
    amount,
    currency,
  })

  if (row?.user_id) {
    await notifyUser(row.user_id, {
      type: "quote_ready",
      title: input.action === "adjust" ? "Updated investigation quote available" : "New investigation quote available",
      message: row.title
        ? `A final quote for ${row.title} is ready for review.`
        : "A final investigation quote is ready for your review.",
      metadata: { request_id: input.requestId, target_page: "client_quote_review", action: "review_quote" },
    })
  }

  return row
}
