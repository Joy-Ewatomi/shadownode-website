import { query } from "@/lib/db"
import {
  notifyAdmins,
  notifySuperAdmins,
  notifyUser,
} from "@/lib/services/notification-service"
import { convertCurrency } from "@/lib/services/currency-service"

type AdminQuoteReviewAction =
  | "adjust"
  | "submit"

/**
 * =========================================================
 * REQUEST AUDIT
 * =========================================================
 *
 * Records an audit event for a request.
 *
 * IMPORTANT:
 * Audit data is internal and must never be returned directly
 * to the client.
 */
export async function recordRequestAudit(
  requestId: string,
  actorUserId: string | null,
  action: string,
  details: Record<string, unknown> = {},
) {
  await query(
    `
      INSERT INTO request_audit_events
      (
        request_id,
        actor_user_id,
        action,
        details
      )
      VALUES ($1, $2, $3, $4)
    `,
    [
      requestId,
      actorUserId,
      action,
      JSON.stringify(details),
    ],
  ).catch((err) => {
    console.error("AUDIT ERROR", err)
  })
}

/**
 * =========================================================
 * SEND APPROVED QUOTE
 * =========================================================
 *
 * Sends the final client-facing quote.
 *
 * INTERNAL INFORMATION:
 * - AI estimate
 * - administrator reasoning
 * - administrator notes
 * - administrator adjustments
 * - Super Administrator reasoning
 *
 * must never be sent to the client.
 */
export async function sendQuote(input: {
  requestId: string
  actorUserId: string
  amount: number
  currency?: string | null
  notes?: string | null
  estimated_completion?: string | null
}) {


  const actorResult = await query<{
  id: string
  role: string
  status: string | null
}>(
  `
    SELECT
      id,
      role,
      status
    FROM app_users
    WHERE id = $1
    LIMIT 1
  `,
  [input.actorUserId],
)

const actor = actorResult.rows[0]

if (!actor) {
  throw new Error("Administrator account not found")
}

if (actor.status !== "active") {
  throw new Error("Administrator account is not active")
}

if (
  actor.role !== "super-administrator" &&
  actor.role !== "super_administrator"
) {
  throw new Error(
    "Only a Super Administrator can send the final quote",
  )
}
  /**
   * -------------------------------------------------------
   * VALIDATE AMOUNT
   * -------------------------------------------------------
   */
  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0
  ) {
    throw new Error(
      "Quote amount must be greater than zero",
    )
  }

  /**
   * -------------------------------------------------------
   * GET REQUEST
   * -------------------------------------------------------
   */
  const requestResult = await query<{
    user_id: string | null
    client_email: string | null
    title: string | null
    preferred_currency: string | null
  }>(
    `
      SELECT
        user_id,
        client_email,
        title,
        preferred_currency
      FROM requests
      WHERE id = $1
      LIMIT 1
    `,
    [input.requestId],
  )

  const request = requestResult.rows[0]

  if (!request) {
    throw new Error("Request not found")
  }

  /**
   * -------------------------------------------------------
   * CLIENT CURRENCY
   * -------------------------------------------------------
   */
  const clientCurrency =
    request.preferred_currency
      ?.trim()
      .toUpperCase() || "USD"

  /**
   * The supplied amount is assumed to be USD
   * unless another source currency is explicitly supplied.
   */
  const quoteCurrency =
    input.currency?.trim().toUpperCase() || "USD"

  let clientAmount = input.amount
  let exchangeRate = 1

  /**
   * -------------------------------------------------------
   * CONVERT QUOTE → CLIENT CURRENCY
   * -------------------------------------------------------
   */
  if (quoteCurrency !== clientCurrency) {
    try {
      const converted = await convertCurrency({
        amount: input.amount,
        from: quoteCurrency,
        to: clientCurrency,
      })

      clientAmount = converted.amount
      exchangeRate = converted.rate
    } catch (error) {
      console.error(
        "CURRENCY CONVERSION ERROR",
        error,
      )

      throw new Error(
        `Unable to convert ${quoteCurrency} to ${clientCurrency}`,
      )
    }
  }

  /**
   * -------------------------------------------------------
   * ESTIMATED COMPLETION
   * -------------------------------------------------------
   */
  const estimatedCompletion =
    input.estimated_completion &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      input.estimated_completion,
    )
      ? input.estimated_completion
      : null

  /**
   * -------------------------------------------------------
   * SAVE FINAL QUOTE
   * -------------------------------------------------------
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
  approved_estimated_start: string | null
  approved_estimated_completion: string | null
  quote_exchange_rate: number | null
  quote_base_currency: string | null
  quote_currency_converted_at: string | null
  quote_sent_at: string | null
  updated_at: string
}>(
  `
    UPDATE requests
    SET
      status =
        'quote_sent',

      price_notes =
        $4,

      final_price =
        ROUND($2)::integer,

      approved_quote_amount =
        $2::numeric,

      approved_quote_currency =
        $3,

      approved_estimated_start =
        approved_estimated_start,

      approved_estimated_completion =
        $5::date,

      approved_quote_notes =
        $4,

      admin_reviewed_by =
        $6,

      admin_reviewed_at =
        NOW(),

      quote_exchange_rate =
        $7::numeric,

      quote_base_currency =
        $8,

      quote_currency_converted_at =
        NOW(),

      quote_sent_at =
        NOW(),

      updated_at =
        NOW()

   WHERE id = $1
  AND status = 'pending_super_admin_review'

    RETURNING
      id,
      user_id,
      client_email,
      title,
      status,
      approved_quote_amount,
      approved_quote_currency,
      approved_quote_notes,
      approved_estimated_start,
      approved_estimated_completion,
      quote_exchange_rate,
      quote_base_currency,
      quote_currency_converted_at,
      quote_sent_at,
      updated_at
  `,
  [
    input.requestId,
    clientAmount,
    clientCurrency,
    input.notes || null,
    estimatedCompletion,
    input.actorUserId,
    exchangeRate,
    quoteCurrency,
  ],
)

  const row = updated.rows[0]

if (!updated.rows[0]) {
  throw new Error(
    "Request is not awaiting Super Administrator quote approval",
  )
}

  /**
   * -------------------------------------------------------
   * AUDIT
   * -------------------------------------------------------
   */
  await recordRequestAudit(
    input.requestId,
    input.actorUserId,
    "quote_sent",
    {
      quote_currency:
        quoteCurrency,

      quote_amount:
        input.amount,

      client_currency:
        clientCurrency,

      client_amount:
        clientAmount,

      exchange_rate:
        exchangeRate,

      estimated_completion:
        estimatedCompletion,

      converted_at:
        new Date().toISOString(),
    },
  )

  /**
   * -------------------------------------------------------
   * NOTIFY CLIENT
   * -------------------------------------------------------
   */
  if (row.user_id) {
    await notifyUser(
      row.user_id,
      {
        type: "quote_ready",

        title:
          "Quote ready",

        message:
          "Your investigation quote is ready for review.",

        metadata: {
          request_id:
            input.requestId,

          target_page:
            "client_quote_review",

          action:
            "review_quote",
        },
      },
    )
  }

  /**
   * Return only the quote information that is
   * safe for the calling layer to use.
   *
   * No AI pricing or internal reasoning is returned.
   */
  return {
    id: row.id,
    user_id: row.user_id,
    client_email: row.client_email,
    title: row.title,
    status: row.status,
    approved_quote_amount:
      row.approved_quote_amount,
    approved_quote_currency:
      row.approved_quote_currency,
    approved_quote_notes:
      row.approved_quote_notes,
    approved_estimated_completion:
      row.approved_estimated_completion,
    quote_exchange_rate:
      row.quote_exchange_rate,
    quote_base_currency:
      row.quote_base_currency,
    quote_currency_converted_at:
      row.quote_currency_converted_at,
    quote_sent_at:
      row.quote_sent_at,
    updated_at:
      row.updated_at,
  }
}

