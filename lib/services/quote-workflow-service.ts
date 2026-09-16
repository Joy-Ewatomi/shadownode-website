import {
  type DatabasePoolClient,
  query,
  withTransaction,
} from "@/lib/db"

import {
  notifyAdmins,
  notifySuperAdmins,
  notifyUser,
} from "@/lib/services/notification-service"

import {
  convertCurrency,
} from "@/lib/services/currency-service"

type AdminQuoteReviewAction =
  | "adjust"
  | "submit"

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function normalizeCurrency(
  value: string | null | undefined,
): string {
  const currency =
    String(value ?? "")
      .trim()
      .toUpperCase()

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(
      "A valid three-letter currency code is required",
    )
  }

  return currency
}

function normalizeDate(
  value: string | null | undefined,
  fieldName: string,
): string | null {
  if (!value) {
    return null
  }

  const date =
    String(value)
      .trim()
      .slice(0, 10)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(
      `${fieldName} must be a valid date (YYYY-MM-DD)`,
    )
  }

  return date
}



function validatePositiveAmount(
  value: number | null | undefined,
  fieldName: string,
): number {
  const amount = Number(value)

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      `${fieldName} must be greater than zero`,
    )
  }

  return amount
}

function isAdministratorRole(
  role: string | null | undefined,
): boolean {
  return role === "administrator"
}

function isSuperAdministratorRole(
  role: string | null | undefined,
): boolean {
  return (
    role === "super-administrator" ||
    role === "super_administrator"
  )
}

function isAdminQuoteReviewableStatus(
  status: string | null | undefined,
): boolean {
  return new Set([
    "pending_admin_review",
    "negotiation_requested",
    "negotiating",
    "under_negotiation",
  ]).has(
    String(status ?? "").trim().toLowerCase(),
  )
}



/**
 * =========================================================
 * REQUEST AUDIT
 * =========================================================
 *
 * Records an internal audit event.
 *
 * Audit information is internal and must never be returned
 * directly to clients.
 */
export async function recordRequestAudit(
  requestId: string,
  actorUserId: string | null,
  action: string,
  details: Record<string, unknown> = {},
  executor: Pick<DatabasePoolClient, "query"> = { query },
  options: { strict?: boolean } = {},
) {
  try {
    await executor.query(
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
    )
  } catch (error) {
    console.error(
      "AUDIT ERROR",
      error,
    )
    if (options.strict) throw error
  }
}

/**
 * =========================================================
 * SEND APPROVED QUOTE
 * =========================================================
 *
 * Sends the final client-facing quote.
 *
 * ONLY a Super Administrator may perform this action.
 *
 * Internal information such as:
 * - AI estimate
 * - administrator reasoning
 * - administrator notes
 * - internal adjustments
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
  estimated_start?: string | null
  estimated_completion?: string | null
}) {
  /**
   * -------------------------------------------------------
   * VERIFY SUPER ADMINISTRATOR
   * -------------------------------------------------------
   */
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
    throw new Error(
      "Administrator account not found",
    )
  }

  if (actor.status !== "active") {
    throw new Error(
      "Administrator account is not active",
    )
  }

  if (!isSuperAdministratorRole(actor.role)) {
    throw new Error(
      "Only a Super Administrator can send the final quote",
    )
  }

  /**
   * -------------------------------------------------------
   * VALIDATE AMOUNT
   * -------------------------------------------------------
   */
  const suppliedAmount =
    validatePositiveAmount(
      input.amount,
      "Quote amount",
    )

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
    status: string | null
  }>(
    `
      SELECT
        user_id,
        client_email,
        title,
        preferred_currency,
        status
      FROM requests
      WHERE id = $1
      LIMIT 1
    `,
    [input.requestId],
  )

  const request = requestResult.rows[0]


