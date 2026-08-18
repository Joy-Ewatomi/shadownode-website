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

const QUOTE_STATUSES = [
  "quote_sent",
  "revised_quote_sent",
  "awaiting_client_acceptance",
]

const REVIEW_ACTIONS = [
  "review",
  "request_review",
  "negotiate",
]

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

    if (action === "accept") {
      const eligible = await query<{
        id: string
        status: string
        converted_case_id: string | null
      }>(
        `
          SELECT
            id,
            status,
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
          QUOTE_STATUSES,
        ],
      )

      if (!eligible.rows[0]) {
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

      const caseId =
        await convertAcceptedRequestToCase(
          id,
          user.id,
        )

      await recordRequestAudit(
        id,
        user.id,
        "client_accepted_quote",
        {
          case_id: caseId,
        },
      )

      await auditLog(
        user.id,
        "client_accepted_quote",
        request,
        {
          request_id: id,
          case_id: caseId,
        },
      )

      return NextResponse.json({
        success: true,
        decision: "accept",
        request_id: id,
        case_id: caseId,
      })
    }

    // ========================================================
    // REQUEST QUOTE REVIEW
    // ========================================================

    if (REVIEW_ACTIONS.includes(action)) {
      const requestedBudgetRaw =
        body.requested_budget

      const requestedBudget =
        Number(requestedBudgetRaw)

      const reason = String(
        body.reason ?? "",
      ).trim()

      const notes = String(
        body.notes ?? "",
      ).trim()

      if (
        !Number.isFinite(requestedBudget) ||
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

      if (reason.length < 10) {
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

const eligible = await query<{
  id: string
  status: string
  preferred_currency: string | null
}>(
  `
    SELECT
      id,
      status,
      preferred_currency
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
    QUOTE_STATUSES,
  ],
)

const eligibleRequest = eligible.rows[0]

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
  eligibleRequest.preferred_currency
    ?.trim()
    .toUpperCase() || "USD"

// ======================================================
// CREATE NEGOTIATION
// ======================================================

const negotiation =
  await requestQuoteReview({
    requestId: id,
    clientId: user.id,
    requestedBudget,
    currency,
    reason,
    notes: notes || null,
  })


  await query(
  `
    UPDATE requests
    SET
      status = 'quote_review_requested',
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


      // ======================================================
      // NOTIFY ADMIN
      // ======================================================

      try {
        await notifyAdmins({
          type: "quote_review_requested",
          title:
            "Client requested quote review",
          message:
            reason ||
            "A client has requested a review of their quote.",
          metadata: {
            request_id: id,
            negotiation_id:
              negotiation.id,
            requested_budget:
              requestedBudget,
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

      return NextResponse.json(
        {
          success: true,
          decision: "review",
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

    if (action === "decline") {
      const reason = body.reason
        ? String(body.reason)
            .trim()
            .slice(0, 2000)
        : null

      const updated = await query(
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
          reason,
          QUOTE_STATUSES,
        ],
      )

      if (!updated.rows[0]) {
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
          reason,
        },
      )

      try {
        await notifyAdmins({
          type: "quote_rejected",
          title:
            "Client declined quote",
          message:
            reason ||
            "A client declined a quote.",
          metadata: {
            request_id: id,
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
          reason,
        },
      )

      return NextResponse.json({
        success: true,
        decision: "decline",
        request: updated.rows[0],
      })
    }

    // ========================================================
    // INVALID ACTION
    // ========================================================

    return NextResponse.json(
      {
        error: "Invalid decision action",
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