/**
 * =========================================================
 * ADMINISTRATOR QUOTE REVIEW
 * =========================================================
 *
 * Administrator prepares a quote for Super Administrator
 * review.
 *
 * IMPORTANT WORKFLOW:
 *
 * Administrator
 *      ↓
 * reviewQuoteAsAdmin()
 *      ↓
 * pending_super_admin_review
 *      ↓
 * Super Administrator
 *      ↓
 * final client-facing quote
 *
 * The Administrator NEVER sends the quote directly
 * to the client.
 *
 * AI pricing remains internal.
 */
export async function reviewQuoteAsAdmin(input: {
  requestId: string
  actorUserId: string
  actorRole: string
  action: AdminQuoteReviewAction
  amount?: number | null
  currency?: string | null
  notes?: string | null
  reason: string
  estimated_start?: string | null
  estimated_completion?: string | null
}) {
  if (!input.actorUserId) {
    throw new Error("Administrator user id is required")
  }

  const administrator = await query<{
    id: string
    role: string
    status: string | null
  }>(
    `
      SELECT
        id,
        role,
        status
      FROM app_users
      WHERE id = $1
      LIMIT 1
    `,
    [input.actorUserId],
  )

  const actor = administrator.rows[0]

  if (!actor) {
    throw new Error("Administrator account not found")
  }

  if (actor.status !== "active") {
    throw new Error("Administrator account is not active")
  }

  if (actor.role !== "administrator") {
    throw new Error(
      "Only an Administrator can submit a quote for Super Administrator review",
    )
  }

  const amount = Number(input.amount)

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Quote amount must be greater than zero")
  }

  const currency = String(input.currency || "")
    .trim()
    .toUpperCase()

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(
      "A valid three-letter quote currency is required",
    )
  }

  const reason = String(
    input.reason || input.notes || "",
  ).trim()

  if (!reason) {
    throw new Error(
      "A reason or administrator note is required",
    )
  }

  const estimatedCompletion = input.estimated_completion
    ? String(input.estimated_completion).slice(0, 10)
    : null

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

const estimatedStart =
  input.estimated_start?.trim() || null

