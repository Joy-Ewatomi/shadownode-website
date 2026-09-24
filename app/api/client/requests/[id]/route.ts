import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { query } from "@/lib/db"

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

/**
 * Safely convert a database value to a number.
 */
function toNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : null
}

/**
 * Convert a date/time value to YYYY-MM-DD.
 */
function toDateOnly(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null
  }

  let date: Date

  if (value instanceof Date) {
    date = value
  } else if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    date = new Date(value)
  } else {
    return null
  }

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString().slice(0, 10)
}

/**
 * Convert a database timestamp to ISO.
 */
function toISOString(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value.toISOString()
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return null
    }

    return date.toISOString()
  }

  return null
}

/**
 * =========================================================
 * GET CLIENT REQUEST DETAILS
 * =========================================================
 *
 * Returns the authenticated client's own request.
 *
 * Also returns the latest CLIENT negotiation/version
 * information when one exists.
 *
 * IMPORTANT:
 *
 * Internal Administrator and Super Administrator
 * information is NOT returned through client_negotiation.
 */
export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    /**
     * =======================================================
     * AUTHENTICATION
     * =======================================================
     */

    const {
      user,
      response,
    } = await requireUser()

    if (!user) {
      return response
    }

    /**
     * =======================================================
     * CLIENT ONLY
     * =======================================================
     */

    if (
      user.role !== "client"
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden",
        },
        {
          status: 403,
        },
      )
    }

    /**
     * =======================================================
     * REQUEST ID
     * =======================================================
     */

    const {
      id,
    } = await params

    if (!id?.trim()) {
      return NextResponse.json(
        {
          error:
            "Request ID is required",
        },
        {
          status: 400,
        },
      )
    }

    /**
     * =======================================================
     * LOAD REQUEST
     * =======================================================
     *
     * user_id is the authorization boundary.
     */

    const requestResult =
      await query(
        `
          SELECT *
          FROM requests
          WHERE id = $1
            AND user_id = $2
          LIMIT 1
        `,
        [
          id,
          user.id,
        ],
      )

    if (
      !requestResult.rows[0]
    ) {
      return NextResponse.json(
        {
          error:
            "Request not found",
        },
        {
          status: 404,
        },
      )
    }

    const row =
      requestResult.rows[0]

    /**
     * =======================================================
     * CLIENT NEGOTIATION
     * =======================================================
     *
     * Find the latest negotiation belonging to this request
     * and the latest CLIENT quote version associated with it.
     *
     * This gives the client their own Version 4 record:
     *
     *   requested budget
     *   currency
     *   reason
     *   notes
     *   round
     *   status
     *
     * It does not expose Administrator or Super Administrator
     * internal reasoning.
     */

    let clientNegotiation:
      | {
          id: string
          request_id: string
          round_number: number
          status: string
          requested_budget: number | null
          currency: string | null
          reason: string | null
          notes: string | null
          quote_version_id: string | null
          quote_version_number:
            | number
            | null
          created_at: string | null
          updated_at: string | null
        }
      | null = null

    try {
      const negotiationResult =
        await query<{
          id: string
          request_id: string
          round_number: number
          status: string
          requested_budget:
            | number
            | string
            | null
          quote_currency:
            | string
            | null
          client_reason:
            | string
            | null
          client_notes:
            | string
            | null
          created_at:
            | string
            | Date
            | null
          updated_at:
            | string
            | Date
            | null
        }>(
          `
            SELECT
              id,
              request_id,
              round_number,
              status,
              requested_budget,
              quote_currency,
              client_reason,
              client_notes,
              created_at,
              updated_at

            FROM quote_negotiations

            WHERE request_id = $1
              AND client_id = $2

            ORDER BY
              round_number DESC,
              created_at DESC

            LIMIT 1
          `,
          [
            id,
            user.id,
          ],
        )

      const negotiation =
        negotiationResult.rows[0]

      if (negotiation) {
        /**
         * ---------------------------------------------------
         * FIND CLIENT QUOTE VERSION
         * ---------------------------------------------------
         *
         * creator_role = client and source =
         * client_negotiation identify Version 4.
         *
         * We select the version tied to this negotiation
         * through its timestamp/round context by taking the
         * latest client negotiation version for this request.
         */

        const versionResult =
          await query<{
            id: string
            version_number: number
            created_at:
              | string
              | Date
              | null
          }>(
            `
              SELECT
                id,
                version_number,
                created_at

              FROM quote_versions

              WHERE request_id = $1
                AND created_by = $2
                AND creator_role = 'client'
                AND source = 'client_negotiation'

              ORDER BY
                version_number DESC,
                created_at DESC

              LIMIT 1
            `,
            [
              id,
              user.id,
            ],
          )

        const version =
          versionResult.rows[0]

        clientNegotiation = {
          id:
            negotiation.id,

          request_id:
            negotiation.request_id,

          round_number:
            Number(
              negotiation.round_number,
            ),

          status:
            negotiation.status,

          requested_budget:
            toNumber(
              negotiation.requested_budget,
            ),

          currency:
            negotiation.quote_currency
              ?.trim()
              .toUpperCase() ||
            null,

          reason:
            negotiation.client_reason ||
            null,

          notes:
            negotiation.client_notes ||
            null,

          quote_version_id:
            version?.id ||
            null,

          quote_version_number:
            version
              ? Number(
                  version.version_number,
                )
              : null,

          created_at:
            toISOString(
              negotiation.created_at,
            ),

          updated_at:
            toISOString(
              negotiation.updated_at,
            ),
        }
      }
    } catch (negotiationError) {
      /**
       * Negotiation data must not prevent the client's
       * main request from loading.
       */
      console.error(
        "CLIENT NEGOTIATION LOAD ERROR:",
        negotiationError,
      )

      clientNegotiation =
        null
    }

    /**
     * =======================================================
     * NORMALIZED REQUEST
     * =======================================================
     */

    const {
      admin_recommendation: _adminRecommendation,
      super_admin_decision: _superAdminDecision,
      internal_decision_reason: _internalDecisionReason,
      submission_key: _submissionKey,
      ...clientSafeRow
    } = row

    if (row.service_type === "custom_service" || row.service_type === "custom") {
      delete clientSafeRow.ai_analysis
      delete clientSafeRow.ai_reasoning
      delete clientSafeRow.ai_confidence
      delete clientSafeRow.ai_complexity
      delete clientSafeRow.ai_estimated_hours
      delete clientSafeRow.ai_suggested_service
      delete clientSafeRow.ai_suggested_priority
      delete clientSafeRow.ai_price_estimate
      delete clientSafeRow.ai_status
    }

    const normalizedRow = {
      ...clientSafeRow,

      /**
       * JSONB
       */
      training_details:
        row.training_details ??
        {},

      supporting_links:
        row.supporting_links ??
        [],

      evidence_uploads:
        row.evidence_uploads ??
        [],

      /**
       * NUMERIC
       */
      ai_price_estimate:
        toNumber(
          row.ai_price_estimate,
        ),

      final_price:
        toNumber(
          row.final_price,
        ),

      approved_quote_amount:
        toNumber(
          row.approved_quote_amount,
        ),

      quote_exchange_rate:
        toNumber(
          row.quote_exchange_rate,
        ),

      approved_quote_base_amount:
        toNumber(
          row.approved_quote_base_amount,
        ),

      /**
       * DATE ONLY
       */
      estimated_start:
        toDateOnly(
          row.estimated_start,
        ),

      estimated_completion:
        toDateOnly(
          row.estimated_completion,
        ),

      approved_estimated_start:
        toDateOnly(
          row.approved_estimated_start,
        ),

      approved_estimated_completion:
        toDateOnly(
          row.approved_estimated_completion,
        ),

      training_preferred_start_date:
        toDateOnly(
          row.training_preferred_start_date,
        ),

      training_preferred_completion_date:
        toDateOnly(
          row.training_preferred_completion_date,
        ),

      preferred_deadline:
        toDateOnly(
          row.preferred_deadline,
        ),

      osint_completion_date:
        toDateOnly(
          row.osint_completion_date,
        ),

      /**
       * TIMESTAMPS
       */
      created_at:
        toISOString(
          row.created_at,
        ),

      updated_at:
        toISOString(
          row.updated_at,
        ),

      admin_reviewed_at:
        toISOString(
          row.admin_reviewed_at,
        ),

      super_admin_reviewed_at:
        toISOString(
          row.super_admin_reviewed_at,
        ),

      quote_currency_converted_at:
        toISOString(
          row.quote_currency_converted_at,
        ),

      quote_sent_at:
        toISOString(
          row.quote_sent_at,
        ),

      client_decision_at:
        toISOString(
          row.client_decision_at,
        ),

      /**
       * =====================================================
       * CLIENT NEGOTIATION
       * =====================================================
       *
       * This is intentionally a separate property.
       *
       * The frontend can now use:
       *
       * request.client_negotiation
       */
      client_negotiation:
        clientNegotiation,
    }

    /**
     * =======================================================
     * RESPONSE
     * =======================================================
     */

    return NextResponse.json(
      normalizedRow,
    )
  } catch (error) {
    console.error(
      "CLIENT REQUEST DETAILS GET ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to load request",
      },
      {
        status: 500,
      },
    )
  }
}