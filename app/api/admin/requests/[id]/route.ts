import { NextRequest, NextResponse } from "next/server"

import {
  auditLog,
  isAdminRole,
  requireUser,
} from "@/lib/auth"

import { query } from "@/lib/db"

import { notifyUser } from "@/lib/services/notification-service"

import {
  recordRequestAudit,
  reviewQuoteAsAdmin,
} from "@/lib/services/quote-workflow-service"

/*
 * =====================================================
 * ALLOWED CLIENT CURRENCIES
 * =====================================================
 */

const allowedCurrencies = new Set([
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "CNY",
  "CAD",
  "AUD",
  "JPY",
  "INR",
  "SGD",
  "KES",
  "GHS",
])

/*
 * =====================================================
 * REQUEST TYPE
 * =====================================================
 */

type RequestRow = {
  id: string
  user_id: string | null
  title: string | null
  description: string | null
  priority: string | null
  timeline: string | null
  service_type: string | null
  case_number: string | null
  converted_case_id: string | null

  preferred_currency: string | null
  preferred_deadline: string | null

  status: string | null

  approved_quote_amount: number | null
  approved_quote_currency: string | null
  approved_quote_notes: string | null
  approved_estimated_completion: string | null
  approved_estimated_start: string | null
  training_preferred_start_date: string | null
  admin_quote_action: string | null
}