if (
  estimatedStart &&
  !/^\d{4}-\d{2}-\d{2}$/.test(
    estimatedStart,
  )
) {
  throw new Error(
    "Estimated start must be a valid date (YYYY-MM-DD)",
  )
}

  const requestResult = await query<{
    id: string
    user_id: string | null
    title: string | null
    status: string | null
  }>(
    `
      SELECT
        id,
        user_id,
        title,
        status
      FROM requests
      WHERE id = $1
      LIMIT 1
    `,
    [input.requestId],
  )

  const request = requestResult.rows[0]

  if (!request) {
    throw new Error("Request not found")
  }

  const lockedStatuses = new Set([
    "pending_super_admin_review",
    "super_admin_approved",
    "quote_sent",
    "client_decision_pending",
    "rejected",
  ])

  if (
    lockedStatuses.has(
      String(request.status || ""),
    )
  ) {
    throw new Error(
      "This request cannot be modified in its current workflow state",
    )
  }

 /*
 * -------------------------------------------------------
 * CREATE QUOTE VERSION
 * -------------------------------------------------------
 */

const previousVersion = await query<{
  price: number | null
}>(
  `
    SELECT
      price
    FROM quote_versions
    WHERE request_id = $1
    ORDER BY version_number DESC
    LIMIT 1
  `,
  [input.requestId],
)

const previousPrice =
  previousVersion.rows[0]?.price ?? null

const nextVersion = await query<{
  next_version: number
}>(
  `
    SELECT
      COALESCE(
        MAX(version_number),
        0
      ) + 1 AS next_version
    FROM quote_versions
    WHERE request_id = $1
  `,
  [input.requestId],
)

const versionNumber =
  Number(
    nextVersion.rows[0]?.next_version || 1,
  )

const priceDifference =
  previousPrice !== null
    ? amount - Number(previousPrice)
    : null

const version = await query<{
  id: string
}>(
  `
    INSERT INTO quote_versions
    (
      request_id,
      version_number,
      created_by,
      creator_role,
      source,
      price,
      currency,
      estimated_completion,
      notes,
      reasoning,
      status,
      previous_price,
      price_difference
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13
    )
    RETURNING id
  `,
  [
    input.requestId,
    versionNumber,
    input.actorUserId,
    "administrator",
    "administrator_proposal",
    amount,
    currency,
    estimatedCompletion,
    reason,
    reason,
    "pending_super_admin_review",
    previousPrice,
    priceDifference,
  ],
)

const quoteVersionId =
  version.rows[0]?.id

if (!quoteVersionId) {
  throw new Error(
    "Failed to create quote version",
  )
}

/*
 * -------------------------------------------------------
 * SAVE ADMINISTRATOR PROPOSAL
 * -------------------------------------------------------
 */