if (!request) {
  throw new Error(
    "Request not found",
  )
}

  /**
   * -------------------------------------------------------
   * VERIFY REQUEST STATE
   * -------------------------------------------------------
   */
  if (
    request.status !==
    "pending_super_admin_review"
  ) {
    throw new Error(
      "Request is not awaiting Super Administrator quote approval",
    )
  }

  /**
   * -------------------------------------------------------
   * CLIENT CURRENCY
   * -------------------------------------------------------
   */
  const clientCurrency =
    normalizeCurrency(
      request.preferred_currency,
    )

  /**
   * -------------------------------------------------------
   * QUOTE CURRENCY
   * -------------------------------------------------------
   *
   * The supplied amount is assumed to be in the supplied
   * quote currency.
   *
   * If no quote currency is supplied, USD is used.
   */
  const quoteCurrency =
    input.currency?.trim().toUpperCase() ||
    "USD"

  if (!/^[A-Z]{3}$/.test(quoteCurrency)) {
    throw new Error(
      "A valid three-letter quote currency is required",
    )
  }

  /**
   * -------------------------------------------------------
   * CONVERT QUOTE → CLIENT CURRENCY
   * -------------------------------------------------------
   */
  let clientAmount =
    suppliedAmount

  let exchangeRate = 1

  if (
    quoteCurrency !==
    clientCurrency
  ) {
    try {
      const converted =
        await convertCurrency({
          amount: suppliedAmount,
          from: quoteCurrency,
          to: clientCurrency,
        })

      clientAmount =
        Number(converted.amount)

      exchangeRate =
        Number(converted.rate)

      if (
        !Number.isFinite(clientAmount) ||
        clientAmount <= 0
      ) {
        throw new Error(
          "Currency conversion returned an invalid amount",
        )
      }

      if (
        !Number.isFinite(exchangeRate) ||
        exchangeRate <= 0
      ) {
        throw new Error(
          "Currency conversion returned an invalid exchange rate",
        )
      }
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
   * ESTIMATED DATES
   * -------------------------------------------------------
   */
  const estimatedStart =
    normalizeDate(
      input.estimated_start,
      "Estimated start",
    )

  const estimatedCompletion =
    normalizeDate(
      input.estimated_completion,
      "Estimated completion",
    )

  /**
   * Prevent an impossible date range.
   */
  if (
    estimatedStart &&
    estimatedCompletion &&
    estimatedCompletion <
      estimatedStart
  ) {
    throw new Error(
      "Estimated completion cannot be earlier than estimated start",
    )
  }

  /**
   * -------------------------------------------------------
   * SAVE FINAL QUOTE
   * -------------------------------------------------------
   *
   * The UPDATE itself is conditional on the workflow state,
   * preventing two Super Administrators from sending the
   * same quote simultaneously.
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
          $5::date,

        approved_estimated_completion =
          $6::date,

        approved_quote_notes =
          $4,

        super_admin_reviewed_by =
          $7,

        super_admin_reviewed_at =
          NOW(),

        quote_exchange_rate =
          $8::numeric,

        quote_base_currency =
          $9,

        quote_currency_converted_at =
          NOW(),

        quote_sent_at =
          NOW(),

        updated_at =
          NOW()

      WHERE id = $1
        AND status =
          'pending_super_admin_review'

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
      input.notes?.trim() || null,
      estimatedStart,
      estimatedCompletion,
      input.actorUserId,
      exchangeRate,
      quoteCurrency,
    ],
  )

  const row = updated.rows[0]

  if (!row) {
    throw new Error(
      "Request is no longer awaiting Super Administrator quote approval",
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
        suppliedAmount,

      client_currency:
        clientCurrency,

      client_amount:
        clientAmount,

      exchange_rate:
        exchangeRate,

      estimated_start:
        estimatedStart,

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
        type:
          "quote_available",

        title:
          "Quote ready",

        message:
          "Your investigation quote is ready for review.",

        metadata: {
          request_id:
            input.requestId,
          resource_type:
            "request",
          resource_id:
            input.requestId,

          target_page:
            "client_quote_review",

          action:
            "review_quote",
        },
      },
    ).catch((error) => {
      console.error(
        "CLIENT QUOTE NOTIFICATION ERROR",
        error,
      )
    })
  }

  /**
   * -------------------------------------------------------
   * SAFE RESPONSE
   * -------------------------------------------------------
   */
  return {
    id:
      row.id,

    user_id:
      row.user_id,

    client_email:
      row.client_email,

    title:
      row.title,

    status:
      row.status,

    approved_quote_amount:
      row.approved_quote_amount,

    approved_quote_currency:
      row.approved_quote_currency,

    approved_quote_notes:
      row.approved_quote_notes,

    approved_estimated_start:
      row.approved_estimated_start,

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
 * WORKFLOW:
 *
 * Administrator
 *      ↓
 * reviewQuoteAsAdmin()
 *      ↓
 * pending_super_admin_review
 *      ↓
 * Super Administrator
 *      ↓
 * sendQuote()
 *
 * Administrator NEVER sends the quote directly to the
 * client.
 */
export async function reviewQuoteAsAdmin(input: {
  requestId: string
  actorUserId: string
  actorRole: string

  decision_source?:
    | "admin"
    | "ai"
    | "adjust"
    | null

  action: AdminQuoteReviewAction

  amount?: number | null
  currency?: string | null
  notes?: string | null
  reason: string

  estimated_start?: string | null
  estimated_completion?: string | null
}) {
  if (!input.actorUserId) {
    throw new Error(
      "Administrator user id is required",
    )
  }

  /**
   * -------------------------------------------------------
   * VERIFY ADMINISTRATOR
   * -------------------------------------------------------
   */
  const administrator =
    await query<{
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

  const actor =
    administrator.rows[0]

  if (!actor) {
    throw new Error(
      "Administrator account not found",
    )
  }

  if (actor.status !== "active") {
    throw new Error(
      "Administrator account is not active",
    )
  }

  if (!isAdministratorRole(actor.role)) {
    throw new Error(
      "Only an Administrator can submit a quote for Super Administrator review",
    )
  }

  /**
   * -------------------------------------------------------
   * ROLE CROSS-CHECK
   * -------------------------------------------------------
   *
   * The database remains authoritative.
   */
  if (
    input.actorRole &&
    input.actorRole !==
      "administrator"
  ) {
    throw new Error(
      "Invalid administrator role",
    )
  }

  /**
   * -------------------------------------------------------
   * VALIDATE ACTION
   * -------------------------------------------------------
   */
  if (
    input.action !== "adjust" &&
    input.action !== "submit"
  ) {
    throw new Error(
      "Invalid administrator quote action",
    )
  }

  /**
   * -------------------------------------------------------
   * VALIDATE AMOUNT
   * -------------------------------------------------------
   */
  const amount =
    validatePositiveAmount(
      input.amount,
      "Quote amount",
    )

  /**
   * -------------------------------------------------------
   * VALIDATE CURRENCY
   * -------------------------------------------------------
   */
  const currency =
    normalizeCurrency(
      input.currency,
    )

  /**
   * -------------------------------------------------------
   * VALIDATE REASON
   * -------------------------------------------------------
   */
  const reason =
    String(
      input.reason ||
        input.notes ||
        "",
    ).trim()

  if (!reason) {
    throw new Error(
      "A reason or administrator note is required",
    )
  }

  /**
   * -------------------------------------------------------
   * VALIDATE DATES
   * -------------------------------------------------------
   */
  const estimatedStart =
    normalizeDate(
      input.estimated_start,
      "Estimated start",
    )

  const estimatedCompletion =
    normalizeDate(
      input.estimated_completion,
      "Estimated completion",
    )

  if (
    estimatedStart &&
    estimatedCompletion &&
    estimatedCompletion <
      estimatedStart
  ) {
    throw new Error(
      "Estimated completion cannot be earlier than estimated start",
    )
  }


  
  /**
   * -------------------------------------------------------
   * GET REQUEST
   * -------------------------------------------------------
   *
   * This preliminary read is informational only.
   * The transaction below performs the authoritative lock
   * and state check.
   */
  const requestResult =
    await query<{
      id: string
      user_id: string | null
      title: string | null
      status: string | null
      preferred_currency: string | null
    }>(
      `
        SELECT
          id,
          user_id,
          title,
          status,
          preferred_currency
        FROM requests
        WHERE id = $1
        LIMIT 1
      `,
      [input.requestId],
    )

  const request =
    requestResult.rows[0]

  if (!request) {
    throw new Error(
      "Request not found",
    )
  }

  /**
   * -------------------------------------------------------
   * CREATE VERSION + MOVE REQUEST
   * -------------------------------------------------------
   *
   * Quote version creation and request transition are
   * atomic.
   */
  const transactionResult =
    await withTransaction(
      async (client) => {
        /**
         * Lock request first.
         */
        const lockedRequest =
          await client.query<{
            id: string
            status: string | null
          }>(
            `
              SELECT
                id,
                status
              FROM requests
              WHERE id = $1
              FOR UPDATE
            `,
            [input.requestId],
          )

        const locked =
          lockedRequest.rows[0]

        if (!locked) {
          throw new Error(
            "Request not found",
          )
        }
if (
  !isAdminQuoteReviewableStatus(
    locked.status,
  )
) {
  throw new Error(
    "This request is not currently available for Administrator action",
  )
}

        /**
         * ---------------------------------------------------
         * PREVIOUS QUOTE
         * ---------------------------------------------------
         */
        const previousVersion =
          await client.query<{
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
          previousVersion.rows[0]
            ?.price ?? null

        /**
         * ---------------------------------------------------
         * NEXT VERSION NUMBER
         * ---------------------------------------------------
         */
        const nextVersion =
          await client.query<{
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
            nextVersion.rows[0]
              ?.next_version || 1,
          )

        const priceDifference =
          previousPrice !== null
            ? amount -
              Number(previousPrice)
            : null

        /**
         * ---------------------------------------------------
         * CREATE QUOTE VERSION
         * ---------------------------------------------------
         */
        const version =
          await client.query<{
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
                estimated_start,
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
                $13,
                $14
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
              estimatedStart,
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

        /**
         * ---------------------------------------------------
         * MOVE REQUEST TO SUPER ADMIN REVIEW
         * ---------------------------------------------------
         */
        const updated =
          await client.query<{
            id: string
            user_id: string | null
            title: string | null
            status: string
            approved_quote_amount: number
            approved_quote_currency: string
            approved_quote_notes: string | null
            approved_estimated_start: string | null
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

                approved_estimated_start =
                  $5::date,

                approved_estimated_completion =
                  $6::date,

                admin_quote_action =
                  $7,

                admin_quote_notes =
                  $4,

                admin_reviewed_by =
                  $8,

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
                title,
                status,
                approved_quote_amount,
                approved_quote_currency,
                approved_quote_notes,
                approved_estimated_start,
                approved_estimated_completion,
                admin_quote_action,
                admin_quote_notes
            `,
            [
              input.requestId,
              amount,
              currency,
              reason,
              estimatedStart,
              estimatedCompletion,
              input.action,
              input.actorUserId,
            ],
          )

        const row =
          updated.rows[0]

        if (!row) {
          throw new Error(
            "Request changed state before the administrator proposal could be submitted",
          )
        }

        return {
          row,
          quoteVersionId,
        }
      },
    )

  const row =
    transactionResult.row

  const quoteVersionId =
    transactionResult.quoteVersionId

  /**
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

    estimated_start: estimatedStart,

    estimated_completion: estimatedCompletion,

    quote_version_id: quoteVersionId,

    decision_source:
      input.decision_source,
  },
)

  /**
   * -------------------------------------------------------
   * NOTIFY SUPER ADMIN
   * -------------------------------------------------------
   */
  await notifySuperAdmins({
    type:
      "quote_pending_super_admin_review",

    title:
      input.action === "adjust"
        ? "Adjusted quote requires review"
        : "Quote requires Super Administrator review",

    message:
      row.title ||
      "An administrator has submitted a quote for review.",

    metadata: {
      request_id:
        input.requestId,

      quote_version_id:
        quoteVersionId,

      target_page:
        "super_admin_quote_review",

      action:
        "review_quote",
    },
  }).catch((error) => {
    console.error(
      "SUPER ADMIN QUOTE NOTIFICATION ERROR",
      error,
    )
  })

  /**
   * -------------------------------------------------------
   * SAFE RESPONSE
   * -------------------------------------------------------
   */
  return {
    id:
      row.id,

    user_id:
      row.user_id,

    title:
      row.title,

    status:
      row.status,

    approved_quote_amount:
      row.approved_quote_amount,

    approved_quote_currency:
      row.approved_quote_currency,

    approved_quote_notes:
      row.approved_quote_notes,

    approved_estimated_start:
      row.approved_estimated_start,

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
 *
 * Only an active Administrator or Super Administrator may
 * reject a request.
 */
export async function declineRequest(
  requestId: string,
  actorUserId: string,
  reason?: string | null,
) {
  if (!actorUserId) {
    throw new Error(
      "Actor user id is required",
    )
  }

  /**
   * -------------------------------------------------------
   * VERIFY ACTOR
   * -------------------------------------------------------
   */
  const actorResult =
    await query<{
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
      [actorUserId],
    )

  const actor =
    actorResult.rows[0]

  if (!actor) {
    throw new Error(
      "Administrator account not found",
    )
  }

  if (actor.status !== "active") {
    throw new Error(
      "Administrator account is not active",
    )
  }

  if (
    !isAdministratorRole(actor.role) &&
    !isSuperAdministratorRole(
      actor.role,
    )
  ) {
    throw new Error(
      "Only an Administrator or Super Administrator can reject a request",
    )
  }

  /**
   * -------------------------------------------------------
   * CLEAN REASON
   * -------------------------------------------------------
   */
  const cleanReason =
    reason?.trim() || null

  /**
   * -------------------------------------------------------
   * REJECT REQUEST
   * -------------------------------------------------------
   *
   * The status condition makes the write atomic.
   */
  const updated =
    await query<{
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
          status =
            'rejected',

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
          AND status NOT IN (
            'quote_sent',
            'revised_quote_sent',
            'client_decision_pending',
            'completed',
            'cancelled',
            'rejected'
          )

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

  const row =
    updated.rows[0]

  if (!row) {
    /**
     * Distinguish missing request from a request that changed
     * state.
     */
    const exists =
      await query<{
        id: string
      }>(
        `
          SELECT id
          FROM requests
          WHERE id = $1
          LIMIT 1
        `,
        [requestId],
      )

    if (!exists.rows[0]) {
      throw new Error(
        "Request not found",
      )
    }

    throw new Error(
      "Request changed state before it could be rejected",
    )
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
          "request_declined",

        title:
          "Request rejected",

        message:
          "Your investigation request was rejected.",

        metadata: {
          request_id:
            requestId,
          resource_type:
            "request",
          resource_id:
            requestId,

          target_page:
            "client_quote_review",

          action:
            "view_request",
        },
      },
    ).catch((error) => {
      console.error(
        "CLIENT REJECTION NOTIFICATION ERROR",
        error,
      )
    })
  }

  return row
}

/**
 * =========================================================
 * CREATE NEXT QUOTE VERSION
 * =========================================================
 *
 * Quote versions are immutable.
 *
 * Every new workflow participant creates the next version.
 */
async function createNextQuoteVersion(
  client: DatabasePoolClient,
  input: {
    requestId: string
    createdBy: string
    creatorRole: string
    source: string
    price: number
    currency: string
    estimatedStart?: string | null
    estimatedCompletion?: string | null
    notes?: string | null
    reasoning?: string | null
    status: string
    previousPrice?: number | null
  },
) {
  const nextVersionResult =
    await client.query<{
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
      nextVersionResult.rows[0]
        ?.next_version || 1,
    )

  const previousPrice =
    input.previousPrice ?? null

  const priceDifference =
    previousPrice !== null
      ? input.price -
        Number(previousPrice)
      : null

  const inserted =
    await client.query<{
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
          estimated_start,
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
          $13,
          $14
        )
        RETURNING id
      `,
      [
        input.requestId,
        versionNumber,
        input.createdBy,
        input.creatorRole,
        input.source,
        input.price,
        input.currency,
        input.estimatedStart ?? null,
        input.estimatedCompletion ?? null,
        input.notes ?? null,
        input.reasoning ?? null,
        input.status,
        previousPrice,
        priceDifference,
      ],
    )

  const versionId =
    inserted.rows[0]?.id

  if (!versionId) {
    throw new Error(
      "Failed to create quote version",
    )
  }

  return {
    id: versionId,
    versionNumber,
  }
}

/**
 * =========================================================
 * CLIENT REQUESTS QUOTE REVIEW
 * =========================================================
 *
 * Creates the client negotiation request.
 *
 * VERSION FLOW:
 *
 * V1 = AI
 * V2 = Administrator
 * V3 = Super Administrator
 * V4 = Client negotiation request
 *
 * IMPORTANT:
 *
 * Version 4 is an immutable historical record of what the
 * CLIENT requested during negotiation.
 *
 * It does not expose or alter the internal AI quote.
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
  /*
   * -------------------------------------------------------
   * VALIDATE BUDGET
   * -------------------------------------------------------
   */

  const requestedBudget =
    validatePositiveAmount(
      input.requestedBudget,
      "Requested budget",
    )

  /*
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

  /*
   * -------------------------------------------------------
   * VALIDATE CURRENCY
   * -------------------------------------------------------
   */

  const clientCurrency =
    normalizeCurrency(
      input.currency,
    )

  /*
   * -------------------------------------------------------
   * CREATE NEGOTIATION + V4
   * -------------------------------------------------------
   */

  const result =
    await withTransaction(
      async (client) => {
        /*
         * ---------------------------------------------------
         * LOCK REQUEST
         * ---------------------------------------------------
         */

        const lockedRequest =
          await client.query<{
            ai_price_estimate:
              | number
              | null

            approved_quote_amount:
              | number
              | null

            approved_quote_currency:
              | string
              | null

            approved_estimated_completion:
              | string
              | null

            preferred_currency:
              | string
              | null

            status:
              | string
              | null

            user_id:
              | string
              | null
          }>(
            `
              SELECT
                ai_price_estimate,
                approved_quote_amount,
                approved_quote_currency,
                approved_estimated_completion,
                preferred_currency,
                status,
                user_id

              FROM requests

              WHERE id = $1
                AND user_id = $2

              FOR UPDATE
            `,
            [
              input.requestId,
              input.clientId,
            ],
          )

        const request =
          lockedRequest.rows[0]

        if (!request) {
          throw new Error(
            "Request not found",
          )
        }

        /*
         * ---------------------------------------------------
         * VALID CLIENT STATE
         * ---------------------------------------------------
         */

        if (
          request.status !==
            "quote_sent" &&
          request.status !==
            "revised_quote_sent"
        ) {
          throw new Error(
            "This request does not currently have a quote available for review",
          )
        }

        /*
         * ---------------------------------------------------
         * VERIFY CLIENT CURRENCY
         * ---------------------------------------------------
         */

        const requestCurrency =
          normalizeCurrency(
            request.preferred_currency,
          )

        if (
          clientCurrency !==
          requestCurrency
        ) {
          throw new Error(
            `Negotiation must use the client's currency (${requestCurrency})`,
          )
        }

        /*
         * ---------------------------------------------------
         * PREVENT DUPLICATE NEGOTIATION
         * ---------------------------------------------------
         */

        const existingNegotiation =
          await client.query<{
            id: string
          }>(
            `
              SELECT
                id
              FROM quote_negotiations
              WHERE request_id = $1
              LIMIT 1
            `,
            [input.requestId],
          )

        if (
          existingNegotiation.rows[0]
        ) {
          throw new Error(
            "This quote has already been negotiated and cannot be negotiated again",
          )
        }

        /*
         * ---------------------------------------------------
         * CURRENT CLIENT QUOTE
         * ---------------------------------------------------
         */

        const currentQuote =
          Number(
            request.approved_quote_amount,
          )

        if (
          request.approved_quote_amount ===
            null ||
          !Number.isFinite(
            currentQuote,
          ) ||
          currentQuote <= 0
        ) {
          throw new Error(
            "There is no valid quote available for review",
          )
        }

        /*
         * ---------------------------------------------------
         * VERIFY CURRENT QUOTE CURRENCY
         * ---------------------------------------------------
         */

        const approvedCurrency =
          normalizeCurrency(
            request.approved_quote_currency,
          )

        if (
          approvedCurrency !==
          requestCurrency
        ) {
          throw new Error(
            "The current quote currency does not match the client's currency",
          )
        }

        /*
         * ---------------------------------------------------
         * FIND ADMINISTRATOR
         * ---------------------------------------------------
         */

        const reviewer =
          await client.query<{
            id: string
          }>(
            `
              SELECT
                id
              FROM app_users

              WHERE role =
                'administrator'

                AND status =
                  'active'

              ORDER BY
                created_at ASC

              LIMIT 1
            `,
          )

        /*
         * ---------------------------------------------------
         * NEXT NEGOTIATION ROUND
         * ---------------------------------------------------
         */

        const roundResult =
          await client.query<{
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
            roundResult.rows[0]
              ?.next_round || 1,
          )

        /*
         * ---------------------------------------------------
         * CREATE VERSION 4
         * ---------------------------------------------------
         *
         * This is the client's requested negotiated quote.
         *
         * It records:
         *
         * - requested budget
         * - client currency
         * - client reason
         * - client notes
         *
         * It does NOT expose AI internals.
         */

        const clientQuoteVersion =
          await createNextQuoteVersion(
            client,
            {
              requestId:
                input.requestId,

              createdBy:
                input.clientId,

              creatorRole:
                "client",

              source:
                "client_negotiation",

              price:
                requestedBudget,

              currency:
                clientCurrency,

              estimatedStart:
                null,

              estimatedCompletion:
                request
                  .approved_estimated_completion
                  ?.toString()
                  .slice(0, 10) ||
                null,

              notes:
                input.notes?.trim() ||
                null,

              reasoning:
                cleanReason,

              status:
                "pending_admin_review",

              previousPrice:
                currentQuote,
            },
          )

        /*
         * ---------------------------------------------------
         * CREATE NEGOTIATION
         * ---------------------------------------------------
         */

        const inserted =
          await client.query<{
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

              request.ai_price_estimate ??
                null,

              currentQuote,

              clientCurrency,

              requestedBudget,

              cleanReason,

              input.notes?.trim() ||
                null,
            ],
          )

        const createdNegotiation =
          inserted.rows[0]

        if (!createdNegotiation) {
          throw new Error(
            "Failed to create quote review request",
          )
        }

        /*
         * ---------------------------------------------------
         * MOVE REQUEST
         * ---------------------------------------------------
         */

        const requestUpdated =
          await client.query(
            `
              UPDATE requests

              SET
                status =
                  'negotiation_requested',

                client_decision_at =
                  NOW(),

                updated_at =
                  NOW()

              WHERE id = $1
                AND user_id = $2
                AND status IN (
                  'quote_sent',
                  'revised_quote_sent'
                )
            `,
            [
              input.requestId,
              input.clientId,
            ],
          )

        if (
          requestUpdated.rowCount !==
          1
        ) {
          throw new Error(
            "Request changed state before negotiation could be created",
          )
        }

        return {
          negotiation:
            createdNegotiation,

          quoteVersionId:
            clientQuoteVersion.id,
        }
      },
    )

  const negotiation =
    result.negotiation

  /*
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

      quote_version_id:
        result.quoteVersionId,

      requested_budget:
        requestedBudget,

      currency:
        clientCurrency,

      reason:
        cleanReason,

      round:
        negotiation.round_number,
    },
  )

  /*
   * -------------------------------------------------------
   * NOTIFY ADMINISTRATORS
   * -------------------------------------------------------
   */

  await notifyAdmins({
    type:
      "quote_negotiation_requested",

    title:
      "Client requested quote review",

    message:
      "A client has requested a review of their investigation quote.",

    metadata: {
      request_id:
        input.requestId,
      resource_type:
        "request",
      resource_id:
        input.requestId,
      audience:
        "administrator",

      negotiation_id:
        negotiation.id,

      quote_version_id:
        result.quoteVersionId,

      target_page:
        "administrator_negotiation_review",

      action:
        "review_negotiation",
    },
  }).catch((error) => {
    console.error(
      "ADMIN NEGOTIATION NOTIFICATION ERROR",
      error,
    )
  })

  /*
   * -------------------------------------------------------
   * SAFE CLIENT RESPONSE
   * -------------------------------------------------------
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

    quote_version_id:
      result.quoteVersionId,
  }
}

/**
 * =========================================================
 * ADMINISTRATOR REVIEWS NEGOTIATION
 * =========================================================
 *
 * VERSION FLOW:
 *
 * V4 = Client negotiation request
 *          ↓
 * V5 = Administrator proposal
 *          ↓
 * V6 = Super Administrator final decision
 *
 * The Administrator does NOT make the final decision.
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
  /*
   * -------------------------------------------------------
   * VERIFY ADMINISTRATOR
   * -------------------------------------------------------
   */

  const administrator =
    await query<{
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
      [input.administratorId],
    )

  const actor =
    administrator.rows[0]

  if (!actor) {
    throw new Error(
      "Administrator account not found",
    )
  }

  if (actor.status !== "active") {
    throw new Error(
      "Administrator account is not active",
    )
  }

  if (
    !isAdministratorRole(
      actor.role,
    )
  ) {
    throw new Error(
      "Only an Administrator can submit a negotiation recommendation",
    )
  }

  /*
   * -------------------------------------------------------
   * RECOMMENDATION
   * -------------------------------------------------------
   */

  const recommendation =
    input.recommendation?.trim()

  if (!recommendation) {
    throw new Error(
      "Administrator recommendation is required",
    )
  }

  /*
   * -------------------------------------------------------
   * OPTIONAL ADMIN PROPOSAL AMOUNT
   * -------------------------------------------------------
   *
   * If the Administrator does not supply a different
   * amount, use the client's Version 4 requested budget.
   */

  let revisedQuoteAmount:
    number | null = null

  if (
    input.revisedQuoteAmount !==
      null &&
    input.revisedQuoteAmount !==
      undefined
  ) {
    revisedQuoteAmount =
      validatePositiveAmount(
        input.revisedQuoteAmount,
        "Administrator quote amount",
      )
  }

  /*
   * -------------------------------------------------------
   * LOAD NEGOTIATION
   * -------------------------------------------------------
   */

  const negotiation =
    await query<{
      id: string
      request_id: string
      client_id: string
      status: string
      requested_budget: number | null
      quote_currency: string | null
      assigned_reviewer_id: string | null
      request_status: string | null
    }>(
      `
        SELECT
          qn.id,
          qn.request_id,
          qn.client_id,
          qn.status,
          qn.requested_budget,
          qn.quote_currency,
          qn.assigned_reviewer_id,
          r.status AS request_status

        FROM quote_negotiations qn

        INNER JOIN requests r
          ON r.id = qn.request_id

        WHERE qn.id = $1

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

  /*
   * -------------------------------------------------------
   * VERIFY ASSIGNED ADMINISTRATOR
   * -------------------------------------------------------
   */

  if (
    current.assigned_reviewer_id &&
    current.assigned_reviewer_id !==
      input.administratorId
  ) {
    throw new Error(
      "This negotiation is assigned to another Administrator",
    )
  }

  /*
   * -------------------------------------------------------
   * NEGOTIATION STATE
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

  /*
   * -------------------------------------------------------
   * REQUEST STATE
   * -------------------------------------------------------
   */

  if (
    current.request_status !==
      "negotiation_requested" &&
    current.request_status !==
      "pending_super_admin_review"
  ) {
    throw new Error(
      "The parent request is not in a valid negotiation workflow state",
    )
  }

  /*
   * -------------------------------------------------------
   * CURRENCY
   * -------------------------------------------------------
   */

  const negotiationCurrency =
    normalizeCurrency(
      current.quote_currency,
    )

  /*
   * -------------------------------------------------------
   * FINAL ADMINISTRATOR AMOUNT
   * -------------------------------------------------------
   *
   * Version 4 requested budget is the default.
   */

  const adminAmount =
    revisedQuoteAmount ??
    Number(
      current.requested_budget,
    )

  if (
    !Number.isFinite(
      adminAmount,
    ) ||
    adminAmount <= 0
  ) {
    throw new Error(
      "No valid administrator quote amount is available",
    )
  }

  /*
   * -------------------------------------------------------
   * TRANSACTION
   * -------------------------------------------------------
   */

  const transactionResult =
    await withTransaction(
      async (client) => {
        /*
         * LOCK NEGOTIATION
         */

        const locked =
          await client.query<{
            id: string
            request_id: string
            status: string
            assigned_reviewer_id:
              | string
              | null
          }>(
            `
              SELECT
                id,
                request_id,
                status,
                assigned_reviewer_id

              FROM quote_negotiations

              WHERE id = $1

              FOR UPDATE
            `,
            [input.negotiationId],
          )

        const lockedNegotiation =
          locked.rows[0]

        if (!lockedNegotiation) {
          throw new Error(
            "Negotiation not found",
          )
        }

        if (
          lockedNegotiation.assigned_reviewer_id &&
          lockedNegotiation.assigned_reviewer_id !==
            input.administratorId
        ) {
          throw new Error(
            "This negotiation is assigned to another Administrator",
          )
        }

        if (
          lockedNegotiation.status !==
            "requested" &&
          lockedNegotiation.status !==
            "reviewing"
        ) {
          throw new Error(
            "Negotiation changed state before the administrator proposal could be submitted",
          )
        }

        /*
         * ---------------------------------------------------
         * GET PREVIOUS VERSION PRICE
         * ---------------------------------------------------
         */

        const previousQuote =
          await client.query<{
            price: number | null
          }>(
            `
              SELECT
                price

              FROM quote_versions

              WHERE request_id = $1

              ORDER BY
                version_number DESC

              LIMIT 1
            `,
            [current.request_id],
          )

        const previousPrice =
          previousQuote.rows[0]
            ?.price ?? null

        /*
         * ---------------------------------------------------
         * CREATE VERSION 5
         * ---------------------------------------------------
         */

        const adminQuoteVersion =
          await createNextQuoteVersion(
            client,
            {
              requestId:
                current.request_id,

              createdBy:
                input.administratorId,

              creatorRole:
                "administrator",

              source:
                "administrator_proposal",

              price:
                adminAmount,

              currency:
                negotiationCurrency,

              estimatedStart:
                null,

              estimatedCompletion:
                null,

              notes:
                input.notes?.trim() ||
                null,

              reasoning:
                recommendation,

              status: "reviewing",

              previousPrice:
                previousPrice !== null
                  ? Number(
                      previousPrice,
                    )
                  : null,
            },
          )

        /*
         * ---------------------------------------------------
         * UPDATE NEGOTIATION
         * ---------------------------------------------------
         */

        const updated =
          await client.query<{
            id: string
            request_id: string
            client_id: string
            assigned_reviewer_id:
              | string
              | null
            round_number: number
            status: string
            administrator_recommendation:
              | string
              | null
            revised_quote_amount:
              | number
              | null
            owner_decision_notes:
              | string
              | null
            created_at: string
            updated_at: string
          }>(
            `
              UPDATE quote_negotiations

              SET
                assigned_reviewer_id =
                  COALESCE(
                    assigned_reviewer_id,
                    $2
                  ),

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

                AND status IN (
                  'requested',
                  'reviewing'
                )

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

              adminAmount,

              input.notes?.trim() ||
                null,
            ],
          )

        const updatedNegotiation =
          updated.rows[0]

        if (!updatedNegotiation) {
          throw new Error(
            "Negotiation changed state before the administrator proposal could be submitted",
          )
        }

        /*
         * ---------------------------------------------------
         * MOVE REQUEST TO SUPER ADMIN REVIEW
         * ---------------------------------------------------
         */

        const requestUpdated =
          await client.query(
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

                admin_quote_action =
                  'submitted_for_super_admin_review',

                admin_quote_notes =
                  $4,

                admin_reviewed_by =
                  $5,

                admin_reviewed_at =
                  NOW(),

                updated_at =
                  NOW()

              WHERE id = $1

                AND status IN (
                  'negotiation_requested',
                  'pending_super_admin_review'
                )
            `,
            [
              current.request_id,

              adminAmount,

              negotiationCurrency,

              recommendation,

              input.administratorId,
            ],
          )

        if (
          requestUpdated.rowCount !==
          1
        ) {
          throw new Error(
            "Parent request changed state before Super Administrator review could be requested",
          )
        }

        return {
          negotiation:
            updatedNegotiation,

          quoteVersionId:
            adminQuoteVersion.id,
        }
      },
    )

  const updatedNegotiation =
    transactionResult.negotiation

  /*
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

      quote_version_id:
        transactionResult.quoteVersionId,

      recommended_amount:
        adminAmount,

      recommendation,

      currency:
        negotiationCurrency,
    },
  )

  /*
   * -------------------------------------------------------
   * NOTIFY SUPER ADMIN
   * -------------------------------------------------------
   */

  await notifySuperAdmins({
    type:
      "quote_pending_super_admin_review",

    title:
      "Negotiation requires review",

    message:
      "An Administrator has submitted a revised quote for Super Administrator review.",

    metadata: {
      request_id:
        current.request_id,
      resource_type:
        "request",
      resource_id:
        current.request_id,
      audience:
        "super_administrator",

      negotiation_id:
        input.negotiationId,

      quote_version_id:
        transactionResult.quoteVersionId,

      target_page:
        "super_admin_quote_review",

      action:
        "review_negotiation",
    },
  }).catch((error) => {
    console.error(
      "SUPER ADMIN NEGOTIATION NOTIFICATION ERROR",
      error,
    )
  })

  return {
    ...updatedNegotiation,

    quote_version_id:
      transactionResult.quoteVersionId,
  }
}

/**
 * =========================================================
 * SUPER ADMINISTRATOR DECIDES NEGOTIATION
 * =========================================================
 *
 * VERSION FLOW:
 *
 * V4 = Client negotiation request
 * V5 = Administrator proposal
 * V6 = Super Administrator final decision
 *
 * INTERNAL VERSION 6:
 * - Stores the Super Administrator's actual working amount
 * - Stores the negotiation/workflow currency
 *
 * CLIENT-FACING REQUEST:
 * - Converts the final amount into the client's preferred
 *   currency before writing approved_quote_amount
 * - Stores conversion metadata
 *
 * ONLY Super Administrator can finalize the negotiation.
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
  /*
   * =======================================================
   * VERIFY SUPER ADMINISTRATOR
   * =======================================================
   */

  const superAdmin =
    await query<{
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
      [input.superAdminId],
    )

  const actor =
    superAdmin.rows[0]

  if (!actor) {
    throw new Error(
      "Super Administrator account not found",
    )
  }

  if (actor.status !== "active") {
    throw new Error(
      "Super Administrator account is not active",
    )
  }

  if (
    !isSuperAdministratorRole(
      actor.role,
    )
  ) {
    throw new Error(
      "Only a Super Administrator can approve or modify a negotiation",
    )
  }

  /*
   * =======================================================
   * VALIDATE DECISION
   * =======================================================
   */

  if (
    input.decision !== "approve" &&
    input.decision !== "reject" &&
    input.decision !== "modify"
  ) {
    throw new Error(
      "Invalid Super Administrator decision",
    )
  }

  /*
   * =======================================================
   * VALIDATE OPTIONAL REVISION
   * =======================================================
   */

  let suppliedRevision:
    number | null = null

  if (
    input.revisedQuoteAmount !== null &&
    input.revisedQuoteAmount !== undefined
  ) {
    suppliedRevision =
      validatePositiveAmount(
        input.revisedQuoteAmount,
        "Revised quote amount",
      )
  }

  if (
    input.decision === "modify" &&
    suppliedRevision === null
  ) {
    throw new Error(
      "A valid revised quote amount is required",
    )
  }

  /*
   * =======================================================
   * LOAD NEGOTIATION
   * =======================================================
   */

  const negotiation =
    await query<{
      id: string
      request_id: string
      client_id: string

      quote_currency:
        | string
        | null

      preferred_currency:
        | string
        | null

      original_quote_amount:
        | number
        | null

      requested_budget:
        | number
        | null

      revised_quote_amount:
        | number
        | null

      status: string

      request_status:
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
    }>(
      `
        SELECT
          qn.id,
          qn.request_id,
          qn.client_id,
          qn.quote_currency,
          qn.original_quote_amount,
          qn.requested_budget,
          qn.revised_quote_amount,
          qn.status,

          r.preferred_currency,

          r.status AS request_status,

          r.approved_quote_amount,
          r.approved_quote_currency,
          r.approved_quote_notes,
          r.approved_estimated_start,
          r.approved_estimated_completion

        FROM quote_negotiations qn

        INNER JOIN requests r
          ON r.id = qn.request_id

        WHERE qn.id = $1

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

  /*
   * =======================================================
   * VERIFY NEGOTIATION STATE
   * =======================================================
   */

  if (
    current.status !== "reviewing"
  ) {
    throw new Error(
      "Negotiation is not awaiting Super Administrator review",
    )
  }

  /*
   * =======================================================
   * VERIFY PARENT REQUEST
   * =======================================================
   */

  if (
    current.request_status !==
    "pending_super_admin_review"
  ) {
    throw new Error(
      "Parent request is not awaiting Super Administrator review",
    )
  }

  /*
   * =======================================================
   * NORMALIZE CURRENCIES
   * =======================================================
   *
   * negotiationCurrency:
   *   Currency used by the negotiation workflow.
   *
   * requestCurrency:
   *   Currency the client should see.
   */

  const negotiationCurrency =
    normalizeCurrency(
      current.quote_currency,
    )

  const requestCurrency =
    normalizeCurrency(
      current.preferred_currency,
    )

  /*
   * =======================================================
   * CURRENCY CONSISTENCY
   * =======================================================
   *
   * The client negotiation itself must be in the client's
   * preferred currency.
   */

  if (
    negotiationCurrency !==
    requestCurrency
  ) {
    throw new Error(
      "Negotiation currency no longer matches the client's preferred currency",
    )
  }

  /*
   * =======================================================
   * DETERMINE FINAL INTERNAL AMOUNT
   * =======================================================
   *
   * This is the amount the Super Administrator is actually
   * approving.
   */

  let finalAmount:
    number | null = null

  if (
    input.decision === "approve"
  ) {
    finalAmount =
      current.revised_quote_amount ??
      current.requested_budget ??
      current.original_quote_amount
  }

  if (
    input.decision === "modify"
  ) {
    finalAmount =
      suppliedRevision
  }

  /*
   * =======================================================
   * REJECT NEGOTIATION
   * =======================================================
   */

  if (
    input.decision === "reject"
  ) {
    const result =
      await withTransaction(
        async (client) => {
          /*
           * -------------------------------------------------
           * LOCK NEGOTIATION
           * -------------------------------------------------
           */

          const locked =
            await client.query<{
              id: string
              request_id: string
              status: string
            }>(
              `
                SELECT
                  id,
                  request_id,
                  status
                FROM quote_negotiations
                WHERE id = $1
                FOR UPDATE
              `,
              [input.negotiationId],
            )

          const lockedNegotiation =
            locked.rows[0]

          if (!lockedNegotiation) {
            throw new Error(
              "Negotiation not found",
            )
          }

          if (
            lockedNegotiation.status !==
            "reviewing"
          ) {
            throw new Error(
              "Negotiation changed state before the Super Administrator decision could be recorded",
            )
          }

          /*
           * -------------------------------------------------
           * GET PREVIOUS VERSION
           * -------------------------------------------------
           */

          const previousQuote =
            await client.query<{
              price: number | null
              currency: string | null
            }>(
              `
                SELECT
                  price,
                  currency
                FROM quote_versions
                WHERE request_id = $1
                ORDER BY version_number DESC
                LIMIT 1
              `,
              [current.request_id],
            )

          const previousPrice =
            previousQuote.rows[0]
              ?.price ?? null

          if (
            previousPrice === null ||
            !Number.isFinite(
              Number(previousPrice),
            ) ||
            Number(previousPrice) <= 0
          ) {
            throw new Error(
              "Cannot create final negotiation decision without a valid quote",
            )
          }

          /*
           * -------------------------------------------------
           * CREATE V6
           * -------------------------------------------------
           *
           * Rejection is still recorded as an immutable
           * Super Administrator version.
           */

          const finalVersion =
            await createNextQuoteVersion(
              client,
              {
                requestId:
                  current.request_id,

                createdBy:
                  input.superAdminId,

                creatorRole:
                  "super_administrator",

                source:
                  "super_admin",

                price:
                  Number(
                    current.original_quote_amount ??
                    previousPrice,
                  ),

                currency:
                  negotiationCurrency,

                estimatedStart:
                  current
                    .approved_estimated_start
                    ?.toString()
                    .slice(0, 10) ||
                  null,

                estimatedCompletion:
                  current
                    .approved_estimated_completion
                    ?.toString()
                    .slice(0, 10) ||
                  null,

                notes:
                  input.notes?.trim() ||
                  null,

                reasoning:
                  input.notes?.trim() ||
                  "Negotiation request rejected by Super Administrator.",

                status:
                  "rejected",

                previousPrice:
                  Number(previousPrice),
              },
            )

          /*
           * -------------------------------------------------
           * UPDATE NEGOTIATION
           * -------------------------------------------------
           */

          const updated =
            await client.query<{
              id: string
              request_id: string
              client_id: string
              status: string
              owner_approver_id: string
              owner_decision: string
              owner_decision_notes:
                | string
                | null
              decided_at: string
              created_at: string
              updated_at: string
            }>(
              `
                UPDATE quote_negotiations
                SET
                  status = 'rejected',

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
                  AND status = 'reviewing'

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

          const negotiationRow =
            updated.rows[0]

          if (!negotiationRow) {
            throw new Error(
              "Negotiation changed state before the final decision could be recorded",
            )
          }

          /*
           * -------------------------------------------------
           * RESTORE ORIGINAL QUOTE STATE
           * -------------------------------------------------
           */

          const requestUpdated =
            await client.query(
              `
                UPDATE requests
                SET
                  status = 'quote_sent',

                  updated_at = NOW()

                WHERE id = $1
                  AND status =
                    'pending_super_admin_review'
              `,
              [
                current.request_id,
              ],
            )

          if (
            requestUpdated.rowCount !==
            1
          ) {
            throw new Error(
              "Negotiation was rejected but the parent request could not be restored",
            )
          }

          return {
            negotiationRow,

            quoteVersionId:
              finalVersion.id,
          }
        },
      )

    /*
     * ------------------------------------------------------
     * AUDIT
     * ------------------------------------------------------
     */

    await recordRequestAudit(
      current.request_id,
      input.superAdminId,
      "super_admin_rejected_negotiation",
      {
        negotiation_id:
          input.negotiationId,

        quote_version_id:
          result.quoteVersionId,

        notes:
          input.notes?.trim() ||
          null,
      },
    )

    /*
     * ------------------------------------------------------
     * NOTIFY CLIENT
     * ------------------------------------------------------
     */

    if (
      result.negotiationRow.client_id
    ) {
      await notifyUser(
        result.negotiationRow.client_id,
        {
          type:
            "negotiation_response_received",

          title:
            "Quote review declined",

          message:
            "Your requested quote review was not approved.",

          metadata: {
            request_id:
              current.request_id,
            resource_type:
              "request",
            resource_id:
              current.request_id,

            negotiation_id:
              input.negotiationId,

            quote_version_id:
              result.quoteVersionId,

            target_page:
              "client_quote_review",

            action:
              "view_request",
          },
        },
      ).catch((error) => {
        console.error(
          "CLIENT NEGOTIATION REJECTION NOTIFICATION ERROR",
          error,
        )
      })
    }

    return {
      success: true,

      action:
        "reject",

      status:
        result
          .negotiationRow
          .status,

      quote_version_id:
        result.quoteVersionId,
    }
  }

  /*
   * =======================================================
   * FINAL INTERNAL AMOUNT VALIDATION
   * =======================================================
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

  /*
   * =======================================================
   * OWNER DECISION
   * =======================================================
   */

  const ownerDecision =
    input.decision === "modify"
      ? "modified"
      : "approved"

  /*
   * =======================================================
   * CONVERT FINAL QUOTE TO CLIENT CURRENCY
   * =======================================================
   *
   * Normally negotiationCurrency and requestCurrency
   * should already match.
   *
   * We still perform the conversion defensively so this
   * workflow remains correct even if the internal workflow
   * currency differs in a future scenario.
   */

  let clientAmount =
    normalizedFinalAmount

  let exchangeRate =
    1

  if (
    negotiationCurrency !==
    requestCurrency
  ) {
    const converted =
      await convertCurrency({
        amount:
          normalizedFinalAmount,

        from:
          negotiationCurrency,

        to:
          requestCurrency,
      })

    clientAmount =
      Number(
        converted.amount,
      )

    exchangeRate =
      Number(
        converted.rate,
      )

    if (
      !Number.isFinite(
        clientAmount,
      ) ||
      clientAmount <= 0
    ) {
      throw new Error(
        "Currency conversion returned an invalid client amount",
      )
    }

    if (
      !Number.isFinite(
        exchangeRate,
      ) ||
      exchangeRate <= 0
    ) {
      throw new Error(
        "Currency conversion returned an invalid exchange rate",
      )
    }
  }

  /*
   * =======================================================
   * FINAL TRANSACTION
   * =======================================================
   */

  const transactionResult =
    await withTransaction(
      async (client) => {
        /*
         * -------------------------------------------------
         * LOCK NEGOTIATION
         * -------------------------------------------------
         */

        const locked =
          await client.query<{
            id: string
            request_id: string
            status: string
          }>(
            `
              SELECT
                id,
                request_id,
                status
              FROM quote_negotiations
              WHERE id = $1
              FOR UPDATE
            `,
            [input.negotiationId],
          )

        const lockedNegotiation =
          locked.rows[0]

        if (!lockedNegotiation) {
          throw new Error(
            "Negotiation not found",
          )
        }

        if (
          lockedNegotiation.status !==
          "reviewing"
        ) {
          throw new Error(
            "Negotiation changed state before the Super Administrator decision could be recorded",
          )
        }

        /*
         * -------------------------------------------------
         * PREVIOUS PRICE
         * -------------------------------------------------
         */

        const previousQuote =
          await client.query<{
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
            [current.request_id],
          )

        const previousPrice =
          previousQuote.rows[0]
            ?.price ?? null

        /*
         * -------------------------------------------------
         * CREATE V6
         * -------------------------------------------------
         *
         * IMPORTANT:
         *
         * V6 stores the INTERNAL final amount.
         */

        const finalVersion =
          await createNextQuoteVersion(
            client,
            {
              requestId:
                current.request_id,

              createdBy:
                input.superAdminId,

              creatorRole:
                "super_administrator",

              source:
                "super_admin",

              price:
                normalizedFinalAmount,

              currency:
                negotiationCurrency,

              estimatedStart:
                current
                  .approved_estimated_start
                  ?.toString()
                  .slice(0, 10) ||
                null,

              estimatedCompletion:
                current
                  .approved_estimated_completion
                  ?.toString()
                  .slice(0, 10) ||
                null,

              notes:
                input.notes?.trim() ||
                null,

              reasoning:
                input.notes?.trim() ||
                "Negotiation finalized by Super Administrator.",

              status:
                input.decision === "modify"
                  ? "modified"
                  : "approved",

              previousPrice:
                previousPrice !== null
                  ? Number(previousPrice)
                  : null,
            },
          )

        /*
         * -------------------------------------------------
         * UPDATE NEGOTIATION
         * -------------------------------------------------
         */

        const updated =
          await client.query<{
            id: string
            request_id: string
            client_id: string
            status: string
            owner_approver_id: string
            owner_decision: string
            revised_quote_amount: number
            owner_decision_notes:
              | string
              | null
            decided_at: string
            created_at: string
            updated_at: string
          }>(
            `
              UPDATE quote_negotiations
              SET
                status = 'approved',

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
                AND status = 'under_negotiation'

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

        const negotiationRow =
          updated.rows[0]

        if (!negotiationRow) {
          throw new Error(
            "Negotiation changed state before the Super Administrator decision could be recorded",
          )
        }

        /*
         * -------------------------------------------------
         * UPDATE CLIENT-FACING REQUEST
         * -------------------------------------------------
         *
         * This is the important conversion.
         *
         * The client sees clientAmount in requestCurrency.
         */

        const requestUpdated =
          await client.query(
            `
              UPDATE requests
              SET
                status =
                  'revised_quote_sent',

                final_price =
                  ROUND($2)::integer,

                approved_quote_amount =
                  $2::numeric,

                approved_quote_currency =
                  $3,

                approved_quote_base_amount =
                  $4::numeric,

                approved_quote_notes =
                  $5,

                super_admin_quote_action =
                  $6,

                super_admin_quote_notes =
                  $5,

                super_admin_reviewed_by =
                  $7,

                super_admin_reviewed_at =
                  NOW(),

                quote_exchange_rate =
                  $8::numeric,

                quote_base_currency =
                  $9,

                quote_currency_converted_at =
                  NOW(),

                quote_sent_at =
                  NOW(),

                client_decision_at =
                  NULL,

                updated_at =
                  NOW()

              WHERE id = $1
                AND status =
                  'pending_super_admin_review'
            `,
            [
              current.request_id,

              clientAmount,

              requestCurrency,

              normalizedFinalAmount,

              input.notes?.trim() ||
                null,

              input.decision === "modify"
                ? "modified"
                : "approved",

              input.superAdminId,

              exchangeRate,

              negotiationCurrency,
            ],
          )

        if (
          requestUpdated.rowCount !==
          1
        ) {
          throw new Error(
            "Negotiation was approved but the client-facing quote could not be updated",
          )
        }

        return {
          negotiationRow,

          quoteVersionId:
            finalVersion.id,

          clientAmount,

          clientCurrency:
            requestCurrency,

          exchangeRate,

          internalAmount:
            normalizedFinalAmount,

          internalCurrency:
            negotiationCurrency,
        }
      },
    )

  /*
   * =======================================================
   * AUDIT
   * =======================================================
   */

  await recordRequestAudit(
    current.request_id,
    input.superAdminId,
    "super_admin_approved_revised_quote",
    {
      negotiation_id:
        input.negotiationId,

      quote_version_id:
        transactionResult.quoteVersionId,

      final_amount:
        transactionResult.internalAmount,

      final_currency:
        transactionResult.internalCurrency,

      client_amount:
        transactionResult.clientAmount,

      client_currency:
        transactionResult.clientCurrency,

      exchange_rate:
        transactionResult.exchangeRate,

      decision:
        input.decision,

      notes:
        input.notes?.trim() ||
        null,
    },
  )

  /*
   * =======================================================
   * NOTIFY CLIENT
   * =======================================================
   */

  if (
    transactionResult
      .negotiationRow
      .client_id
  ) {
    await notifyUser(
      transactionResult
        .negotiationRow
        .client_id,
      {
        type:
          "quote_revised",

        title:
          "Revised quote ready",

        message:
          "Your revised investigation quote is ready for review.",

        metadata: {
          request_id:
            current.request_id,
          resource_type:
            "request",
          resource_id:
            current.request_id,

          negotiation_id:
            input.negotiationId,

          quote_version_id:
            transactionResult.quoteVersionId,

          target_page:
            "client_quote_review",

          action:
            "review_quote",
        },
      },
    ).catch((error) => {
      console.error(
        "CLIENT REVISED QUOTE NOTIFICATION ERROR",
        error,
      )
    })
  }

  /*
   * =======================================================
   * SAFE RESPONSE
   * =======================================================
   */

  return {
    success: true,

    action:
      input.decision,

    status:
      transactionResult
        .negotiationRow
        .status,

    quote: {
      amount:
        transactionResult.clientAmount,

      currency:
        transactionResult.clientCurrency,

      notes:
        input.notes?.trim() ||
        null,

      estimated_completion:
        current
          .approved_estimated_completion
          ?.toString()
          .slice(0, 10) ||
        null,
    },

    quote_version_id:
      transactionResult.quoteVersionId,
  }
}
