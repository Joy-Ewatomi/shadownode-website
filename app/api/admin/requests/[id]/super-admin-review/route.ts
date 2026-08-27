import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser } from "@/lib/auth"
import { reviewQuoteAsSuperAdmin } from "@/lib/services/super-admin-quote-review-service"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (user.role !== "super_administrator") {
      return NextResponse.json(
        {
          error:
            "Super administrator access required",
        },
        { status: 403 },
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Request id is required",
        },
        { status: 400 },
      )
    }

    const body = await request.json()


    /**
     * ACTION
     * Supports new dashboard payload
     * and old payload format
     */
    const rawAction = String(
      body.decision_action ||
        body.action ||
        "",
    )
      .trim()
      .toLowerCase()


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
        { status: 400 },
      )
    }


    /**
     * QUOTE AMOUNT
     */
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
      amount !== null &&
      (!Number.isFinite(amount) ||
        amount <= 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Quote amount must be greater than zero",
        },
        { status: 400 },
      )
    }


    /**
     * CURRENCY
     */
    const currencyValue =
      body.quote?.currency ??
      body.currency


    const currency =
      currencyValue !== null &&
      currencyValue !== undefined &&
      String(currencyValue).trim()
        ? String(currencyValue)
            .trim()
            .toUpperCase()
        : null


    /**
     * JUSTIFICATION
     */
    const notesValue =
      body.justification?.notes ??
      body.notes


    const notes =
      notesValue !== null &&
      notesValue !== undefined
        ? String(notesValue).trim() || null
        : null


    const reasonValue =
      body.justification?.reason ??
      body.reason


    const reason =
      reasonValue !== null &&
      reasonValue !== undefined
        ? String(reasonValue).trim()
        : ""


    /**
     * COMPLETION DATE
     */
    const estimatedCompletionValue =
      body.quote?.estimated_completion ??
      body.estimated_completion


    const estimatedCompletion =
      estimatedCompletionValue !== null &&
      estimatedCompletionValue !== undefined
        ? String(
            estimatedCompletionValue,
          ).trim() || null
        : null



    if (!reason) {
      return NextResponse.json(
        {
          error:
            "A reason is required for every decision",
        },
        { status: 400 },
      )
    }



    const result =
      await reviewQuoteAsSuperAdmin({
        requestId: id,
        actorUserId: user.id,
        actorRole: user.role,

        action: rawAction,

        amount,

        currency,

        notes,

        reason,

        estimated_completion:
          estimatedCompletion,
      })



    await auditLog(
      user.id,
      "super_admin_reviewed_quote",
      request,
      {
        request_id: id,
        action: rawAction,
      },
    )


    return NextResponse.json({
      ...result,
      success: true,
    })


  } catch (error) {
    console.error(
      "SUPER ADMIN QUOTE REVIEW ERROR",
      error,
    )


    const message =
      error instanceof Error
        ? error.message
        : "Failed to process quote review"


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