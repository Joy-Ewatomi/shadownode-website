import { query } from "@/lib/db"
import { notifyUser } from "@/lib/services/notification-service"
import {
  recordRequestAudit,
  sendQuote,
} from "@/lib/services/quote-workflow-service"
import { createQuoteVersion } from "@/lib/services/quote-version-service"

export type SuperAdminQuoteReviewAction =
  | "accept"
  | "adjust"
  | "reject"

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
  if (!input.requestId) {
    throw new Error("Request id is required")
  }

  if (!input.actorUserId) {
    throw new Error("Actor user id is required")
  }

  if (input.actorRole !== "super_administrator") {
    throw new Error(
      "Only Super Administrators can perform final quote review",
    )
  }

  if (
    !["accept", "adjust", "reject"].includes(
      input.action,
    )
  ) {
    throw new Error(
      "Invalid Super Administrator quote action",
    )
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

    approved_quote_amount:
      | number
      | null

    approved_quote_currency:
      | string
      | null

    approved_quote_notes:
      | string
      | null

    approved_estimated_completion:
      | string
      | null

    admin_quote_action:
      | string
      | null

    admin_quote_notes:
      | string
      | null
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
        approved_estimated_completion,
        admin_quote_action,
        admin_quote_notes
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
   * ONLY PENDING SUPER ADMIN REQUESTS
   * =========================================================
   */

  if (
    request.status !==
    "pending_super_admin_review"
  ) {
    throw new Error(
      "This request is not awaiting Super Administrator review",
    )
  }

  /*
   * =========================================================
   * GET LATEST ADMIN QUOTE
   * =========================================================
   */

  const adminQuoteResult = await query<{
    id: string
    price: number | null
    currency: string | null
    estimated_completion:
      | string
      | null
    reasoning: string | null
  }>(
    `
      SELECT
        id,
        price,
        currency,
        estimated_completion,
        reasoning
      FROM quote_versions
      WHERE request_id = $1
        AND source = 'administrator'
      ORDER BY version_number DESC
      LIMIT 1
    `,
    [input.requestId],
  )

  const adminQuote =
    adminQuoteResult.rows[0]

  /*
   * =========================================================
   * REJECT
   * =========================================================
   */

  if (input.action === "reject") {
    const rejected = await query<{
      id: string
      user_id: string | null
      client_email: string | null
      title: string | null
      status: string | null
      declined_reason: string | null
      updated_at: string
    }>(
      `
        UPDATE requests
        SET
          status = 'rejected',

          declined_reason = $2,

          super_admin_quote_action =
            'rejected',

          super_admin_quote_notes =
            $2,

          super_admin_reviewed_by =
            $3,

          super_admin_reviewed_at =
            NOW(),

          updated_at = NOW()

        WHERE id = $1
          AND status =
            'pending_super_admin_review'

        RETURNING
          id,
          user_id,
          client_email,
          title,
          status,
          declined_reason,
          updated_at
      `,
      [
        input.requestId,
        reason,
        input.actorUserId,
      ],
    )

    const row = rejected.rows[0]

    if (!row) {
      throw new Error(
        "Failed to reject quote",
      )
    }

    /*
     * The rejection must still have a valid
     * quote version price.
     *
     * Prefer the administrator quote.
     */

    const rejectedPrice =
      adminQuote?.price ??
      request.approved_quote_amount

    if (
      rejectedPrice === null ||
      rejectedPrice === undefined ||
      !Number.isFinite(
        Number(rejectedPrice),
      ) ||
      Number(rejectedPrice) <= 0
    ) {
      throw new Error(
        "Cannot create rejected quote version because no valid administrator quote exists",
      )
    }

    const rejectedCurrency =
      adminQuote?.currency ??
      request.approved_quote_currency ??
      "USD"

    await createQuoteVersion({
      requestId: input.requestId,
      userId: input.actorUserId,
      role: "super_administrator",
      source: "super_admin",
      price: Number(rejectedPrice),
      currency: rejectedCurrency,
      estimated_completion:
        adminQuote?.estimated_completion ??
        request.approved_estimated_completion ??
        null,
      reasoning: reason,
      status: "rejected",
    })

    /*
     * Audit
     */

    await recordRequestAudit(
      input.requestId,
      input.actorUserId,
      "super_admin_rejected_quote",
      {
        reason,
        admin_quote_version_id:
          adminQuote?.id ?? null,
      },
    )

    /*
     * Client receives status only.
     *
     * No price.
     * No AI estimate.
     * No AI reasoning.
     */

    if (row.user_id) {
      await notifyUser(row.user_id, {
        type: "quote_rejected",
        title: "Quote review completed",
        message:
          "Your request was not approved at the final review stage.",
        metadata: {
          request_id:
            input.requestId,
          target_page:
            "client_request",
          action:
            "view_request",
        },
      })
    }

    return {
      success: true,
      action: "reject",
      status: row.status,
    }
  }

  /*
   * =========================================================
   * DETERMINE FINAL AMOUNT
   * =========================================================
   */

  let finalAmount: number

  if (input.action === "adjust") {
    const suppliedAmount =
      Number(input.amount)

    if (
      !Number.isFinite(
        suppliedAmount,
      ) ||
      suppliedAmount <= 0
    ) {
      throw new Error(
        "A valid adjusted quote amount is required",
      )
    }

    finalAmount = suppliedAmount
  } else {
    const suppliedAmount =
      input.amount ??
      adminQuote?.price ??
      request.approved_quote_amount

    const numericAmount =
      Number(suppliedAmount)

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      throw new Error(
        "No valid administrator quote was found",
      )
    }

    finalAmount = numericAmount
  }

  /*
   * =========================================================
   * FINAL CURRENCY
   * =========================================================
   */

  const finalCurrency =
    String(
      input.currency ??
        adminQuote?.currency ??
        request.approved_quote_currency ??
        "USD",
    )
      .trim()
      .toUpperCase()

  if (!finalCurrency) {
    throw new Error(
      "Quote currency is required",
    )
  }

  /*
   * =========================================================
   * FINAL COMPLETION DATE
   * =========================================================
   */

  const finalCompletion =
    input.estimated_completion?.trim() ||
    adminQuote?.estimated_completion ||
    request.approved_estimated_completion ||
    null

  if (
    finalCompletion &&
    !/^\d{4}-\d{2}-\d{2}$/.test(
      finalCompletion,
    )
  ) {
    throw new Error(
      "Estimated completion must be a valid date (YYYY-MM-DD)",
    )
  }

  /*
   * =========================================================
   * FINAL NOTES
   * =========================================================
   */

  const finalNotes =
    input.notes?.trim() ||
    request.approved_quote_notes ||
    adminQuote?.reasoning ||
    null

  /*
   * =========================================================
   * CREATE SUPER ADMIN FINAL VERSION
   * =========================================================
   */

  const finalVersion =
    await createQuoteVersion({
      requestId: input.requestId,
      userId: input.actorUserId,
      role: "super_administrator",
      source: "super_admin",
      price: finalAmount,
      currency: finalCurrency,
      estimated_completion:
        finalCompletion,
      reasoning: reason,
      status:
        input.action === "adjust"
          ? "adjusted"
          : "approved",
    })

  /*
   * =========================================================
   * FINALIZE CLIENT QUOTE
   * =========================================================
   *
   * IMPORTANT:
   *
   * This is the ONLY point where sendQuote()
   * is called.
   *
   * Therefore the client does not receive
   * the quote before Super Admin approval.
   */