const updated = await query<{
  id: string
  user_id: string | null
  title: string | null
  status: string
  approved_quote_amount: number
  approved_quote_currency: string
  approved_quote_notes: string | null
  approved_estimated_completion: string | null
  admin_quote_action: string | null
  admin_quote_notes: string | null
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

      approved_estimated_completion =
        $5::date,

      admin_quote_action =
        $6,

      admin_quote_notes =
        $4,

      admin_reviewed_by =
        $7,

      admin_reviewed_at =
        NOW(),

      updated_at =
        NOW()

    WHERE id = $1

    RETURNING
      id,
      user_id,
      title,
      status,
      approved_quote_amount,
      approved_quote_currency,
      approved_quote_notes,
      approved_estimated_completion,
      admin_quote_action,
      admin_quote_notes
  `,
  [
    input.requestId,
    amount,
    currency,
    reason,
    estimatedCompletion,
    input.action,
    input.actorUserId,
  ],
)

const row = updated.rows[0]

if (!row) {
  throw new Error(
    "Failed to save administrator proposal",
  )
}

  /*
   * -------------------------------------------------------
   * AUDIT
   * -------------------------------------------------------
   */

  await recordRequestAudit(
    input.requestId,
    input.actorUserId,
    input.action === "adjust"
      ? "administrator_adjusted_quote_for_super_admin_review"
      : "administrator_submitted_quote_for_super_admin_review",
    {
      quote_amount: amount,
      quote_currency: currency,
      reason,
      estimated_completion: estimatedCompletion,
      quote_version_id: quoteVersionId,
    },
  )

  /*
   * -------------------------------------------------------
   * NOTIFY SUPER ADMIN
   * -------------------------------------------------------
   */

 await notifySuperAdmins({
  type: "quote_pending_super_admin_review",

  title:
    input.action === "adjust"
      ? "Adjusted quote requires review"
      : "Quote requires Super Administrator review",

  message:
    row.title ||
    "An administrator has submitted a quote for review.",

  metadata: {
    request_id: input.requestId,
    quote_version_id: quoteVersionId,
    target_page: "super_admin_quote_review",
    action: "review_quote",
  },
}).catch((error: any) => {
  console.error(
    "SUPER ADMIN QUOTE NOTIFICATION ERROR",
    error,
  )
})

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    status: row.status,
    approved_quote_amount:
      row.approved_quote_amount,
    approved_quote_currency:
      row.approved_quote_currency,
   approved_quote_notes:
  row.approved_quote_notes,
  approved_estimated_completion:
  row.approved_estimated_completion,
    admin_quote_action:
      row.admin_quote_action,
  }
}

/**
 * =========================================================
 * DECLINE REQUEST
 * =========================================================
 */
export async function declineRequest(
  requestId: string,
  actorUserId: string,
  reason?: string | null,
) {
  const cleanReason =
    reason?.trim() || null

  const updated = await query<{
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

        declined_reason =
          $2,

        admin_quote_action =
          'rejected',

        admin_quote_notes =
          $2,

        admin_reviewed_by =
          $3,

        admin_reviewed_at =
          NOW(),

        updated_at =
          NOW()

      WHERE id = $1

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
      requestId,
      cleanReason,
      actorUserId,
    ],
  )

  const row = updated.rows[0]

  if (!row) {
    throw new Error("Request not found")
  }

  /**
   * -------------------------------------------------------
   * AUDIT
   * -------------------------------------------------------
   */
  await recordRequestAudit(
    requestId,
    actorUserId,
    "request_rejected",
    {
      reason:
        cleanReason,
    },
  )

  /**
   * -------------------------------------------------------
   * NOTIFY CLIENT
   * -------------------------------------------------------
   */
  if (row.user_id) {
    await notifyUser(
      row.user_id,
      {
        type:
          "quote_rejected",

        title:
          "Request rejected",

        message:
          "Your investigation request was rejected.",

        metadata: {
          request_id:
            requestId,

          target_page:
            "client_quote_review",

          action:
            "view_request",
        },
      },
    )
  }

  return row
}

/**
 * =========================================================
 * CLIENT REQUESTS QUOTE REVIEW
 * =========================================================
 *
 * Creates a negotiation request.
 *
 * IMPORTANT:
 *
 * The AI estimate is copied into the negotiation record
 * for internal review but is NEVER returned to the client.
 */
export async function requestQuoteReview(
  input: {
    requestId: string
    clientId: string
    requestedBudget: number
    currency: string
    reason: string
    notes?: string | null
  },
) {
  /**
   * -------------------------------------------------------
   * VALIDATE BUDGET
   * -------------------------------------------------------
   */
  if (
    !Number.isFinite(
      input.requestedBudget,
    ) ||
    input.requestedBudget <= 0
  ) {
    throw new Error(
      "Requested budget must be greater than zero",
    )
  }

  /**
   * -------------------------------------------------------
   * VALIDATE REASON
   * -------------------------------------------------------
   */
  const cleanReason =
    input.reason?.trim()

  if (!cleanReason) {
    throw new Error(
      "A reason is required",
    )
  }

  /**
   * -------------------------------------------------------
   * VALIDATE CURRENCY
   * -------------------------------------------------------
   */
  const clientCurrency =
    input.currency
      ?.trim()
      .toUpperCase()

  if (
    !clientCurrency ||
    !/^[A-Z]{3}$/.test(
      clientCurrency,
    )
  ) {
    throw new Error(
      "Invalid currency",
    )
  }

  /**
   * -------------------------------------------------------
   * VERIFY REQUEST + CURRENT QUOTE
   * -------------------------------------------------------
   *
   * ai_price_estimate is internal only.
   */
  const current = await query<{
    ai_price_estimate: number | null
    approved_quote_amount: number | null
    approved_quote_currency: string | null
    preferred_currency: string | null
    status: string | null
  }>(
    `
      SELECT
        ai_price_estimate,
        approved_quote_amount,
        approved_quote_currency,
        preferred_currency,
        status
      FROM requests
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [
      input.requestId,
      input.clientId,
    ],
  )

  const row = current.rows[0]

  if (!row) {
    throw new Error(
      "Request not found",
    )
  }

  /**
   * -------------------------------------------------------
   * VERIFY REQUEST CURRENCY
   * -------------------------------------------------------
   */
  const requestCurrency =
    row.preferred_currency
      ?.trim()
      .toUpperCase() || "USD"

  if (
    clientCurrency !==
    requestCurrency
  ) {
    throw new Error(
      `Negotiation must use the client's currency (${requestCurrency})`,
    )
  }

  /**
   * -------------------------------------------------------
   * VERIFY EXISTING QUOTE
   * -------------------------------------------------------
   */
  if (
    row.approved_quote_amount ===
      null ||
    !Number.isFinite(
      Number(
        row.approved_quote_amount,
      ),
    ) ||
    Number(
      row.approved_quote_amount,
    ) <= 0
  ) {
    throw new Error(
      "There is no valid quote available for review",
    )
  }

  /**
   * -------------------------------------------------------
   * FIND ADMINISTRATOR REVIEWER
   * -------------------------------------------------------
   */
  const reviewer =
    await query<{
      id: string
    }>(
      `
        SELECT id
        FROM app_users
        WHERE role IN (
          'administrator'
        )
        AND status = 'active'
        ORDER BY created_at ASC
        LIMIT 1
      `,
    ).catch(() => ({
      rows: [] as {
        id: string
      }[],
    }))

  /**
   * -------------------------------------------------------
   * NEXT NEGOTIATION ROUND
   * -------------------------------------------------------
   */
  const round =
    await query<{
      next_round: number
    }>(
      `
        SELECT
          COALESCE(
            MAX(round_number),
            0
          ) + 1 AS next_round
        FROM quote_negotiations
        WHERE request_id = $1
      `,
      [input.requestId],
    )

  const nextRound =
    Number(
      round.rows[0]?.next_round ||
        1,
    )

  /**
   * -------------------------------------------------------
   * CREATE NEGOTIATION
   * -------------------------------------------------------
   */
  const inserted =
    await query<{
      id: string
      request_id: string
      client_id: string
      status: string
      round_number: number
    }>(
      `
        INSERT INTO quote_negotiations
        (
          request_id,
          client_id,
          assigned_reviewer_id,
          round_number,
          status,
          original_ai_estimate,
          original_quote_amount,
          quote_currency,
          requested_budget,
          client_reason,
          client_notes
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          'requested',
          $5,
          $6,
          $7,
          $8,
          $9,
          $10
        )
        RETURNING
          id,
          request_id,
          client_id,
          status,
          round_number
      `,
      [
        input.requestId,

        input.clientId,

        reviewer.rows[0]?.id ||
          null,

        nextRound,

        /**
         * INTERNAL ONLY
         */
        row.ai_price_estimate ??
          null,

        /**
         * Current client-facing
         * quote.
         */
        row.approved_quote_amount ??
          null,

        /**
         * Always store negotiation
         * in client's currency.
         */
        clientCurrency,

        input.requestedBudget,

        cleanReason,

        input.notes?.trim() ||
          null,
      ],
    )

  const negotiation =
    inserted.rows[0]

  if (!negotiation) {
    throw new Error(
      "Failed to create quote review request",
    )
  }

  /**
   * -------------------------------------------------------
   * UPDATE REQUEST
   * -------------------------------------------------------
   */
  await query(
    `
      UPDATE requests
      SET
        status =
          'negotiation_requested',

        updated_at =
          NOW()

      WHERE id = $1
    `,
    [input.requestId],
  )

  /**
   * -------------------------------------------------------
   * AUDIT
   * -------------------------------------------------------
   */
  await recordRequestAudit(
    input.requestId,
    input.clientId,
    "client_requested_quote_review",
    {
      negotiation_id:
        negotiation.id,

      requested_budget:
        input.requestedBudget,

      reason:
        cleanReason,

      currency:
        clientCurrency,
    },
  )

  /**
   * -------------------------------------------------------
   * NOTIFY ADMINISTRATORS
   * -------------------------------------------------------
   */
  await notifyAdmins({
    type:
      "negotiation_requested",

    title:
      "Quote review requested",

    message:
      cleanReason,

    metadata: {
      request_id:
        input.requestId,

      negotiation_id:
        negotiation.id,

      target_page:
        "admin_request_review",

      action:
        "review_negotiation",
    },
  })

  /**
   * -------------------------------------------------------
   * SAFE CLIENT RESPONSE
   * -------------------------------------------------------
   *
   * Do NOT return:
   * - AI estimate
   * - administrator information
   * - internal reviewer ID
   * - internal pricing
   */
  return {
    id:
      negotiation.id,

    request_id:
      negotiation.request_id,

    client_id:
      negotiation.client_id,

    status:
      negotiation.status,

    round_number:
      negotiation.round_number,
  }
}

