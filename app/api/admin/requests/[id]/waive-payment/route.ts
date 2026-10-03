import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { isSameOriginMutation } from "@/lib/security-center"
import { waiveRequestPayment } from "@/lib/services/payment-waiver-service"

export const dynamic = "force-dynamic"
const NO_STORE = { "Cache-Control": "private, no-store" }
const SAFE_CONFLICTS = new Set([
  "A waiver reason between 10 and 500 characters is required",
  "Only an accepted request awaiting payment can be waived",
  "Request has no unambiguous payable engagement",
  "Payment cannot be waived after a payment attempt has started",
  "Case is not eligible for a payment waiver",
  "Training engagement is not eligible for a payment waiver",
])

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: NO_STORE })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: NO_STORE })
  }
  const body = await request.json().catch(() => null)
  const reason = typeof body?.reason === "string" ? body.reason : ""
  try {
    const result = await waiveRequestPayment({ requestId: id, actorUserId: user.id, actorRole: user.role, reason })
    return NextResponse.json(result, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment waiver could not be completed"
    const status = message === "Forbidden" ? 403 : message === "Request not found" ? 404 : 409
    const safeMessage = status === 403
      ? "Forbidden"
      : status === 404
        ? "Request not found"
        : SAFE_CONFLICTS.has(message)
          ? message
          : "Payment waiver could not be completed"
    return NextResponse.json({ error: safeMessage }, { status, headers: NO_STORE })
  }
}
