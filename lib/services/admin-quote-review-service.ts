import { query } from "@/lib/db"
import { notifySuperAdmins } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"
import { createQuoteVersion } from "@/lib/services/quote-version-service"

export type AdminQuoteReviewAction = "accept" | "adjust"

export async function reviewQuoteAsAdmin(input: {
  requestId: string
  actorUserId: string
  actorRole: string
  action: AdminQuoteReviewAction
  amount?: number | null
  currency?: string | null
  notes?: string | null
  reason: string
  estimated_completion?: string | null
}) {
  if (!input.requestId) {
    throw new Error("Request id is required")
  }

  if (!input.actorUserId) {
    throw new Error("Actor user id is required")
  }

  if (input.actorRole !== "administrator") {
    throw new Error("Only administrators can review quotes")
  }

  if (!["accept", "adjust"].includes(input.action)) {
    throw new Error("Invalid administrator quote action")
  }

  const reason = input.reason?.trim() || ""

  if (!reason) {
    throw new Error("A reason is required")
  }

  /*
   * =========================================================
   * LOAD REQUEST
   * =========================================================
   */

  const current = await query<{
    id: string
    user_id: string | null
    client_email: string | null
    title: string | null
    status: string | null
    approved_quote_amount: number | null
    approved_quote_currency: string | null
    approved_quote_notes: string | null
    approved_estimated_completion: string | null
  }>(
    `
      SELECT
        id,
        user_id,
        client_email,
        title,
        status,
        approved_quote_amount,
        approved_quote_currency,
        approved_quote_notes,
        approved_estimated_completion
      FROM requests
      WHERE id = $1
      LIMIT 1
    `,
    [input.requestId],
  )

  const request = current.rows[0]

  if (!request) {
    throw new Error("Request not found")
  }

  /*
   * =========================================================
   * ALLOWED STATUSES
   * =========================================================
   */

  const allowedStatuses = new Set([
    "pending_review",
    "reviewing",
    "approved",
    "pending_admin_review",
    "admin_reviewed",
  ])

  if (!allowedStatuses.has(request.status || "")) {
    throw new Error(
      "This request is not available for administrator quote review",
    )
  }

  /*
   * =========================================================
   * GET INTERNAL AI QUOTE
   * =========================================================
   *
   * AI quote is INTERNAL ONLY.
   *
   * It is never returned to the client.
   */

  const aiResult = await query<{
    price: number | null
    currency: string | null
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
        AND source = 'ai'
      ORDER BY version_number DESC
      LIMIT 1
    `,
    [input.requestId],
  )

  const aiQuote = aiResult.rows[0]

  /*
   * =========================================================
   * DETERMINE ADMINISTRATOR QUOTE
   * =========================================================
   *
   * Priority:
   *
   * 1. Administrator supplied amount
   * 2. Internal AI estimate
   * 3. Existing quote amount
   */

if (
  input.amount === null ||
  input.amount === undefined ||
  !Number.isFinite(input.amount) ||
  input.amount <= 0
) {
  throw new Error(
    "Administrator quote amount is required",
  )
}

const amount = Number(input.amount)

if (!Number.isFinite(amount) || amount <= 0) {
  throw new Error("Valid quote amount required")
}
  /*
   * =========================================================
   * CURRENCY
   * =========================================================
   */

  const currency = String(
    input.currency ??
      request.approved_quote_currency ??
      aiQuote?.currency ??
      "USD",
  )
    .trim()
    .toUpperCase()

  if (!currency) {
    throw new Error("Quote currency is required")
  }

  if (currency.length > 10) {
    throw new Error("Invalid quote currency")
  }

  /*
   * =========================================================
   * ESTIMATED COMPLETION
   * =========================================================
   */

  const estimatedCompletion =
    input.estimated_completion?.trim() ||
    request.approved_estimated_completion ||
    aiQuote?.estimated_completion ||
    null

  if (
    estimatedCompletion &&
    !/^\d{4}-\d{2}-\d{2}$/.test(
      estimatedCompletion,
    )
  ) {
    throw new Error(
      "Estimated completion must be a valid date (YYYY-MM-DD)",
    )
  }

  /*
   * =========================================================
   * NOTES
   * =========================================================
   */

  const notes =
    input.notes?.trim() ||
    request.approved_quote_notes ||
    null

  /*
   * =========================================================
   * ADMIN ACTION
   * =========================================================
   */

  const adminAction =
    input.action === "adjust"
      ? "adjusted"
      : "submitted_for_review"

  /*
   * =========================================================
   * SAVE ADMIN PROPOSED QUOTE
   * =========================================================
   *
   * IMPORTANT:
   *
   * This is NOT the final client quote yet.
   *
   * The request moves to:
   *
   * pending_super_admin_review
   */

  const updated = await query<{
    id: string
    user_id: string | null
    client_email: string | null
    title: string | null
    status: string | null
    approved_quote_amount: number | null
    approved_quote_currency: string | null
    approved_quote_notes: string | null
    approved_estimated_completion: string | null
    admin_quote_action: string | null
    admin_quote_notes: string | null
    admin_reviewed_by: string | null
    admin_reviewed_at: string | null
    updated_at: string
  }>(
    `
      UPDATE requests
      SET
        status = 'pending_super_admin_review',

        approved_quote_amount = $2::numeric,
        approved_quote_currency = $3,
        approved_quote_notes = $4,
        approved_estimated_completion = $5::date,

        admin_quote_action = $6,
        admin_quote_notes = $7,

        admin_reviewed_by = $8,
        admin_reviewed_at = NOW(),

        updated_at = NOW()

      WHERE id = $1

      RETURNING
        id,
        user_id,
        client_email,
        title,
        status,
        approved_quote_amount,
        approved_quote_currency,
        approved_quote_notes,
        approved_estimated_completion,
        admin_quote_action,
        admin_quote_notes,
        admin_reviewed_by,
        admin_reviewed_at,
        updated_at
    `,
    [
      input.requestId,
      amount,
      currency,
      notes,
      estimatedCompletion,
      adminAction,
      reason,
      input.actorUserId,
    ],
  )

  const row = updated.rows[0]

  if (!row) {
    throw new Error("Failed to update request")
  }

  /*
   * =========================================================
   * CREATE IMMUTABLE ADMIN QUOTE VERSION
   * =========================================================
   */

  const adminVersion = await createQuoteVersion({
    requestId: input.requestId,
    userId: input.actorUserId,
    role: "administrator",
    source: "administrator",
    price: amount,
    currency,
    estimated_completion:
      estimatedCompletion,
    reasoning: reason,
    status: "pending_super_admin_review",
  })

  /*
   * =========================================================
   * AUDIT
   * =========================================================
   */

  await recordRequestAudit(
    input.requestId,
    input.actorUserId,
    "admin_submitted_quote_for_super_admin",
    {
      amount,
      currency,
      action: input.action,
      reason,
      estimated_completion:
        estimatedCompletion,
      quote_version_id:
        adminVersion.id,
    },
  )

  /*
   * =========================================================
   * NOTIFY SUPER ADMIN
   * =========================================================
   *
   * DO NOT notify the client here.
   *
   * The client must not receive the proposed quote until
   * Super Admin has given final approval.
   */

  await notifySuperAdmins({
    type: "quote_pending_super_admin_review",
    title: "Quote awaiting final approval",
    message:
      request.title ||
      "A quote is awaiting Super Administrator review.",
    metadata: {
      request_id: input.requestId,
      quote_version_id:
        adminVersion.id,
      target_page:
        "super_admin_request_review",
      action: "review_quote",
    },
  })

  /*
   * =========================================================
   * RETURN INTERNAL ADMIN RESULT
   * =========================================================
   *
   * This function is server-side.
   *
   * The API route should still avoid exposing AI data.
   */

  return {
    ...row,

    quote_version_id:
      adminVersion.id,

    /*
     * Explicitly identify this as a proposed quote,
     * not a final client quote.
     */

    quote_stage:
      "pending_super_admin_review",
  }
}