/*
 * =====================================================
 * PATCH
 * =====================================================
 */

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>
  },
) {
  try {
    /*
     * =================================================
     * AUTHENTICATION
     * =================================================
     */

    const auth = await requireUser()

    if (!auth.user) {
      return auth.response
    }

    if (!isAdminRole(auth.user.role)) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      )
    }

    /*
     * =================================================
     * REQUEST ID
     * =================================================
     */

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          error: "Request id is required.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =================================================
     * BODY
     * =================================================
     */

    const body = await request.json()

    const action = String(body.action || "")
      .trim()
      .toLowerCase()

    /*
     * =================================================
     * LOAD REQUEST
     * =================================================
     */

    const current = await query<RequestRow>(
      `
      SELECT
        id,
        user_id,
        title,
        description,
        priority,
        timeline,
        service_type,
        case_number,
        converted_case_id,

        preferred_currency,
        preferred_deadline,

        status,

        approved_quote_amount,
        approved_quote_currency,
        approved_quote_notes,
        approved_estimated_start,
        approved_estimated_completion,

        admin_quote_action

      FROM requests

      WHERE id = $1

      LIMIT 1
      `,
      [id],
    )

    const item = current.rows[0]

    if (!item) {
      return NextResponse.json(
        {
          error: "Request not found.",
        },
        {
          status: 404,
        },
      )
    }

    /*
     * =================================================
     * ADMINISTRATOR LOCK
     * =================================================
     *
     * Once the administrator sends the proposal to
     * the Super Administrator, the administrator can
     * no longer modify the request.
     */

    const lockedStatuses = new Set([
      "pending_super_admin_review",
      "super_admin_approved",
      "quote_final",
      "final_quote_approved",
    ])

    if (
      lockedStatuses.has(
        String(item.status || ""),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This request is read-only while awaiting or after Super Administrator review.",
        },
        {
          status: 409,
        },
      )
    }

    /*
     * =================================================
     * NEGOTIATION ID
     * =================================================
     */

    const negotiationId = body.negotiation_id
      ? String(body.negotiation_id).trim()
      : null

    /*
     * =================================================
     * CURRENCY
     * =================================================
     *
     * Priority:
     *
     * 1. Administrator-selected currency
     * 2. Existing approved currency
     * 3. Client preferred currency
     * 4. USD fallback
     *
     * AI may calculate internally in USD.
     *
     * The currency below is the actual workflow
     * currency used for the administrator proposal.
     */

    const currency = String(
      body.approved_quote_currency ||
        item.approved_quote_currency ||
        item.preferred_currency ||
        "USD",
    )
      .trim()
      .toUpperCase()

    /*
     * =================================================
     * CASE CREATION PROTECTION
     * =================================================
     *
     * Administrator cannot create a case.
     *
     * Case creation happens only after:
     *
     * Super Admin final approval
     * +
     * Client acceptance
     */

    if (action === "convert_to_case") {
      return NextResponse.json(
        {
          error:
            "Cases are created only after final client quote acceptance.",
        },
        {
          status: 409,
        },
      )
    }

    /*
     * =================================================
     * DIRECT CLIENT QUOTE BLOCK
     * =================================================
     *
     * Administrator cannot bypass Super Admin.
     */

    if (action === "send_quote") {
      return NextResponse.json(
        {
          error:
            "Administrators cannot send quotes directly to clients. Submit the quote for Super Administrator review.",
        },
        {
          status: 409,
        },
      )
    }

    /*
     * =================================================
     * ADJUST QUOTE
     * =================================================
     *
     * Administrator can prepare an adjustment.
     *
     * It still goes to Super Administrator.
     *
     * It does NOT go directly to the client.
     */

    if (action === "adjust_quote") {
      const amount = Number(
        body.approved_quote_amount,
      )

      const reason = String(
        body.admin_quote_notes ||
          body.quote_notes ||
          body.reason ||
          "",
      ).trim()

      const rawEstimatedStart =
  body.approved_estimated_start ??
  null

const estimatedStart =
  rawEstimatedStart
    ? String(rawEstimatedStart).slice(0, 10)
    : null

      const rawEstimatedCompletion =
        body.approved_estimated_completion ??
        body.approved_completion_date ??
        item.preferred_deadline ??
        null

      const estimatedCompletion =
        rawEstimatedCompletion
          ? String(rawEstimatedCompletion).slice(0, 10)
          : null
      /*
       * Validate amount
       */

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Valid quote amount is required.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * Validate reason
       */

      if (!reason) {
        return NextResponse.json(
          {
            error:
              "A reason is required for a quote adjustment.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * Validate currency
       */

      if (!allowedCurrencies.has(currency)) {
        return NextResponse.json(
          {
            error: "Unsupported currency.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * Validate completion date
       */
     
      if (
  estimatedStart &&
  !/^\d{4}-\d{2}-\d{2}$/.test(
    estimatedStart,
  )
) {
  return NextResponse.json(
    {
      error:
        "Estimated start must be a valid date (YYYY-MM-DD).",
    },
    {
      status: 400,
    },
  )
}

      if (
        estimatedCompletion &&
        !/^\d{4}-\d{2}-\d{2}$/.test(
          estimatedCompletion,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Estimated completion must be a valid date (YYYY-MM-DD).",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * Central quote workflow
       */

const reviewed =
  await reviewQuoteAsAdmin({
    requestId: id,
    actorUserId: auth.user.id,
    actorRole: auth.user.role,

    action: "adjust",

    amount,
    currency,

    notes: reason,
    reason,

    estimated_completion:
      estimatedCompletion,
  })

      /*
       * Audit administrator adjustment
       */

     await auditLog(
  auth.user.id,
  "request_quote_adjusted_for_super_admin_review",
  request,
  {
    request_id: id,
    approved_quote_amount: amount,
    approved_quote_currency: currency,
    negotiation_id: negotiationId,
  },
)

      await recordRequestAudit(
        id,
        auth.user.id,
        "request_quote_adjusted_for_super_admin_review",
        {
          approved_quote_amount: amount,
          approved_quote_currency: currency,
          estimated_completion:
            estimatedCompletion,
          negotiation_id: negotiationId,
          reason,
        },
      )

      return NextResponse.json({
        success: true,

        read_only: true,

        status:
          "pending_super_admin_review",

        request: reviewed,
      })
    }

    /*
     * =================================================
     * REJECT REQUEST
     * =================================================
     *
     * Administrator can reject before final quote
     * workflow.
     */

    if (action === "reject") {
      const reason = String(
        body.reason ||
          body.admin_quote_notes ||
          body.quote_notes ||
          "",
      ).trim()

      if (!reason) {
        return NextResponse.json(
          {
            error:
              "A rejection reason is required.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * Update request
       */

      const updated = await query(
        `
        UPDATE requests

        SET
          status = 'rejected',

          declined_reason = $2,

          admin_quote_action = 'rejected',

          admin_quote_notes = $2,

          admin_reviewed_by = $3,

          admin_reviewed_at = NOW(),

          updated_at = NOW()

        WHERE id = $1

        RETURNING *
        `,
        [
          id,
          reason,
          auth.user.id,
        ],
      )

      /*
       * Audit
       */

      await auditLog(
        auth.user.id,
        "request_rejected",
        request,
        {
          request_id: id,
        },
      )

      await recordRequestAudit(
        id,
        auth.user.id,
        "request_rejected",
        {
          reason,
        },
      )

      /*
       * Notify client
       */

      if (item.user_id) {
        await notifyUser(
          item.user_id,
          {
            type: "quote_rejected",

            title: "Request rejected",

            message:
              item.title ||
              "Your investigation request was rejected.",

            metadata: {
              request_id: id,

              target_page:
                "client_quote_review",

              action: "view_request",
            },
          },
        )
      }

      return NextResponse.json(
        updated.rows[0],
      )
    }

    /*
     * =================================================
     * SUBMIT FOR SUPER ADMIN REVIEW
     * =================================================
     *
     * MAIN ADMINISTRATOR ACTION
     *
     * Client
     *   ↓
     * pending_review
     *
     * Administrator
     *   ↓
     * submit_for_super_admin_review
     *
     * pending_super_admin_review
     *
     *   ↓
     *
     * Super Administrator
     *
     * Client receives NOTHING at this stage.
     */

    if (
      action ===
      "submit_for_super_admin_review"
    ) {
      /*
       * =================================================
       * AMOUNT
       * =================================================
       */

      const amount = Number(
        body.approved_quote_amount,
      )

      /*
       * =================================================
       * ADMIN REASON
       * =================================================
       */

      const reason = String(
        body.reason ||
          body.admin_quote_notes ||
          body.quote_notes ||
          "",
      ).trim()

      /*
       * =================================================
       * ESTIMATED COMPLETION
       * =================================================
       */

const rawEstimatedStart =
  body.approved_estimated_start ??
  null

const estimatedStart =
  rawEstimatedStart
    ? String(rawEstimatedStart).slice(0, 10)
    : null

      const rawEstimatedCompletion =
        body.approved_completion_date ??
        body.approved_estimated_completion ??
        item.preferred_deadline ??
        null

      const estimatedCompletion =
        rawEstimatedCompletion
          ? String(rawEstimatedCompletion).slice(0, 10)
          : null

      /*
       * =================================================
       * VALIDATE AMOUNT
       * =================================================
       */

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "A valid quote amount is required.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * =================================================
       * VALIDATE ADMIN NOTE
       * =================================================
       */

      if (!reason) {
        return NextResponse.json(
          {
            error:
              "A review note is required.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * =================================================
       * VALIDATE DATE
       * =================================================
       */

      if (
  estimatedStart &&
  !/^\d{4}-\d{2}-\d{2}$/.test(
    estimatedStart,
  )
) {
  return NextResponse.json(
    {
      error:
        "Estimated start must be a valid date (YYYY-MM-DD).",
    },
    {
      status: 400,
    },
  )
}

      if (
        estimatedCompletion &&
        !/^\d{4}-\d{2}-\d{2}$/.test(
          estimatedCompletion,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Estimated completion must be a valid date (YYYY-MM-DD).",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * =================================================
       * VALIDATE CURRENCY
       * =================================================
       */

      if (!allowedCurrencies.has(currency)) {
        return NextResponse.json(
          {
            error: "Unsupported currency.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * =================================================
       * NEGOTIATION VALIDATION
       * =================================================
       */

      if (negotiationId) {
        const negotiationCheck =
          await query<{
            id: string
          }>(
            `
            SELECT id

            FROM quote_negotiations

            WHERE id = $1

              AND request_id = $2

            LIMIT 1
            `,
            [
              negotiationId,
              id,
            ],
          )

        if (
          !negotiationCheck.rows[0]
        ) {
          return NextResponse.json(
            {
              error:
                "Negotiation not found for this request.",
            },
            {
              status: 400,
            },
          )
        }
      }

      /*
       * =================================================
       * CENTRAL QUOTE WORKFLOW
       * =================================================
       *
       * reviewQuoteAsAdmin handles:
       *
       * - administrator validation
       * - internal AI quote retrieval
       * - administrator quote
       * - quote version
       * - request status
       * - audit
       * - Super Admin notification
       *
       * AI estimate remains INTERNAL.
       */
const reviewed =
  await reviewQuoteAsAdmin({
    requestId: id,
    actorUserId: auth.user.id,
    actorRole: auth.user.role,

    action: "adjust",

    amount,
    currency,

    notes: reason,
    reason,

    estimated_start:
  estimatedStart,

    estimated_completion:
      estimatedCompletion,
  })
      /*
       * =================================================
       * UPDATE NEGOTIATION
       * =================================================
       */

      if (negotiationId) {
        await query(
          `
          UPDATE quote_negotiations

          SET
            administrator_recommendation = $3,

            revised_quote_amount = $4,

            status =
              'pending_super_admin_review'

          WHERE id = $1

            AND request_id = $2
          `,
          [
            negotiationId,
            id,
            reason,
            amount,
          ],
        )

        await recordRequestAudit(
          id,
          auth.user.id,
          "administrator_responded_to_negotiation",
          {
            negotiation_id:
              negotiationId,

            revised_quote_amount:
              amount,

            currency,

            recommendation:
              reason,
          },
        )
      }

      /*
       * =================================================
       * AUDIT
       * =================================================
       */
await auditLog(
  auth.user.id,
  "request_submitted_for_super_admin_review",
  request,
  {
    request_id: id,
    approved_quote_amount: amount,
    approved_quote_currency: currency,
    negotiation_id: negotiationId,
  },
)

      await recordRequestAudit(
        id,
        auth.user.id,
        "request_submitted_for_super_admin_review",
        {
          approved_quote_amount:
            amount,

          approved_quote_currency:
            currency,

          estimated_completion:
            estimatedCompletion,

          negotiation_id:
            negotiationId,

          reason,
        },
      )

      /*
       * =================================================
       * RESPONSE
       * =================================================
       *
       * Do NOT expose AI quote.
       *
       * Only administrator proposal is returned.
       */

      return NextResponse.json({
        success: true,

        read_only: true,

        status:
          "pending_super_admin_review",

        request: {
          id: reviewed.id,

          title: reviewed.title,

          status: reviewed.status,

          approved_quote_amount:
            reviewed.approved_quote_amount,

          approved_quote_currency:
            reviewed.approved_quote_currency,

          approved_quote_notes:
            reviewed.approved_quote_notes,

          approved_estimated_completion:
            reviewed.approved_estimated_completion,

        },
      })
    }

    /*
     * =================================================
     * UNKNOWN ACTION
     * =================================================
     */

    return NextResponse.json(
      {
        error: action
          ? `Unsupported action: ${action}`
          : "No action was supplied.",
      },
      {
        status: 400,
      },
    )
  } catch (error) {
    console.error(
      "ADMIN REQUEST PATCH ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to update request.",

        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      {
        status: 500,
      },
    )
  }
}