/**
 * =========================================================
 * ADMINISTRATOR REVIEWS NEGOTIATION
 * =========================================================
 *
 * requested → reviewing
 *
 * Administrator recommends.
 *
 * Administrator does NOT make the final client-facing
 * decision.
 */
export async function administratorReviewNegotiation(
  input: {
    negotiationId: string
    administratorId: string
    recommendation: string
    revisedQuoteAmount?: number | null
    notes?: string | null
  },
) {
  /**
   * -------------------------------------------------------
   * VERIFY ADMINISTRATOR
   * -------------------------------------------------------
   */
  const administrator =
    await query<{
      id: string
      role: string
    }>(
      `
        SELECT
          id,
          role
        FROM app_users
        WHERE id = $1
          AND status = 'active'
        LIMIT 1
      `,
      [input.administratorId],
    )

  const actor =
    administrator.rows[0]

  if (!actor) {
    throw new Error(
      "Administrator account not found",
    )
  }

  if (
    actor.role !==
    "administrator"
  ) {
    throw new Error(
      "Only an Administrator can submit a negotiation recommendation",
    )
  }

  /**
   * -------------------------------------------------------
   * VALIDATE RECOMMENDATION
   * -------------------------------------------------------
   */
  const recommendation =
    input.recommendation?.trim()

  if (!recommendation) {
    throw new Error(
      "Administrator recommendation is required",
    )
  }

  /**
   * -------------------------------------------------------
   * VALIDATE REVISED QUOTE
   * -------------------------------------------------------
   */
  if (
    input.revisedQuoteAmount !==
      null &&
    input.revisedQuoteAmount !==
      undefined
  ) {
    if (
      !Number.isFinite(
        input.revisedQuoteAmount,
      ) ||
      input.revisedQuoteAmount <= 0
    ) {
      throw new Error(
        "Revised quote amount must be valid",
      )
    }
  }

  /**
   * -------------------------------------------------------
   * GET NEGOTIATION
   * -------------------------------------------------------
   */
  const negotiation =
    await query<{
      id: string
      request_id: string
      status: string
      requested_budget: number | null
      quote_currency: string | null
    }>(
      `
        SELECT
          id,
          request_id,
          status,
          requested_budget,
          quote_currency
        FROM quote_negotiations
        WHERE id = $1
        LIMIT 1
      `,
      [input.negotiationId],
    )

  const current =
    negotiation.rows[0]

  if (!current) {
    throw new Error(
      "Negotiation not found",
    )
  }

  /**
   * -------------------------------------------------------
   * VALID STATUS
   * -------------------------------------------------------
   */
  if (
    current.status !==
      "requested" &&
    current.status !==
      "reviewing"
  ) {
    throw new Error(
      "This negotiation is not available for administrator review",
    )
  }

  /**
   * -------------------------------------------------------
   * VERIFY CURRENCY
   * -------------------------------------------------------
   */
  const negotiationCurrency =
    current.quote_currency
      ?.trim()
      .toUpperCase()

  if (!negotiationCurrency) {
    throw new Error(
      "Negotiation currency is missing",
    )
  }

  /**
   * -------------------------------------------------------
   * ADMINISTRATOR → SUPER ADMIN
   * -------------------------------------------------------
   */
  const updated =
    await query<{
      id: string
      request_id: string
      client_id: string
      assigned_reviewer_id: string | null
      round_number: number
      status: string
      administrator_recommendation: string | null
      revised_quote_amount: number | null
      owner_decision_notes: string | null
      created_at: string
      updated_at: string
    }>(
      `
        UPDATE quote_negotiations
        SET
          assigned_reviewer_id =
            $2,

          status =
            'reviewing',

          administrator_recommendation =
            $3,

          revised_quote_amount =
            $4,

          owner_decision_notes =
            $5,

          updated_at =
            NOW()

        WHERE id = $1

        RETURNING
          id,
          request_id,
          client_id,
          assigned_reviewer_id,
          round_number,
          status,
          administrator_recommendation,
          revised_quote_amount,
          owner_decision_notes,
          created_at,
          updated_at
      `,
      [
        input.negotiationId,

        input.administratorId,

        recommendation,

        input.revisedQuoteAmount ??
          null,

        input.notes?.trim() ||
          null,
      ],
    )

  /**
   * -------------------------------------------------------
   * REQUEST WAITS FOR SUPER ADMIN
   * -------------------------------------------------------
   */
  await query(
    `
      UPDATE requests
      SET
        status =
          'pending_super_admin_review',

        updated_at =
          NOW()

      WHERE id = $1
    `,
    [current.request_id],
  )

  /**
   * -------------------------------------------------------
   * AUDIT
   * -------------------------------------------------------
   */
  await recordRequestAudit(
    current.request_id,
    input.administratorId,
    "administrator_submitted_negotiation_for_super_admin",
    {
      negotiation_id:
        input.negotiationId,

      recommended_amount:
        input.revisedQuoteAmount ??
        null,

      recommendation:
        recommendation,

      currency:
        negotiationCurrency,
    },
  )

  /**
   * Return administrator-safe
   * information only.
   */
  return updated.rows[0]
}

