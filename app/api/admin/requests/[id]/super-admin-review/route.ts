import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"

import {
  reviewQuoteAsSuperAdmin,
} from "@/lib/services/super-admin-quote-review-service"

type RouteContext = {
  params: Promise<{ id: string }>
}

type DecisionAction =
  | "accept"
  | "adjust"
  | "reject"

type DecisionSource =
  | "admin"
  | "ai"
  | "adjusted"
  | "client_negotiated"

function isSuperAdministratorRole(
  role: string | null | undefined,
): boolean {
  const normalized =
    String(role ?? "")
      .trim()
      .toLowerCase()

  return (
    normalized ===
      "super_administrator" ||
    normalized ===
      "super-administrator" ||
    normalized ===
      "super_admin"
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

    /*
     * =====================================================
     * ROLE
     * =====================================================
     */

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

    let body: Record<
      string,
      unknown
    >

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
     *
     * Accept:
     *   Administrator quote
     *   AI quote
     *   Negotiated quote
     *
     * Adjust:
     *   Super Administrator changes quote
     *
     * Reject:
     *   Super Administrator rejects request
     */

    const rawAction =
      cleanString(
        body.decision_action ??
          body.action,
      ).toLowerCase() as
        | DecisionAction
        | ""

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
     *
     * admin
     * ai
     * adjusted
     * client_negotiated
     */

    const decisionSourceRaw =
      cleanString(
        body.decision_source,
      ).toLowerCase()

    const decisionSource =
      decisionSourceRaw === ""
        ? null
        : (
            decisionSourceRaw as
              | DecisionSource
          )

    if (
      decisionSource !== null &&
      decisionSource !== "admin" &&
      decisionSource !== "ai" &&
      decisionSource !== "adjusted" &&
      decisionSource !==
        "client_negotiated"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid decision source. Use admin, ai, adjusted, or client_negotiated.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =====================================================
     * AMOUNT
     * =====================================================
     */

    const quoteObject =
      typeof body.quote ===
        "object" &&
      body.quote !== null
        ? (
            body.quote as Record<
              string,
              unknown
            >
          )
        : null

    const amountValue =
      quoteObject?.amount ??
      body.amount

    const amount =
      amountValue ===
        null ||
      amountValue ===
        undefined ||
      amountValue === ""
        ? null
        : Number(
            amountValue,
          )

    /*
     * Reject does not require
     * a quote amount.
     */

    if (
      rawAction !== "reject" &&
      (
        amount === null ||
        !Number.isFinite(
          amount,
        ) ||
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
      quoteObject?.currency ??
      body.currency

    const currency =
      cleanString(
        currencyValue,
      ).toUpperCase() || null

    /*
     * A quote decision must always
     * specify a currency except rejection.
     */

    if (
      rawAction !== "reject" &&
      !currency
    ) {
      return NextResponse.json(
        {
          error:
            "Quote currency is required.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =====================================================
     * NEGOTIATED CURRENCY RULE
     * =====================================================
     *
     * client_negotiated means the quote stays in the
     * client's negotiation currency.
     *
     * The actual authoritative verification is performed
     * by reviewQuoteAsSuperAdmin().
     *
     * This route simply makes the intent explicit.
     */

    if (
      decisionSource ===
        "client_negotiated" &&
      rawAction !== "reject" &&
      !currency
    ) {
      return NextResponse.json(
        {
          error:
            "Negotiated decisions require the client's negotiation currency.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =====================================================
     * JUSTIFICATION
     * =====================================================
     */

    const justificationObject =
      typeof body.justification ===
        "object" &&
      body.justification !== null
        ? (
            body.justification as Record<
              string,
              unknown
            >
          )
        : null

    const reason =
      cleanString(
        justificationObject?.reason ??
          body.reason,
      )

    const notes =
      cleanString(
        justificationObject?.notes ??
          body.notes,
      ) || null

    /*
     * Every decision requires a reason.
     */

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
     * =====================================================
     */

    const estimatedCompletion =
      cleanString(
        quoteObject?.estimated_completion ??
          body.estimated_completion,
      ) || null

    /*
     * =====================================================
     * DECISION-SOURCE CONSISTENCY
     * =====================================================
     */

    if (
      rawAction === "adjust" &&
      decisionSource !==
        "adjusted"
    ) {
      return NextResponse.json(
        {
          error:
            "Adjusted decisions must use decision_source='adjusted'.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Negotiated approval must explicitly
     * identify itself as negotiated.
     */

    if (
      decisionSource ===
        "client_negotiated" &&
      rawAction !== "accept"
    ) {
      return NextResponse.json(
        {
          error:
            "client_negotiated can only be used for an accepted negotiated quote.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =====================================================
     * BUSINESS LOGIC
     * =====================================================
     *
     * reviewQuoteAsSuperAdmin() is the authoritative layer
     * responsible for:
     *
     * - actor verification
     * - request state verification
     * - negotiation state verification
     * - currency consistency
     * - quote version creation
     * - final request update
     * - audit recording
     * - concurrency protection
     */

    const result =
      await reviewQuoteAsSuperAdmin({
        requestId:
          id,

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

    return NextResponse.json(
      result,
      {
        status: 200,
      },
    )

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
        error:
          message,
      },
      {
        status: 400,
      },
    )
  }
}