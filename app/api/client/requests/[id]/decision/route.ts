import { NextRequest, NextResponse } from "next/server"

import {
  auditLog,
  getCurrentUser,
} from "@/lib/auth"

import { query } from "@/lib/db"

import {
  convertAcceptedRequestToCase,
} from "@/lib/services/case-conversion-service"

import {
  notifyAdmins,
} from "@/lib/services/notification-service"

import {
  recordRequestAudit,
  requestQuoteReview,
} from "@/lib/services/quote-workflow-service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/*
 * =========================================================
 * QUOTE STATUSES
 * =========================================================
 *
 * These are the request states where the client can still
 * make a decision about the quote.
 */
const QUOTE_STATUSES = [
  "quote_sent",
  "revised_quote_sent",
  "client_decision_pending",
  "awaiting_client_acceptance",
]
/*
 * =========================================================
 * REVIEW ACTIONS
 * =========================================================
 */
const REVIEW_ACTIONS = [
  "review",
  "request_review",
  "negotiate",
]

/*
 * =========================================================
 * MAIN DECISION HANDLER
 * =========================================================
 */

async function handleDecision(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    // ========================================================
    // AUTHENTICATION
    // ========================================================

    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

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

    // ========================================================
    // REQUEST ID
    // ========================================================

    const { id } = await params

    if (!id?.trim()) {
      return NextResponse.json(
        {
          error: "Request ID is required",
        },
        {
          status: 400,
        },
      )
    }

    // ========================================================
    // BODY
    // ========================================================

    let body: Record<string, unknown>

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body",
        },
        {
          status: 400,
        },
      )
    }

    const action = String(
      body.action ??
        body.decision ??
        "",
    )
      .trim()
      .toLowerCase()

    if (!action) {
      return NextResponse.json(
        {
          error: "Decision action is required",
          allowed_actions: [
            "accept",
            "review",
            "decline",
          ],
        },
        {
          status: 400,
        },
      )
    }

    // ========================================================
    // ACCEPT QUOTE
    // ========================================================
    //
    // IMPORTANT:
    //
    // ACCEPTING A QUOTE DOES NOT MEAN THE INVESTIGATION
    // HAS STARTED.
    //
    // The sequence is:
    //
    // quote
    //   ↓
    // client accepts
    //   ↓
    // case created as awaiting_payment
    //   ↓
    // Paystack payment
    //   ↓
    // payment verified
    //   ↓
    // case becomes active
    //
    // Therefore we deliberately do NOT mark the case active
    // here.
    // ========================================================

    if (action === "accept") {
      const eligible = await query<{
        id: string
        status: string
        converted_case_id: string | null
        approved_quote_amount:
          | number
          | string
          | null
        approved_quote_currency:
          | string
          | null
      }>(
        `
          SELECT
            id,
            status,
            converted_case_id,
            approved_quote_amount,
            approved_quote_currency
          FROM requests
          WHERE id = $1
            AND user_id = $2
            AND status = ANY($3::varchar[])
          LIMIT 1
        `,
        [
          id,
          user.id,
          QUOTE_STATUSES,
        ],
      )

      const eligibleRequest =
        eligible.rows[0]

      if (!eligibleRequest) {
        return NextResponse.json(
          {
            error:
              "No active quote is available for acceptance",
          },
          {
            status: 400,
          },
        )
      }

      // ------------------------------------------------------
      // ALREADY ACCEPTED / WAITING FOR PAYMENT
      // ------------------------------------------------------

      if (
        eligibleRequest.status ===
          "awaiting_payment" &&
        eligibleRequest.converted_case_id
      ) {
        return NextResponse.json({
          success: true,
          decision: "accept",
          payment_required: true,
          request_id: id,
          case_id:
            eligibleRequest.converted_case_id,
          message:
            "Quote already accepted. Payment is required before the investigation can begin.",
        })
      }

      // ------------------------------------------------------
      // APPROVED QUOTE MUST EXIST
      // ------------------------------------------------------

      if (
        eligibleRequest.approved_quote_amount ===
          null ||
        eligibleRequest.approved_quote_amount ===
          undefined
      ) {
        return NextResponse.json(
          {
            error:
              "No approved quote amount is available for payment.",
          },
          {
            status: 400,
          },
        )
      }

      const quoteAmount = Number(
        eligibleRequest.approved_quote_amount,
      )

      if (
        !Number.isFinite(
          quoteAmount,
        ) ||
        quoteAmount <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "The approved quote amount is invalid.",
          },
          {
            status: 400,
          },
        )
      }

      if (
        !eligibleRequest.approved_quote_currency
      ) {
        return NextResponse.json(
          {
            error:
              "The approved quote currency is missing.",
          },
          {
            status: 400,
          },
        )
      }

      // ------------------------------------------------------
      // CONVERT REQUEST TO PAYMENT-PENDING CASE
      // ------------------------------------------------------
      //
      // Your existing conversion service should create the
      // case with awaiting_payment status.
      //
      // It must NOT make the case active.
      //

      const caseId =
        await convertAcceptedRequestToCase(
          id,
          user.id,
        )

      // ------------------------------------------------------
      // RECORD CLIENT ACCEPTANCE
      // ------------------------------------------------------

      await recordRequestAudit(
        id,
        user.id,
        "client_accepted_quote",
        {
          case_id: caseId,

          payment_required: true,

          amount:
            quoteAmount,

          currency:
            eligibleRequest
              .approved_quote_currency,
        },
      )

      // ------------------------------------------------------
      // AUDIT LOG
      // ------------------------------------------------------

      await auditLog(
        user.id,
        "client_accepted_quote",
        request,
        {
          request_id: id,

          case_id: caseId,

          payment_required: true,

          amount:
            quoteAmount,

          currency:
            eligibleRequest
              .approved_quote_currency,
        },
      )
      // ------------------------------------------------------
      // IMPORTANT RESPONSE
      // ------------------------------------------------------
      //
      // Tell frontend that acceptance succeeded BUT payment
      // is the next step.
      //

      return NextResponse.json({
        success: true,

        decision: "accept",

        request_id: id,

        case_id: caseId,

        payment_required: true,

        payment_status:
          "awaiting_payment",

        amount:
          quoteAmount,

        currency:
          eligibleRequest
            .approved_quote_currency,

        message:
          "Quote accepted successfully. Payment is required before the investigation can begin.",
      })
    }

    // ========================================================
    // REQUEST QUOTE REVIEW / NEGOTIATION
    // ========================================================

    if (
      REVIEW_ACTIONS.includes(action)
    ) {
      const requestedBudgetRaw =
        body.requested_budget

      const requestedBudget =
        Number(
          requestedBudgetRaw,
        )

      const reason = String(
        body.reason ?? "",
      ).trim()

      const notes = String(
        body.notes ?? "",
      ).trim()

      if (
        !Number.isFinite(
          requestedBudget,
        ) ||
        requestedBudget <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "A valid requested budget is required",
          },
          {
            status: 400,
          },
        )
      }

      if (
        reason.length < 10
      ) {
        return NextResponse.json(
          {
            error:
              "Please provide a clear reason for requesting quote review",
          },
          {
            status: 400,
          },
        )
      }

      // ======================================================
      // VERIFY ACTIVE QUOTE
      // ======================================================

      const eligible =
        await query<{
          id: string
          status: string
          preferred_currency:
            | string
            | null
          converted_case_id:
            | string
            | null
        }>(
          `
            SELECT
              id,
              status,
              preferred_currency,
              converted_case_id
            FROM requests
            WHERE id = $1
              AND user_id = $2
              AND status = ANY($3::varchar[])
              AND converted_case_id IS NULL
            LIMIT 1
          `,
          [
            id,
            user.id,
            [
              "quote_sent",
              "revised_quote_sent",
              "client_decision_pending",
              "awaiting_client_acceptance",
            ],
          ],
        )

      const eligibleRequest =
        eligible.rows[0]

      if (!eligibleRequest) {
        return NextResponse.json(
          {
            error:
              "No active quote is available for review",
          },
          {
            status: 400,
          },
        )
      }

      // ======================================================
      // CLIENT CURRENCY
      // ======================================================

      const currency =
        eligibleRequest
          .preferred_currency
          ?.trim()
          .toUpperCase() ||
        "USD"

      // ======================================================
      // CREATE NEGOTIATION
      // ======================================================

      const negotiation =
        await requestQuoteReview({
          requestId: id,

          clientId:
            user.id,

          requestedBudget,

          currency,

          reason,

          notes:
            notes || null,
        })


  await query(
  `
    UPDATE requests
    SET
      status = 'negotiation_requested',
      client_decision_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
      AND user_id = $2
      AND status = ANY($3::varchar[])
      AND converted_case_id IS NULL
  `,
  [
    id,
    user.id,
    QUOTE_STATUSES,
  ],
)

      return NextResponse.json(
        {
          success: true,

          decision: action,

          request_id: id,

          negotiation,
        },
        {
          status: 201,
        },
      )
    }

    // ========================================================
    // DECLINE QUOTE
    // ========================================================

    if (
      action === "decline"
    ) {
      const reason =
        String(
          body.reason ?? "",
        ).trim()

      if (
        reason.length < 10
      ) {
        return NextResponse.json(
          {
            error:
              "Please provide a clear reason for declining the quote.",
          },
          {
            status: 400,
          },
        )
      }

      const safeReason =
        reason.slice(
          0,
          2000,
        )

      const updated =
        await query(
          `
            UPDATE requests
            SET
              status = 'declined',

              declined_reason =
                $3,

              client_decision_at =
                NOW(),

              updated_at =
                NOW()

            WHERE id = $1
              AND user_id = $2
              AND status = ANY($4::varchar[])
              AND converted_case_id IS NULL

            RETURNING
              id,
              case_number,
              title,
              service_type,
              status,
              declined_reason,
              client_decision_at,
              updated_at
          `,
          [
            id,
            user.id,
            safeReason,
            [
              "quote_sent",
              "revised_quote_sent",
              "client_decision_pending",
              "awaiting_client_acceptance",
            ],
          ],
        )

      if (
        !updated.rows[0]
      ) {
        return NextResponse.json(
          {
            error:
              "No active quote is available for decline",
          },
          {
            status: 400,
          },
        )
      }

      await recordRequestAudit(
        id,
        user.id,
        "client_declined_quote",
        {
          reason:
            safeReason,
        },
      )

      try {
        await notifyAdmins({
          type:
            "quote_rejected",

          title:
            "Client declined quote",

          message:
            safeReason ||
            "A client declined a quote.",

          metadata: {
            request_id: id,

            target_page:
              "admin_request_review",

            action:
              "view_request",
          },
        })
      } catch (
        notificationError
      ) {
        console.error(
          "QUOTE DECLINE NOTIFICATION ERROR:",
          notificationError,
        )
      }

      await auditLog(
        user.id,
        "client_declined_quote",
        request,
        {
          request_id: id,

          reason:
            safeReason,
        },
      )

      return NextResponse.json({
        success: true,

        decision: "decline",

        request:
          updated.rows[0],
      })
    }

    // ========================================================
    // INVALID ACTION
    // ========================================================

    return NextResponse.json(
      {
        error:
          "Invalid decision action",

        allowed_actions: [
          "accept",
          "review",
          "decline",
        ],
      },
      {
        status: 400,
      },
    )
  } catch (error) {
    console.error(
      "CLIENT QUOTE DECISION ERROR:",
      error,
    )

    if (
      error instanceof Error
    ) {
      console.error(
        "MESSAGE:",
        error.message,
      )

      console.error(
        "STACK:",
        error.stack,
      )
    }

    return NextResponse.json(
      {
        error:
          "Failed to process quote decision",
      },
      {
        status: 500,
      },
    )
  }
}

// ==========================================================
// POST
// ==========================================================

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  return handleDecision(
    request,
    context,
  )
}

// ==========================================================
// PATCH
// ==========================================================

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  return handleDecision(
    request,
    context,
  )
}