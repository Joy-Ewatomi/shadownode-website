import { NextRequest, NextResponse } from "next/server"

import {
  auditLog,
  getCurrentUser,
} from "@/lib/auth"

import { query } from "@/lib/db"

import {
  notifyAdmins,
} from "@/lib/services/notification-service"

import {
  requestQuoteReview,
  recordRequestAudit,
} from "@/lib/services/quote-workflow-service"
import { convertAcceptedRequestToCase } from "@/lib/services/case-conversion-service"
import { convertAcceptedRequestToTrainingEngagement } from "@/lib/services/training-engagement-conversion-service"
import { isTrainingRequest as classifyIsTrainingRequest } from "@/lib/services/request-engagement-classification"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const QUOTE_STATUSES = [
  "quote_sent",
  "revised_quote_sent",
  "awaiting_client_acceptance",
  "client_decision_pending",
]

type QuoteAction =
  | "accept"
  | "decline"
  | "negotiate"
  | "review"

async function handleQuote(
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

    let body: {
      action?: QuoteAction
      requested_budget?: number
      currency?: string
      reason?: string
      notes?: string
    }

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
      body.action ?? "",
    )
      .trim()
      .toLowerCase() as QuoteAction

    if (
      ![
        "accept",
        "decline",
        "negotiate",
        "review",
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid quote action.",
          allowed_actions: [
            "accept",
            "decline",
            "negotiate",
            "review",
          ],
        },
        {
          status: 400,
        },
      )
    }

    // ========================================================
    // LOAD REQUEST
    // ========================================================

    const existing = await query<{
      id: string
      user_id: string
      status: string
      preferred_currency: string | null
      approved_quote_amount: number | null
      approved_quote_currency: string | null
      converted_case_id: string | null
      converted_training_engagement_id: string | null
      service_type: string | null
      training_goal: string | null
      training_topics: string | null
      training_participant_count: number | string | null
      training_details: unknown
    }>(
      `
        SELECT
          id,
          user_id,
          status,
          preferred_currency,
          approved_quote_amount,
          approved_quote_currency,
          converted_case_id,
          converted_training_engagement_id,
          service_type,
          training_goal,
          training_topics,
          training_participant_count,
          training_details
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

    const currentRequest =
      existing.rows[0]

    if (!currentRequest) {
      return NextResponse.json(
        {
          error: "Request not found",
        },
        {
          status: 404,
        },
      )
    }

    // ========================================================
    // VERIFY QUOTE STATUS
    // ========================================================

    if (
      action === "accept" &&
      (
        currentRequest.converted_case_id ||
        currentRequest.converted_training_engagement_id
      )
    ) {
      const training = Boolean(currentRequest.converted_training_engagement_id)
      return NextResponse.json({
        success: true,
        decision: "accept",
        request_id: id,
        payment_required: true,
        payment_status: "awaiting_payment",
        engagement_type: training ? "training" : "investigation",
        ...(training
          ? { training_engagement_id: currentRequest.converted_training_engagement_id }
          : { case_id: currentRequest.converted_case_id }),
        next_step: "payment",
      })
    }

    if (
      !QUOTE_STATUSES.includes(
        currentRequest.status,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This quote is no longer available for client decision.",
          status:
            currentRequest.status,
        },
        {
          status: 409,
        },
      )
    }

    // ========================================================
    // ACCEPT
    // ========================================================
    //
    // Legacy compatibility path. Acceptance delegates to the
    // same conversion services as the canonical decision route.
    //

    if (action === "accept") {
      const training = classifyIsTrainingRequest(currentRequest)
      const convertedId = training
        ? await convertAcceptedRequestToTrainingEngagement(id, user.id)
        : await convertAcceptedRequestToCase(id, user.id)

      await recordRequestAudit(
        id,
        user.id,
        training ? "client_accepted_training_quote" : "client_accepted_quote",
        {
          request_id: id,
          payment_required: true,
          ...(training
            ? { training_engagement_id: convertedId }
            : { case_id: convertedId }),
        },
      )

      try {
        await notifyAdmins({
          type: "quote_accepted",
          title:
            "Client accepted quote",
          message:
            "A client has accepted the current quote and is ready for payment.",
          metadata: {
            request_id: id,
            resource_type: "request",
            resource_id: id,
            audience: "administrator",
            target_page:
              "admin_request_review",
            action:
              "view_request",
          },
        })
      } catch (notificationError) {
        console.error(
          "QUOTE ACCEPT NOTIFICATION ERROR:",
          notificationError,
        )
      }

      await auditLog(
        user.id,
        "client_accepted_quote",
        request,
        {
          request_id: id,
        },
      )

      return NextResponse.json({
        success: true,
        decision: "accept",
        request_id: id,
        payment_required: true,
        payment_status: "awaiting_payment",
        engagement_type: training ? "training" : "investigation",
        ...(training
          ? { training_engagement_id: convertedId }
          : { case_id: convertedId }),
        next_step: "payment",
      })
    }

    // ========================================================
    // DECLINE
    // ========================================================

    if (action === "decline") {
      const reason = String(
        body.reason ?? "",
      ).trim()

      if (reason.length < 10) {
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
        reason.slice(0, 2000)

      const updated =
        await query<{
          id: string
          status: string
          declined_reason: string
          client_decision_at: Date | null
        }>(
          `
            UPDATE requests
            SET
              status = 'declined',
              declined_reason = $3,
              client_decision_at = NOW(),
              updated_at = NOW()
            WHERE id = $1
              AND user_id = $2
              AND status = ANY($4::varchar[])
              AND converted_case_id IS NULL
            RETURNING
              id,
              status,
              declined_reason,
              client_decision_at
          `,
          [
            id,
            user.id,
            safeReason,
            QUOTE_STATUSES,
          ],
        )

      if (!updated.rows[0]) {
        return NextResponse.json(
          {
            error:
              "The quote could not be declined because it is no longer active.",
          },
          {
            status: 409,
          },
        )
      }

      await recordRequestAudit(
        id,
        user.id,
        "client_declined_quote",
        {
          request_id: id,
          reason: safeReason,
        },
      )

      try {
        await notifyAdmins({
          type: "quote_declined",
          title:
            "Client declined quote",
          message:
            safeReason,
          metadata: {
            request_id: id,
            resource_type: "request",
            resource_id: id,
            audience: "administrator",
            target_page:
              "admin_request_review",
            action:
              "view_request",
          },
        })
      } catch (notificationError) {
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
          reason: safeReason,
        },
      )

      return NextResponse.json({
        success: true,
        decision: "decline",
        request: updated.rows[0],
      })
    }

    // ========================================================
    // NEGOTIATE / REVIEW
    // ========================================================

    if (
      action === "negotiate" ||
      action === "review"
    ) {
      const requestedBudget =
        Number(
          body.requested_budget,
        )

      if (
        !Number.isFinite(
          requestedBudget,
        ) ||
        requestedBudget <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "A valid proposed amount is required.",
          },
          {
            status: 400,
          },
        )
      }

      const reason = String(
        body.reason ?? "",
      ).trim()

      if (reason.length < 10) {
        return NextResponse.json(
          {
            error:
              "Please provide a clear reason for requesting quote review.",
          },
          {
            status: 400,
          },
        )
      }

      const notes = String(
        body.notes ?? "",
      ).trim()

      const currency =
        String(
          body.currency ??
            currentRequest.approved_quote_currency ??
            currentRequest.preferred_currency ??
            "NGN",
        )
          .trim()
          .toUpperCase()

      // --------------------------------------------------------
      // CREATE NEGOTIATION
      // --------------------------------------------------------

      const negotiation =
        await requestQuoteReview({
          requestId: id,
          clientId: user.id,
          requestedBudget,
          currency,
          reason,
          notes: notes || null,
        })

      // requestQuoteReview() owns the
      // negotiation transaction/status change.

      await recordRequestAudit(
        id,
        user.id,
        "client_requested_quote_review",
        {
          request_id: id,
          negotiation_id:
            negotiation.id,
          requested_budget:
            requestedBudget,
          currency,
          reason,
        },
      )

      // --------------------------------------------------------
      // NOTIFY ADMINISTRATORS
      // --------------------------------------------------------

      try {
        await notifyAdmins({
          type: "quote_negotiation_requested",
          title:
            "Client requested quote review",
          message: reason,
          metadata: {
            request_id: id,
            resource_type: "request",
            resource_id: id,
            audience: "administrator",
            negotiation_id:
              negotiation.id,
            requested_budget:
              requestedBudget,
            currency,
            target_page:
              "admin_request_review",
            action:
              "view_request",
          },
        })
      } catch (notificationError) {
        console.error(
          "QUOTE REVIEW NOTIFICATION ERROR:",
          notificationError,
        )
      }

      await auditLog(
        user.id,
        "client_requested_quote_review",
        request,
        {
          request_id: id,
          negotiation_id:
            negotiation.id,
          requested_budget:
            requestedBudget,
          currency,
          reason,
        },
      )

      return NextResponse.json(
        {
          success: true,
          decision: "negotiate",
          request_id: id,
          negotiation,
        },
        {
          status: 201,
        },
      )
    }

    return NextResponse.json(
      {
        error:
          "Invalid quote action",
      },
      {
        status: 400,
      },
    )
  } catch (error) {
    console.error(
      "CLIENT QUOTE ERROR:",
      error,
    )

    if (error instanceof Error) {
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
          "Failed to process quote action",
      },
      {
        status: 500,
      },
    )
  }
}

// ==========================================================
// PATCH
// ==========================================================

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  return handleQuote(
    request,
    context,
  )
}

// ==========================================================
// POST
// ==========================================================

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  return handleQuote(
    request,
    context,
  )
}
