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
function toNumber(value: unknown): number | null {
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
 *
 * Used for date-only fields such as:
 * - estimated_start
 * - estimated_completion
 */
function toDateOnly(value: unknown): string | null {
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
 * Convert a database timestamp to a full ISO timestamp.
 *
 * This preserves both date and time, for example:
 *
 * 2026-08-26T14:35:42.123Z
 */
function toISOString(value: unknown): string | null {
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
 * Returns a request belonging to the authenticated client.
 *
 * IMPORTANT:
 *
 * The user_id restriction prevents a client from accessing
 * another client's request simply by changing the request ID.
 *
 * Timestamp fields are normalized to ISO strings so the
 * frontend can display the exact date and time of changes.
 */
export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>
  },
) {
  try {
    /**
     * -------------------------------------------------------
     * AUTHENTICATION
     * -------------------------------------------------------
     */
    const { user, response } =
      await requireUser()

    if (!user) {
      return response
    }

    /**
     * -------------------------------------------------------
     * CLIENT-ONLY ACCESS
     * -------------------------------------------------------
     */
    if (user.role !== "client") {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      )
    }

    /**
     * -------------------------------------------------------
     * REQUEST ID
     * -------------------------------------------------------
     */
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          error: "Request ID is required",
        },
        {
          status: 400,
        },
      )
    }

    /**
     * -------------------------------------------------------
     * FETCH REQUEST
     * -------------------------------------------------------
     *
     * SELECT * is intentional because the requests table
     * contains many client-submitted and workflow fields.
     *
     * The user_id condition is the authorization boundary.
     */
    const { rows } =
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

    if (!rows[0]) {
      return NextResponse.json(
        {
          error: "Request not found",
        },
        {
          status: 404,
        },
      )
    }

    const row = rows[0]

    /**
     * =======================================================
     * NORMALIZE REQUEST DATA
     * =======================================================
     *
     * JSONB fields:
     *
     * training_details -> object
     * supporting_links -> array
     * evidence_uploads -> array
     */
    const normalizedRow = {
      ...row,

      /**
       * -----------------------------------------------------
       * JSONB NORMALIZATION
       * -----------------------------------------------------
       */
      training_details:
        row.training_details ?? {},

      supporting_links:
        row.supporting_links ?? [],

      evidence_uploads:
        row.evidence_uploads ?? [],

      /**
       * -----------------------------------------------------
       * NUMERIC NORMALIZATION
       * -----------------------------------------------------
       *
       * PostgreSQL numeric values can sometimes arrive as
       * strings depending on the database driver.
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

      /**
       * -----------------------------------------------------
       * DATE-ONLY NORMALIZATION
       * -----------------------------------------------------
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

      /**
       * -----------------------------------------------------
       * TIMESTAMP NORMALIZATION
       * -----------------------------------------------------
       *
       * These retain the exact date + time.
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
    }

    /**
     * -------------------------------------------------------
     * RESPONSE
     * -------------------------------------------------------
     */
    return NextResponse.json(
      normalizedRow,
    )
  } catch (error) {
    console.error(
      "CLIENT REQUEST DETAILS GET ERROR",
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