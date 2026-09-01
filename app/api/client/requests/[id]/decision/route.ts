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
  convertAcceptedRequestToTrainingEngagement,
} from "@/lib/services/training-engagement-conversion-service"

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
 * TRAINING SERVICES
 * =========================================================
 *
 * Any request using one of these service types is converted
 * into a training_engagement rather than an investigation case.
 */
const TRAINING_SERVICE_TYPES = [
  "custom_training",
  "cybersecurity_training",
  "digital_safety",
]

/*
 * =========================================================
 * HELPER
 * =========================================================
 */

function isTrainingService(
  serviceType: string | null | undefined,
): boolean {
  return TRAINING_SERVICE_TYPES.includes(
    String(serviceType ?? "")
      .trim()
      .toLowerCase(),
  )
}

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
    // Accepting a quote does NOT start the engagement.
    //
    // INVESTIGATION:
    //
    // quote
    //   ↓
    // client accepts
    //   ↓
    // case created as awaiting_payment
    //   ↓
    // payment
    //   ↓
    // payment verified
    //   ↓
    // case becomes active
    //
    // TRAINING:
    //
    // quote
    //   ↓
    // client accepts
    //   ↓
    // training engagement created as awaiting_payment
    //   ↓
    // payment
    //   ↓
    // payment verified
    //   ↓
    // training becomes active
    //
    // ========================================================

    if (action === "accept") {
      // ------------------------------------------------------
      // FIND ELIGIBLE REQUEST
      // ------------------------------------------------------

      const eligible =
        await query<{
          id: string
          status: string
          service_type: string | null

          converted_case_id:
            | string
            | null

          converted_training_engagement_id:
            | string
            | null

          approved_quote_amount:
            | number
            | string
            | null

          approved_quote_currency:
            | string
            | null

          currency:
            | string
            | null
        }>(
          `
            SELECT
              id,
              status,
              service_type,
              converted_case_id,
              converted_training_engagement_id,
              approved_quote_amount,
              approved_quote_currency,
              currency
            FROM requests
            WHERE id = $1
              AND user_id = $2
              AND status = ANY($3::varchar[])
              AND converted_case_id IS NULL
              AND converted_training_engagement_id IS NULL
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

      // ------------------------------------------------------
      // VERIFY REQUEST
      // ------------------------------------------------------

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
      // DETERMINE ENGAGEMENT TYPE
      // ------------------------------------------------------

      const isTrainingRequest =
        isTrainingService(
          eligibleRequest.service_type,
        )

      // ------------------------------------------------------
      // APPROVED QUOTE AMOUNT
      // ------------------------------------------------------

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
              "The approved quote amount is invalid",
          },
          {
            status: 400,
          },
        )
      }

      // ------------------------------------------------------
      // APPROVED QUOTE CURRENCY
      // ------------------------------------------------------

      const quoteCurrency =
        String(
          eligibleRequest
            .approved_quote_currency ??
            eligibleRequest.currency ??
            "",
        )
          .trim()
          .toUpperCase()

      if (!quoteCurrency) {
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
      // CONVERSION
      // ------------------------------------------------------
      //
      // Training requests become training_engagements.
      //
      // Investigation requests become cases.
      //
      // Neither conversion activates the engagement.
      // Payment must still be completed and verified.
      // ------------------------------------------------------

      let caseId: string | null = null

      let trainingEngagementId:
        | string
        | null = null

      if (isTrainingRequest) {
        trainingEngagementId =
          await convertAcceptedRequestToTrainingEngagement(
            id,
            user.id,
          )
      } else {
        caseId =
          await convertAcceptedRequestToCase(
            id,
            user.id,
          )
      }

      // ------------------------------------------------------
      // REQUEST AUDIT
      // ------------------------------------------------------

      await recordRequestAudit(
        id,
        user.id,

        isTrainingRequest
          ? "client_accepted_training_quote"
          : "client_accepted_quote",

        {
          ...(caseId
            ? {
                case_id: caseId,
              }
            : {}),

          ...(trainingEngagementId
            ? {
                training_engagement_id:
                  trainingEngagementId,
              }
            : {}),

          engagement_type:
            isTrainingRequest
              ? "training"
              : "investigation",

          payment_required: true,

          amount: quoteAmount,

          currency: quoteCurrency,
        },
      )

      // ------------------------------------------------------
      // SYSTEM AUDIT LOG
      // ------------------------------------------------------

      await auditLog(
        user.id,

        isTrainingRequest
          ? "client_accepted_training_quote"
          : "client_accepted_quote",

        request,

        {
          request_id: id,

          ...(caseId
            ? {
                case_id: caseId,
              }
            : {}),

          ...(trainingEngagementId
            ? {
                training_engagement_id:
                  trainingEngagementId,
              }
            : {}),

          engagement_type:
            isTrainingRequest
              ? "training"
              : "investigation",

          payment_required: true,

          amount: quoteAmount,

          currency: quoteCurrency,
        },
      )

      // ------------------------------------------------------
      // SUCCESS RESPONSE
      // ------------------------------------------------------

      return NextResponse.json({
        success: true,

        decision: "accept",

        request_id: id,

        ...(caseId
          ? {
              case_id: caseId,
            }
          : {}),

        ...(trainingEngagementId
          ? {
              training_engagement_id:
                trainingEngagementId,
            }
          : {}),

        payment_required: true,

        payment_status:
          "awaiting_payment",

        amount: quoteAmount,

        currency: quoteCurrency,

        engagement_type:
          isTrainingRequest
            ? "training"
            : "investigation",

        message:
          isTrainingRequest
            ? "Training quote accepted successfully. Payment is required before the training engagement can begin."
            : "Quote accepted successfully. Payment is required before the investigation can begin.",
      })
    }

    // ========================================================
    // REQUEST QUOTE REVIEW / NEGOTIATION
    // ========================================================

    if (
      REVIEW_ACTIONS.includes(action)
    ) {
      // ------------------------------------------------------
      // REQUESTED BUDGET
      // ------------------------------------------------------

      const requestedBudgetRaw =
        body.requested_budget

      const requestedBudget =
        Number(
          requestedBudgetRaw,
        )

      // ------------------------------------------------------
      // REASON
      // ------------------------------------------------------

      const reason = String(
        body.reason ?? "",
      ).trim()

      // ------------------------------------------------------
      // NOTES
      // ------------------------------------------------------

      const notes = String(
        body.notes ?? "",
      ).trim()

      // ------------------------------------------------------
      // VALIDATE BUDGET
      // ------------------------------------------------------

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

      // ------------------------------------------------------
      // VALIDATE REASON
      // ------------------------------------------------------

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
          currency:
            | string
            | null

          service_type:
            | string
            | null

          converted_case_id:
            | string
            | null

          converted_training_engagement_id:
            | string
            | null
        }>(
          `
            SELECT
              id,
              status,
              currency,
              service_type,
              converted_case_id,
              converted_training_engagement_id
            FROM requests
            WHERE id = $1
              AND user_id = $2
              AND status = ANY($3::varchar[])
              AND converted_case_id IS NULL
              AND converted_training_engagement_id IS NULL
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
              "No active quote is available for review",
          },
          {
            status: 400,
          },
        )
      }

      // ======================================================
      // DETERMINE ENGAGEMENT TYPE
      // ======================================================

      const isTrainingRequest =
        isTrainingService(
          eligibleRequest.service_type,
        )

      // ======================================================
      // CLIENT CURRENCY
      // ======================================================

      const currency =
        String(
          eligibleRequest.currency ??
            "",
        )
          .trim()
          .toUpperCase() ||
        "NGN"

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

      // ======================================================
      // UPDATE REQUEST STATUS
      // ======================================================

      await query(
        `
          UPDATE requests
          SET
            status = 'negotiation_requested',

            client_decision_at =
              NOW(),

            updated_at =
              NOW()

          WHERE id = $1
            AND user_id = $2
            AND status = ANY($3::varchar[])
            AND converted_case_id IS NULL
            AND converted_training_engagement_id IS NULL
        `,
        [
          id,
          user.id,
          QUOTE_STATUSES,
        ],
      )

      // ======================================================
      // REQUEST AUDIT
      // ======================================================

      await recordRequestAudit(
        id,
        user.id,
        isTrainingRequest
          ? "client_requested_training_quote_review"
          : "client_requested_quote_review",
        {
          engagement_type:
            isTrainingRequest
              ? "training"
              : "investigation",

          requested_budget:
            requestedBudget,

          currency,

          reason,

          notes:
            notes || null,
        },
      )

      // ======================================================
      // RESPONSE
      // ======================================================

      return NextResponse.json(
        {
          success: true,

          decision: action,

          request_id: id,

          engagement_type:
            isTrainingRequest
              ? "training"
              : "investigation",

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
      // ------------------------------------------------------
      // REASON
      // ------------------------------------------------------

      const reason =
        String(
          body.reason ?? "",
        ).trim()

      // ------------------------------------------------------
      // VALIDATE REASON
      // ------------------------------------------------------

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

      // ------------------------------------------------------
      // LIMIT REASON
      // ------------------------------------------------------

      const safeReason =
        reason.slice(
          0,
          2000,
        )

      // ------------------------------------------------------
      // DECLINE
      // ------------------------------------------------------

      const updated =
        await query<{
          id: string
          case_number:
            | string
            | null
          title:
            | string
            | null
          service_type:
            | string
            | null
          status:
            | string
            | null
          declined_reason:
            | string
            | null
          client_decision_at:
            | string
            | null
          updated_at:
            | string
            | null
        }>(
          `
            UPDATE requests
            SET
              status =
                'declined',

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
              AND converted_training_engagement_id IS NULL

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
            QUOTE_STATUSES,
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

      const declinedRequest =
        updated.rows[0]

      const isTrainingRequest =
        isTrainingService(
          declinedRequest.service_type,
        )

      // ------------------------------------------------------
      // REQUEST AUDIT
      // ------------------------------------------------------

      await recordRequestAudit(
        id,
        user.id,

        isTrainingRequest
          ? "client_declined_training_quote"
          : "client_declined_quote",

        {
          engagement_type:
            isTrainingRequest
              ? "training"
              : "investigation",

          reason:
            safeReason,
        },
      )

      // ------------------------------------------------------
      // NOTIFY ADMINS
      // ------------------------------------------------------

      try {
        await notifyAdmins({
          type:
            "quote_rejected",

          title:
            isTrainingRequest
              ? "Client declined training quote"
              : "Client declined quote",

          message:
            safeReason ||
            "A client declined a quote.",

          metadata: {
            request_id: id,

            engagement_type:
              isTrainingRequest
                ? "training"
                : "investigation",

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

      // ------------------------------------------------------
      // SYSTEM AUDIT LOG
      // ------------------------------------------------------

      await auditLog(
        user.id,

        isTrainingRequest
          ? "client_declined_training_quote"
          : "client_declined_quote",

        request,

        {
          request_id: id,

          engagement_type:
            isTrainingRequest
              ? "training"
              : "investigation",

          reason:
            safeReason,
        },
      )

      // ------------------------------------------------------
      // RESPONSE
      // ------------------------------------------------------

      return NextResponse.json({
        success: true,

        decision: "decline",

        request:
          declinedRequest,

        engagement_type:
          isTrainingRequest
            ? "training"
            : "investigation",
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
    // ========================================================
    // ERROR LOGGING
    // ========================================================

    console.error(
      "CLIENT QUOTE DECISION ERROR",
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

    // ========================================================
    // ERROR RESPONSE
    // ========================================================

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