/**
 * =========================================================
 * SUPER ADMINISTRATOR DECIDES NEGOTIATION
 * =========================================================
 *
 * reviewing → approved
 * reviewing → rejected
 *
 * ONLY Super Administrator can change the actual
 * client-facing quote.
 */
export async function superAdminDecideNegotiation(
  input: {
    negotiationId: string
    superAdminId: string
    decision:
      | "approve"
      | "reject"
      | "modify"
    revisedQuoteAmount?: number | null
    notes?: string | null
  },
) {
  /**
   * -------------------------------------------------------
   * VERIFY SUPER ADMINISTRATOR
   * -------------------------------------------------------
   */
  const superAdmin =
    await query<{
      id: string
      role: string
    }>(
      `
        SELECT
          id,
          role
        FROM app_users
        WHERE id = $1
          AND status = 'active'
        LIMIT 1
      `,
      [input.superAdminId],
    )

  const actor =
    superAdmin.rows[0]

  if (!actor) {
    throw new Error(
      "Super Administrator account not found",
    )
  }

  if (
    actor.role !==
      "super-administrator" &&
    actor.role !==
      "super_administrator"
  ) {
    throw new Error(
      "Only a Super Administrator can approve or modify a negotiation",
    )
  }

  /**
   * -------------------------------------------------------
   * VALIDATE DECISION
   * -------------------------------------------------------
   */
  if (
    ![
      "approve",
      "reject",
      "modify",
    ].includes(
      input.decision,
    )
  ) {
    throw new Error(
      "Invalid Super Administrator decision",
    )
  }

  /**
   * -------------------------------------------------------
   * VALIDATE MODIFICATION
   * -------------------------------------------------------
   */
  if (
    input.decision ===
      "modify"
  ) {
    if (
      input.revisedQuoteAmount ===
        null ||
      input.revisedQuoteAmount ===
        undefined ||
      !Number.isFinite(
        input.revisedQuoteAmount,
      ) ||
      input.revisedQuoteAmount <= 0
    ) {
      throw new Error(
        "A valid revised quote amount is required",
      )
    }
  }

  /**
   * -------------------------------------------------------
   * GET NEGOTIATION
   * -------------------------------------------------------
   */
  const negotiation =
    await query<{
      id: string
      request_id: string
      quote_currency: string | null
      preferred_currency: string | null
      original_quote_amount: number | null
      revised_quote_amount: number | null
      status: string
    }>(
      `
        SELECT
          qn.id,
          qn.request_id,
          qn.quote_currency,
          qn.original_quote_amount,
          qn.revised_quote_amount,
          qn.status,
          r.preferred_currency
        FROM quote_negotiations qn
        INNER JOIN requests r
          ON r.id = qn.request_id
        WHERE qn.id = $1
        LIMIT 1
      `,
      [input.negotiationId],
    )

  /**
   * -------------------------------------------------------
   * VERIFY NEGOTIATION
   * -------------------------------------------------------
   */
  const current =
    negotiation.rows[0]

  if (!current) {
    throw new Error(
      "Negotiation not found",
    )
  }

  if (
    current.status !==
    "reviewing"
  ) {
    throw new Error(
      "Negotiation is not awaiting Super Administrator review",
    )
  }

  /**
   * -------------------------------------------------------
   * VERIFY CURRENCY
   * -------------------------------------------------------
   */
  const negotiationCurrency =
    current.quote_currency
      ?.trim()
      .toUpperCase()

  const requestCurrency =
    current.preferred_currency
      ?.trim()
      .toUpperCase() || "USD"

  if (!negotiationCurrency) {
    throw new Error(
      "Negotiation currency is missing",
    )
  }

  if (
    negotiationCurrency !==
    requestCurrency
  ) {
    throw new Error(
      "Negotiation currency no longer matches the client's currency",
    )
  }

  /**
   * -------------------------------------------------------
   * REJECT
   * -------------------------------------------------------
   */
  if (
    input.decision ===
    "reject"
  ) {
    const updated =
      await query<{
        id: string
        request_id: string
        client_id: string
        status: string
        owner_approver_id: string
        owner_decision: string
        owner_decision_notes: string | null
        decided_at: string
        created_at: string
        updated_at: string
      }>(
        `
          UPDATE quote_negotiations
          SET
            status =
              'rejected',

            owner_approver_id =
              $2,

            owner_decision =
              'rejected',

            owner_decision_notes =
              $3,

            decided_at =
              NOW(),

            updated_at =
              NOW()

          WHERE id = $1

          RETURNING
            id,
            request_id,
            client_id,
            status,
            owner_approver_id,
            owner_decision,
            owner_decision_notes,
            decided_at,
            created_at,
            updated_at
        `,
        [
          input.negotiationId,

          input.superAdminId,

          input.notes?.trim() ||
            null,
        ],
      )

    /**
     * -----------------------------------------------------
     * RESTORE PREVIOUS CLIENT QUOTE
     * -----------------------------------------------------
     */
    await query(
      `
        UPDATE requests
        SET
          status =
            'quote_sent',

          updated_at =
            NOW()

        WHERE id = $1
      `,
      [current.request_id],
    )

    /**
     * -----------------------------------------------------
     * AUDIT
     * -----------------------------------------------------
     */
    await recordRequestAudit(
      current.request_id,
      input.superAdminId,
      "super_admin_rejected_negotiation",
      {
        negotiation_id:
          input.negotiationId,

        notes:
          input.notes?.trim() ||
          null,
      },
    )

    /**
     * -----------------------------------------------------
     * NOTIFY CLIENT
     * -----------------------------------------------------
     */
    const requestOwner =
      await query<{
        user_id: string | null
      }>(
        `
          SELECT
            user_id
          FROM requests
          WHERE id = $1
          LIMIT 1
        `,
        [current.request_id],
      )

    const userId =
      requestOwner.rows[0]
        ?.user_id

    if (userId) {
      await notifyUser(
        userId,
        {
          type:
            "quote_rejected",

          title:
            "Quote review declined",

          message:
            "Your requested quote review was not approved.",

          metadata: {
            request_id:
              current.request_id,

            negotiation_id:
              input.negotiationId,

            target_page:
              "client_quote_review",

            action:
              "view_request",
          },
        },
      )
    }

    return updated.rows[0]
  }

  /**
   * -------------------------------------------------------
   * DETERMINE FINAL AMOUNT
   * -------------------------------------------------------
   */
  let finalAmount: number | null =
    null

  /**
   * APPROVE
   *
   * Uses the administrator's revised amount
   * when available.
   */
  if (
    input.decision ===
    "approve"
  ) {
    finalAmount =
      current.revised_quote_amount ??
      current.original_quote_amount
  }

  /**
   * MODIFY
   *
   * Super Administrator explicitly
   * supplies a new amount.
   */
  if (
    input.decision ===
    "modify"
  ) {
    finalAmount =
      input.revisedQuoteAmount ??
      null
  }

  /**
   * -------------------------------------------------------
   * FINAL AMOUNT SAFETY CHECK
   * -------------------------------------------------------
   */
  if (
    finalAmount === null ||
    !Number.isFinite(
      Number(finalAmount),
    ) ||
    Number(finalAmount) <= 0
  ) {
    throw new Error(
      "No valid quote amount is available",
    )
  }

  const normalizedFinalAmount =
    Number(finalAmount)

  /**
   * -------------------------------------------------------
   * OWNER DECISION
   * -------------------------------------------------------
   */
  const ownerDecision =
    input.decision ===
      "modify"
      ? "modified"
      : "approved"

  /**
   * -------------------------------------------------------
   * APPROVE / MODIFY NEGOTIATION
   * -------------------------------------------------------
   */
  const updated =
    await query<{
      id: string
      request_id: string
      client_id: string
      status: string
      owner_approver_id: string
      owner_decision: string
      revised_quote_amount: number
      owner_decision_notes: string | null
      decided_at: string
      created_at: string
      updated_at: string
    }>(
      `
        UPDATE quote_negotiations
        SET
          status =
            'approved',

          owner_approver_id =
            $2,

          owner_decision =
            $3,

          revised_quote_amount =
            $4,

          owner_decision_notes =
            $5,

          decided_at =
            NOW(),

          updated_at =
            NOW()

        WHERE id = $1

        RETURNING
          id,
          request_id,
          client_id,
          status,
          owner_approver_id,
          owner_decision,
          revised_quote_amount,
          owner_decision_notes,
          decided_at,
          created_at,
          updated_at
      `,
      [
        input.negotiationId,

        input.superAdminId,

        ownerDecision,

        normalizedFinalAmount,

        input.notes?.trim() ||
          null,
      ],
    )

  /**
   * -------------------------------------------------------
   * UPDATE ACTUAL CLIENT-FACING QUOTE
   * -------------------------------------------------------
   *
   * ONLY Super Administrator approval modifies
   * the actual quote shown to the client.
   */
  await query(
    `
      UPDATE requests
      SET
        status =
          'revised_quote_sent',

        final_price =
          $2,

        approved_quote_amount =
          $2,

        approved_quote_currency =
          $3,

        super_admin_reviewed_by =
          $4,

        super_admin_reviewed_at =
          NOW(),

        quote_sent_at =
          NOW(),

        client_decision_at =
          NULL,

        updated_at =
          NOW()

      WHERE id = $1
    `,
    [
      current.request_id,

      normalizedFinalAmount,

      negotiationCurrency,

      input.superAdminId,
    ],
  )

  /**
   * -------------------------------------------------------
   * AUDIT
   * -------------------------------------------------------
   *
   * Internal only.
   */
  await recordRequestAudit(
    current.request_id,
    input.superAdminId,
    "super_admin_approved_revised_quote",
    {
      negotiation_id:
        input.negotiationId,

      final_amount:
        normalizedFinalAmount,

      decision:
        input.decision,

      notes:
        input.notes?.trim() ||
        null,

      currency:
        negotiationCurrency,
    },
  )

  /**
   * -------------------------------------------------------
   * NOTIFY CLIENT
   * -------------------------------------------------------
   *
   * Client receives only the fact that
   * a revised quote is ready.
   *
   * No:
   * - AI estimate
   * - administrator amount
   * - administrator reasoning
   * - Super Administrator reasoning
   */
  const requestOwner =
    await query<{
      user_id: string | null
    }>(
      `
        SELECT
          user_id
        FROM requests
        WHERE id = $1
        LIMIT 1
      `,
      [current.request_id],
    )

  const userId =
    requestOwner.rows[0]
      ?.user_id

  if (userId) {
    await notifyUser(
      userId,
      {
        type:
          "quote_ready",

        title:
          "Revised quote ready",

        message:
          "Your revised investigation quote is ready for review.",

        metadata: {
          request_id:
            current.request_id,

          negotiation_id:
            input.negotiationId,

          target_page:
            "client_quote_review",

          action:
            "review_quote",
        },
      },
    )
  }

  /**
   * -------------------------------------------------------
   * SAFE ADMIN/SUPER ADMIN RESPONSE
   * -------------------------------------------------------
   *
   * Do not return:
   * - original_ai_estimate
   * - original quote internals
   * - hidden pricing calculations
   */
  return updated.rows[0]
}