const finalQuote =
  await sendQuote({
    requestId: input.requestId,
    actorUserId: input.actorUserId,
    amount: finalAmount,
    currency: finalCurrency,
    notes: finalNotes,
    estimated_completion:
      finalCompletion,
  })


const requestCurrencyResult = await query<{
  preferred_currency: string | null
}>(
  `
    SELECT preferred_currency
    FROM requests
    WHERE id = $1
    LIMIT 1
  `,
  [input.requestId],
)

const clientCurrency =
  requestCurrencyResult.rows[0]?.preferred_currency
    ?.trim()
    .toUpperCase() || "USD"

const sourceCurrency =
  String(
    input.currency ??
      adminQuote?.currency ??
      request.approved_quote_currency ??
      "USD",
  )
    .trim()
    .toUpperCase()

  /*
   * =========================================================
   * SAVE SUPER ADMIN REVIEW METADATA
   * =========================================================
   */

  const updated =
    await query<{
      id: string
      status: string | null
      super_admin_quote_action:
        | string
        | null
      super_admin_quote_notes:
        | string
        | null
      super_admin_reviewed_by:
        | string
        | null
      super_admin_reviewed_at:
        | string
        | null
      updated_at: string
    }>(
      `
        UPDATE requests
        SET
          status = 'quote_sent',

          super_admin_quote_action =
            $2,

          super_admin_quote_notes =
            $3,

          super_admin_reviewed_by =
            $4,

          super_admin_reviewed_at =
            NOW(),

          updated_at =
            NOW()

        WHERE id = $1

        RETURNING
          id,
          status,
          super_admin_quote_action,
          super_admin_quote_notes,
          super_admin_reviewed_by,
          super_admin_reviewed_at,
          updated_at
      `,
      [
        input.requestId,

        input.action === "adjust"
          ? "adjusted_and_approved"
          : "approved",

        reason,

        input.actorUserId,
      ],
    )

  const row = updated.rows[0]

  if (!row) {
    throw new Error(
      "Failed to finalize quote",
    )
  }

  /*
   * =========================================================
   * AUDIT FINAL APPROVAL
   * =========================================================
   */

  await recordRequestAudit(
    input.requestId,
    input.actorUserId,
    "super_admin_approved_final_quote",
    {
      action: input.action,
      final_amount: finalAmount,
      final_currency: finalCurrency,
      estimated_completion:
        finalCompletion,
      reason,
      quote_version_id:
        finalVersion.id,
    },
  )

  /*
   * =========================================================
   * RETURN ONLY FINAL QUOTE
   * =========================================================
   *
   * NEVER return:
   *
   * ai_price_estimate
   * ai_reasoning
   * AI quote version
   */

  return {
    success: true,

    action: input.action,

    status: row.status,

    quote: {
      amount:
        finalQuote.approved_quote_amount ??
        finalAmount,

      currency:
        finalQuote.approved_quote_currency ??
        finalCurrency,

      notes:
        finalQuote.approved_quote_notes ??
        finalNotes,

      estimated_completion:
        finalQuote.approved_estimated_completion ??
        finalCompletion,
    },

    quote_version_id:
      finalVersion.id,
  }
}