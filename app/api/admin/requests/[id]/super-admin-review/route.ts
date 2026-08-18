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
        {  error:"Super administrator access required"},
        { status: 403 },
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Request id is required" },
        { status: 400 },
      )
    }

    const body = await request.json()

    const rawAction = String(body.action || "")
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

    const amount =
      body.amount === null ||
      body.amount === undefined ||
      body.amount === ""
        ? null
        : Number(body.amount)

    if (
      amount !== null &&
      (!Number.isFinite(amount) || amount <= 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Quote amount must be greater than zero",
        },
        { status: 400 },
      )
    }

    const currency =
      body.currency !== null &&
      body.currency !== undefined &&
      String(body.currency).trim()
        ? String(body.currency).trim().toUpperCase()
        : null

    const notes =
      body.notes !== null &&
      body.notes !== undefined
        ? String(body.notes).trim() || null
        : null

    const reason =
      body.reason !== null &&
      body.reason !== undefined
        ? String(body.reason).trim()
        : ""

    const estimatedCompletion =
      body.estimated_completion !== null &&
      body.estimated_completion !== undefined
        ? String(body.estimated_completion).trim() || null
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

    const result = await reviewQuoteAsSuperAdmin({
      requestId: id,
      actorUserId: user.id,
      actorRole: user.role,
      action: rawAction,
      amount,
      currency,
      notes,
      reason,
      estimated_completion: estimatedCompletion,
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
      { error: message },
      { status: 400 },
    )
  }
}