import { query } from "@/lib/db"
import { notifySuperAdmins } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"
import { createQuoteVersion } from "@/lib/services/quote-version-service"

export type AdminQuoteReviewAction =
  | "accept"
  | "adjust"
  | "submit_for_super_admin_review"

export type AdminDecisionSource =
  | "admin"
  | "adjusted"
  | "ai"
  | null


  
/**
 * =========================================================
 * ADMIN QUOTE REVIEW
 * =========================================================
 *
 * Workflow:
 *
 * Client
 *   ↓
 * pending_admin_review
 *   ↓
 * Administrator reviews request
 *   ↓
 * Administrator prepares quote
 *   ↓
 * pending_super_admin_review
 *   ↓
 * Super Administrator makes final decision
 *   ↓
 * Final quote
 *   ↓
 * Client
 *
 * IMPORTANT:
 *
 * The Administrator does NOT make the final client quote.
 *
 * The AI estimate is INTERNAL ONLY.
 *
 * Cybersecurity:
 *
 *   Start Date
 *   Completion Date
 *
 * OSINT / Investigation:
 *
 *   Completion Date only
 */

export async function reviewQuoteAsAdmin(
input: {
  requestId: string
  actorUserId: string
  actorRole: string

  decision_source?: AdminDecisionSource

  action: AdminQuoteReviewAction

    /**
     * Frontend payload fields
     */
    approved_quote_amount?: number | string | null
    approved_quote_currency?: string | null

    approved_estimated_start?: string | null
    approved_estimated_completion?: string | null

    admin_quote_notes?: string | null

    /**
     * Internal compatibility fields.
     *
     * These allow existing API code to continue working
     * without breaking the service.
     */
    amount?: number | string | null
    currency?: string | null
    notes?: string | null

    estimated_start?: string | null
    estimated_completion?: string | null

    reason?: string | null
  },
) {
  /*
   * =========================================================
   * VALIDATION
   * =========================================================
   */

  if (!input.requestId) {
    throw new Error(
      "Request id is required",
    )
  }

  if (!input.actorUserId) {
    throw new Error(
      "Actor user id is required",
    )
  }

  if (
    input.actorRole !==
    "administrator"
  ) {
    throw new Error(
      "Only administrators can review quotes",
    )
  }

  if (
    input.action !== "accept" &&
    input.action !== "adjust" &&
    input.action !==
      "submit_for_super_admin_review"
  ) {
    throw new Error(
      "Invalid administrator quote action",
    )
  }

  /*
   * =========================================================
   * NORMALIZE FRONTEND / INTERNAL INPUT
   * =========================================================
   *
   * The frontend uses:
   *
   * approved_quote_amount
   * approved_quote_currency
   * approved_estimated_start
   * approved_estimated_completion
   * admin_quote_notes
   *
   * The service also supports the older internal names.
   */

  const rawAmount =
    input.approved_quote_amount ??
    input.amount ??
    null

  const rawCurrency =
    input.approved_quote_currency ??
    input.currency ??
    null

  const notes =
    (
      input.admin_quote_notes ??
      input.notes ??
      ""
    )
      .trim() || null

  const reason =
    (
      input.reason ??
      notes ??
      "Administrator submitted quote for Super Administrator review."
    ).trim()

  /*
   * =========================================================
   * LOAD REQUEST
   * =========================================================
   */

const current =
  await query<{
    id: string

    user_id:
      | string
      | null

    client_email:
      | string
      | null

    title:
      | string
      | null

    status:
      | string
      | null

    service_type:
      | string
      | null

    approved_quote_amount:
      | number
      | null

    approved_quote_currency:
      | string
      | null

    approved_quote_notes:
      | string
      | null

    approved_estimated_start:
      | string
      | null

    approved_estimated_completion:
      | string
      | null

    preferred_deadline:
      | string
      | null

    osint_completion_date:
      | string
      | null

    training_preferred_start_date:
      | string
      | null

    training_preferred_completion_date:
      | string
      | null

    training_preferred_dates:
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
        service_type,

        approved_quote_amount,
        approved_quote_currency,
        approved_quote_notes,

        approved_estimated_start,
        approved_estimated_completion,

        preferred_deadline,

        osint_completion_date,

        training_preferred_start_date,
        training_preferred_completion_date,

        training_preferred_dates

      FROM requests

      WHERE id = $1

      LIMIT 1
    `,
    [input.requestId],
  )

const request =
  current.rows[0]

if (!request) {
  throw new Error(
    "Request not found",
  )
}

  /*
   * =========================================================
   * REQUEST STATUS
   * =========================================================
   *
   * Administrator can only submit a request that is currently
   * waiting for administrator review.
   */

const adminReviewableStatuses = new Set([
  "pending_admin_review",
  "negotiation_requested",
  "negotiating",
  "under_negotiation",
])

if (
  !adminReviewableStatuses.has(
    String(request.status ?? "")
      .trim()
      .toLowerCase(),
  )
) {
  throw new Error(
    "This request is not currently available for Administrator quote review",
  )
}

  /*
   * =========================================================
   * SERVICE TYPE
   * =========================================================
   */

  const normalizedService =
    (
      request.service_type ||
      ""
    )
      .trim()
      .toLowerCase()

  const isCyberSecurity =
    normalizedService ===
      "security_assessment" ||
    normalizedService.includes(
      "cybersecurity",
    ) ||
    normalizedService.includes(
      "cyber security",
    ) ||
    normalizedService.includes(
      "security assessment",
    ) ||
    normalizedService.includes(
      "penetration testing",
    ) ||
    normalizedService.includes(
      "penetration test",
    ) ||
    normalizedService.includes(
      "vulnerability assessment",
    )

  const isOSINT =
    normalizedService.includes(
      "osint",
    ) ||
    normalizedService.includes(
      "open source intelligence",
    ) ||
    normalizedService.includes(
      "digital investigation",
    ) ||
    normalizedService.includes(
      "digital intelligence",
    )

  /*
   * =========================================================
   * GET INTERNAL AI QUOTE
   * =========================================================
   *
   * AI remains an internal recommendation.
   *
   * Administrator must explicitly submit the quote.
   */

  const aiResult =
    await query<{
      price:
        | number
        | null

      currency:
        | string
        | null

      estimated_completion:
        | string
        | null

      notes:
        | string
        | null
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

        ORDER BY
          version_number DESC

        LIMIT 1
      `,
      [input.requestId],
    )

  const aiQuote =
    aiResult.rows[0]

  /*
   * =========================================================
   * QUOTE AMOUNT
   * =========================================================
   */

  if (
    rawAmount ===
      null ||
    rawAmount ===
      undefined ||
    rawAmount === ""
  ) {
    throw new Error(
      "Administrator quote amount is required",
    )
  }

  const amount =
    Number(rawAmount)

  if (
    !Number.isFinite(
      amount,
    ) ||
    amount <= 0
  ) {
    throw new Error(
      "Valid administrator quote amount is required",
    )
  }

  /*
   * =========================================================
   * CURRENCY
   * =========================================================
   */

  const currency =
    String(
      rawCurrency ??
        request.approved_quote_currency ??
        aiQuote?.currency ??
        "USD",
    )
      .trim()
      .toUpperCase()

  if (!currency) {
    throw new Error(
      "Quote currency is required",
    )
  }

  if (
    currency.length >
    10
  ) {
    throw new Error(
      "Invalid quote currency",
    )
  }

  /*
   * =========================================================
   * ESTIMATED START DATE
   * =========================================================
   *
   * Cybersecurity:
   *
   *   administrator start date is stored.
   *
   * OSINT:
   *
   *   start date is ALWAYS null.
   */

  let estimatedStart:
    | string
    | null = null

  if (isCyberSecurity) {
    estimatedStart =
      (
        input.approved_estimated_start ??
        input.estimated_start ??
        request.approved_estimated_start ??
        request.training_preferred_start_date ??
        ""
      ).trim() || null
  }

  /*
   * =========================================================
   * ESTIMATED COMPLETION DATE
   * =========================================================
   *
   * Cybersecurity:
   *
   * 1. Administrator supplied completion
   * 2. Existing approved completion
   * 3. Client requested completion
   * 4. Training completion
   * 5. Preferred deadline
   * 6. AI estimate
   *
   * OSINT:
   *
   * 1. Administrator supplied completion
   * 2. Existing approved completion
   * 3. Preferred deadline
   * 4. AI estimate
   */

  const estimatedCompletion =
  (
    input.approved_estimated_completion ??
    input.estimated_completion ??
    request.approved_estimated_completion ??
    (
      isCyberSecurity
        ? request.training_preferred_completion_date
        : request.osint_completion_date
    ) ??
    request.osint_completion_date ??
    request.preferred_deadline ??
    aiQuote?.estimated_completion ??
    ""
  ).trim() || null

  /*
   * =========================================================
   * DATE VALIDATION
   * =========================================================
   */

  function validateDate(
    value: string | null,
    fieldName: string,
  ) {
    if (!value) {
      return
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        value,
      )
    ) {
      throw new Error(
        `${fieldName} must be a valid date (YYYY-MM-DD)`,
      )
    }

    const date =
      new Date(
        `${value}T00:00:00Z`,
      )

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      throw new Error(
        `${fieldName} must be a valid date`,
      )
    }

    const normalized =
      date
        .toISOString()
        .slice(
          0,
          10,
        )

    if (
      normalized !==
      value
    ) {
      throw new Error(
        `${fieldName} must be a valid date`,
      )
    }
  }

  validateDate(
    estimatedStart,
    "Estimated start date",
  )

  validateDate(
    estimatedCompletion,
    "Estimated completion date",
  )

  /*
   * =========================================================
   * CYBERSECURITY DATE LOGIC
   * =========================================================
   */

  if (
    isCyberSecurity
  ) {
    if (
      !estimatedStart
    ) {
      throw new Error(
        "Cybersecurity requests require an estimated start date",
      )
    }

    if (
      !estimatedCompletion
    ) {
      throw new Error(
        "Cybersecurity requests require an estimated completion date",
      )
    }

    const start =
      new Date(
        `${estimatedStart}T00:00:00Z`,
      )

    const completion =
      new Date(
        `${estimatedCompletion}T00:00:00Z`,
      )

    if (
      completion <
      start
    ) {
      throw new Error(
        "Cybersecurity completion date cannot be before the start date",
      )
    }
  }

  /*
   * =========================================================
   * NON-CYBERSECURITY WORKFLOW
   * =========================================================
   *
   * OSINT / investigation requests only need a completion date.
   */

  if (
    !isCyberSecurity &&
    !estimatedCompletion
  ) {
    throw new Error(
      "An estimated completion date is required for this request",
    )
  }

  /*
   * =========================================================
   * ADMIN ACTION
   * =========================================================
   *
   * submit_for_super_admin_review is the frontend action.
   *
   * Internally:
   *
   * accept  → accepted
   * adjust  → adjusted
   * submit  → submitted
   */

  const adminAction =
    input.action ===
      "adjust"
      ? "adjusted"
      : input.action ===
          "accept"
        ? "accepted"
        : "submitted"

  /*
   * =========================================================
   * UPDATE REQUEST
   * =========================================================
   *
   * IMPORTANT:
   *
   * The UPDATE has a status guard.
   *
   * This prevents two administrators from successfully
   * submitting the same request at the same time.
   */

  const updated =
    await query<{
      id: string

      user_id:
        | string
        | null

      client_email:
        | string
        | null

      title:
        | string
        | null

      status:
        | string
        | null

      service_type:
        | string
        | null

      approved_quote_amount:
        | number
        | null

      approved_quote_currency:
        | string
        | null

      approved_quote_notes:
        | string
        | null

      approved_estimated_start:
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

      admin_reviewed_by:
        | string
        | null

      admin_reviewed_at:
        | string
        | null

      updated_at:
        | string
    }>(
      `
        UPDATE requests

        SET
          status =
            'pending_super_admin_review',

          approved_quote_amount =
            $2::numeric,

          approved_quote_currency =
            $3,

          approved_quote_notes =
            $4,

          approved_estimated_start =
            $5::date,

          approved_estimated_completion =
            $6::date,

          admin_quote_action =
            $7,

          admin_quote_notes =
            $8,

          admin_reviewed_by =
            $9,

          admin_reviewed_at =
            NOW(),

          updated_at =
            NOW()

        WHERE id = $1
  AND status IN (
    'pending_admin_review',
    'negotiation_requested',
    'negotiating',
    'under_negotiation'
  )

        RETURNING
          id,
          user_id,
          client_email,
          title,
          status,
          service_type,

          approved_quote_amount,
          approved_quote_currency,
          approved_quote_notes,

          approved_estimated_start,
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

        estimatedStart,

        estimatedCompletion,

        adminAction,

        reason,

        input.actorUserId,
      ],
    )

  const row =
    updated.rows[0]

  if (!row) {
    throw new Error(
      "Failed to update request. The request may have already been submitted by another administrator.",
    )
  }

  /*
   * =========================================================
   * CREATE IMMUTABLE ADMIN QUOTE VERSION
   * =========================================================
   */

  const adminVersion =
    await createQuoteVersion({
      requestId:
        input.requestId,

      userId:
        input.actorUserId,

      role:
        "administrator",

      source:
        "administrator",

      price:
        amount,

      currency,

      estimated_completion:
        estimatedCompletion,

      reasoning:
        reason,

      status:
        "pending_super_admin_review",
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

    action:
      input.action,

    admin_action:
      adminAction,

    reason,

    estimated_start:
      estimatedStart,

    estimated_completion:
      estimatedCompletion,

    quote_version_id:
      adminVersion.id,

    service_type:
      request.service_type,

    is_cybersecurity:
      isCyberSecurity,

    is_osint:
      isOSINT,

    quote_stage:
      "pending_super_admin_review",

    decision_source:
      input.decision_source,
  },
)

  /*
   * =========================================================
   * NOTIFY SUPER ADMINISTRATORS
   * =========================================================
   *
   * Client receives NOTHING at this stage.
   */

  await notifySuperAdmins({
    type:
      "quote_pending_super_admin_review",

    title:
      "Quote awaiting final approval",

    message:
      request.title ||
      "A quote is awaiting Super Administrator review.",

    metadata: {
      request_id:
        input.requestId,
      resource_type:
        "request",
      resource_id:
        input.requestId,
      audience:
        "super_administrator",

      quote_version_id:
        adminVersion.id,

      target_page:
        "super_admin_request_review",

      action:
        "review_quote",

      service_type:
        request.service_type,

      quote_stage:
        "pending_super_admin_review",

      estimated_start:
        estimatedStart,

      estimated_completion:
        estimatedCompletion,
    },
  })

  /*
   * =========================================================
   * RETURN INTERNAL RESULT
   * =========================================================
   */

  return {
    ...row,

    quote_version_id:
      adminVersion.id,

    quote_stage:
      "pending_super_admin_review",

    is_cybersecurity:
      isCyberSecurity,

    is_osint:
      isOSINT,

    estimated_start:
      estimatedStart,

    estimated_completion:
      estimatedCompletion,
  }
}
