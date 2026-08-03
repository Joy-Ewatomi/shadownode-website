import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser } from "@/lib/auth"
import { reviewQuoteAsSuperAdmin } from "@/lib/services/super-admin-quote-review-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "super_administrator") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const body = await request.json()

    const result = await reviewQuoteAsSuperAdmin({
      requestId: id,
      actorUserId: user.id,
      actorRole: user.role,
      action: body.action === "adjust" ? "adjust" : "accept",
      amount: body.amount ? Number(body.amount) : null,
      currency: body.currency ? String(body.currency) : null,
      notes: body.notes ? String(body.notes) : null,
      reason: body.reason ? String(body.reason) : "",
      estimatedCompletion: body.estimated_completion ? String(body.estimated_completion) : null,
    })

    await auditLog(user.id, "super_admin_reviewed_quote", request, { request_id: id, action: body.action === "adjust" ? "adjust" : "accept" })
    await recordRequestAudit(id, user.id, "super_admin_reviewed_quote", { action: body.action === "adjust" ? "adjust" : "accept" })

    return NextResponse.json(result)
  } catch (error) {
    console.error("SUPER ADMIN QUOTE REVIEW ERROR", error)
    const message = error instanceof Error ? error.message : "Failed to process quote review"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
