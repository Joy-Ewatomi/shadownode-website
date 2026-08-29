import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"

import {
  reviewQuoteAsSuperAdmin,
} from "@/lib/services/super-admin-quote-review-service"

type RouteContext = {
  params: Promise<{ id: string }>
}

function isSuperAdministratorRole(
  role: string | null | undefined,
): boolean {
  const normalized =
    String(role ?? "")
      .trim()
      .toLowerCase()

  return (
    normalized === "super_administrator" ||
    normalized === "super-administrator"
  )
}

function cleanString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : ""
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    /*
     * =====================================================
     * AUTHENTICATION
     * =====================================================
     */

    const user =
      await getCurrentUser()

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

    if (
      !isSuperAdministratorRole(
        user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Super Administrator access required",
        },
        {
          status: 403,
        },
      )
    }

    /*
     * =====================================================
     * REQUEST ID
     * =====================================================
     */

    const { id } =
      await params

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Request id is required",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    let body: Record<string, any>

    try {
      body =
        await request.json()
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid JSON request body",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =====================================================
     * ACTION
     * =====================================================
     */

    const rawAction =
      cleanString(
        body.decision_action ||
          body.action,
      ).toLowerCase()

    if (
      rawAction !== "accept" &&
      rawAction !== "adjust" &&
      rawAction !== "reject"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid action. Use accept, adjust, or reject.",
        },
        {
          status: 400,
        },
      )
    }

 /*
  * =====================================================
  * DECISION SOURCE
  * =====================================================
  */

const decisionSource =
  cleanString(
    body.decision_source,
  ).toLowerCase() || null

if (
  decisionSource !== null &&
  decisionSource !== "admin" &&
  decisionSource !== "ai" &&
  decisionSource !== "adjusted"
) {
  return NextResponse.json(
    {
      error:
        "Invalid decision source. Use admin, ai, or adjusted.",
    },
    {
      status: 400,
    },
  )
}

    /*
     * =====================================================
     * AMOUNT
     * ===================================================== */

    const amountValue =
      body.quote?.amount ??
      body.amount

    const amount =
      amountValue === null ||
      amountValue === undefined ||
      amountValue === ""
        ? null
        : Number(amountValue)

    if (
      rawAction !== "reject" &&
      (
        amount === null ||
        !Number.isFinite(amount) ||
        amount <= 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "A valid quote amount is required for accept and adjust decisions.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =====================================================
     * CURRENCY
     * =====================================================
     */

    const currencyValue =
      body.quote?.currency ??
      body.currency

    const currency =
      cleanString(
        currencyValue,
      ).toUpperCase() || null

    /*
     * =====================================================
     * JUSTIFICATION
     * ===================================================== */

    const reason =
      cleanString(
        body.justification?.reason ??
          body.reason,
      )

    const notes =
      cleanString(
        body.justification?.notes ??
          body.notes,
      ) || null

    if (!reason) {
      return NextResponse.json(
        {
          error:
            "A reason is required for every Super Administrator decision.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =====================================================
     * ESTIMATED COMPLETION
     * ===================================================== */

    const estimatedCompletion =
      cleanString(
        body.quote?.estimated_completion ??
          body.estimated_completion,
      ) || null

    /*
     * =====================================================
     * BUSINESS LOGIC
     * =====================================================
     *
     * The service is responsible for:
     *
     * - verifying the request state
     * - verifying the actor
     * - applying the decision
     * - recording the workflow audit
     * - updating the quote
     * - enforcing concurrency protection
     */

    const result =
  await reviewQuoteAsSuperAdmin({
    requestId: id,

    actorUserId:
      user.id,

    actorRole:
      user.role,

    action:
      rawAction,

    amount,

    currency,

    notes,

    reason,

    estimated_completion:
      estimatedCompletion,

    decision_source:
      decisionSource,
  })

    /*
     * =====================================================
     * SUCCESS
     * =====================================================
     */

  return NextResponse.json(result)
  } catch (error) {
    console.error(
      "SUPER ADMIN QUOTE REVIEW ERROR",
      error,
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to process Super Administrator quote review"

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    )
  }
}