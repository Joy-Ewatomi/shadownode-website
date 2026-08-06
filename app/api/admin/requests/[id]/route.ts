import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"
import { createQuoteVersion } from "@/lib/services/quote-version-service"
import { notifySuperAdmins, notifyUser } from "@/lib/services/notification-service"
import { recordRequestAudit, sendQuote } from "@/lib/services/quote-workflow-service"

const requestStatuses = new Set(["pending_review", "reviewing", "approved", "quote_sent", "negotiation_requested", "negotiation_reviewing", "revised_quote_sent", "accepted", "active", "rejected", "declined", "submitted", "completed", "pending_admin_review", "admin_reviewed", "pending_super_admin_review", "awaiting_client_acceptance", "awaiting_payment"])

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (!isAdminRole(user.role)) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  return { user }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
   const auth = await requireAdmin()
if (auth.response) return auth.response

if (
  auth.user?.role !== "administrator" &&
  auth.user?.role !== "admin"
) {
  return NextResponse.json(
    { error: "Administrator access required" },
    { status: 403 }
  )
}

    const { id } = await params
    const body = await request.json()
    const action = String(body.action || "update")

    const notes = String(
      body.admin_quote_notes ||
      body.quote_notes ||
      ""
    ).trim()

    const current = await query<{
      id: string
      user_id: string | null
      title: string | null
      description: string | null
      priority: string | null
      timeline: string | null
      service_type: string | null
      case_number: string | null
      converted_case_id: string | null
      preferred_currency: string | null
    }>("SELECT * FROM requests WHERE id=$1 LIMIT 1", [id])

    const item = current.rows[0]
    if (!item) return NextResponse.json({ error: "Request not found" }, { status: 404 })

    const currency = String(
      body.approved_quote_currency || item?.preferred_currency || "USD"
    ).trim()

    if (action === "convert_to_case") {
      return NextResponse.json({ error: "Cases are created only after client quote acceptance" }, { status: 409 })
    }

    if (action === "send_quote") {
      const amount = Number(body.approved_quote_amount)
      if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Valid quote amount is required" }, { status: 400 })
      const updated = await sendQuote({
        requestId: id,
        actorUserId: auth.user?.id || "",
        amount,
        currency,
        notes: body.admin_quote_notes || body.quote_notes ? String(body.admin_quote_notes || body.quote_notes) : null,
        estimatedCompletion: body.approved_estimated_completion ? String(body.approved_estimated_completion) : null,
        adminAction: "sent_to_client",
        adminNotes: body.admin_quote_notes || body.quote_notes ? String(body.admin_quote_notes || body.quote_notes) : null,
      })
      await auditLog(auth.user?.id || null, "request_quote_sent", request, { request_id: id, approved_quote_amount: amount })
      return NextResponse.json(updated)
    }

    if (action === "adjust_quote") {
      const amount = Number(body.approved_quote_amount)
      const reason = String(body.admin_quote_notes || body.quote_notes || "").trim()
      const estimated_completion =
  body.approved_estimated_completion
    ? String(body.approved_estimated_completion).trim()
    : null


if (
  estimated_completion &&
  !/^\d{4}-\d{2}-\d{2}$/.test(estimated_completion)
) {
  return NextResponse.json(
    {
      error:
        "Estimated completion must be a valid date (YYYY-MM-DD)"
    },
    {
      status:400
    }
  )
}
      if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Valid quote amount is required" }, { status: 400 })
      if (!reason) return NextResponse.json({ error: "A reason is required" }, { status: 400 })
      const updated = await sendQuote({
        requestId: id,
        actorUserId: auth.user?.id || "",
        amount,
        currency,
        notes: reason,
        estimatedCompletion: body.approved_estimated_completion ? String(body.approved_estimated_completion) : null,
        adminAction: "adjusted",
        adminNotes: reason,
      })
      await auditLog(auth.user?.id || null, "request_quote_adjusted", request, { request_id: id, approved_quote_amount: amount })
      return NextResponse.json(updated)
    }

    if (action === "reject") {
      const reason = String(body.reason || body.admin_quote_notes || body.quote_notes || "").trim()
      if (!reason) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 })
      const updated = await query(
        `
        UPDATE requests
        SET
          status = 'rejected',
          declined_reason = $2,
          admin_quote_action = 'rejected',
          admin_quote_notes = $2,
          admin_reviewed_by = $3,
          admin_reviewed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [id, reason, auth.user?.id || null],
      )
      await auditLog(auth.user?.id || null, "request_rejected", request, { request_id: id })
      await recordRequestAudit(id, auth.user?.id || null, "request_rejected", { reason })
      if (item.user_id) {
        await notifyUser(item.user_id, {
          type: "quote_rejected",
          title: "Request rejected",
          message: item.title || "Your investigation request was rejected.",
          metadata: { request_id: id, target_page: "client_quote_review", action: "view_request" },
        })
      }
      return NextResponse.json(updated.rows[0])
    }

    if (action === "submit_for_super_admin_review") {
      const amount = Number(body.approved_quote_amount)
      const reason = String(body.reason || body.admin_quote_notes || body.quote_notes || "").trim()
      const estimated_completion = body.approved_estimated_completion ? String(body.approved_estimated_completion).trim() : null

      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { error: "A valid quote amount is required" },
          { status: 400 }
        )
      }

      if (!reason) {
        return NextResponse.json(
          { error: "A review note is required" },
          { status: 400 }
        )
      }

const allowedCurrencies = new Set([
 "USD",
 "EUR",
 "GBP",
 "NGN",
 "CNY"
])

if (!allowedCurrencies.has(currency)) {
 return NextResponse.json(
  {
   error:"Unsupported currency"
  },
  {
   status:400
  }
 )
}
      const adminVersion = await createQuoteVersion({
  requestId: id,
  userId: auth.user!.id,
  role: "administrator",
  source: "administrator",
  price: amount,
  currency,
  estimated_completion: estimated_completion,
  reasoning: reason,
  status: "pending_super_admin_review",
})
        console.log("ADMIN QUOTE VERSION CREATED", adminVersion)
    const updated = await query(
  `
  UPDATE requests
  SET
    status='pending_super_admin_review',
    approved_quote_amount=$2::numeric,
    approved_quote_currency=COALESCE($3,approved_quote_currency),
    approved_quote_notes=COALESCE($4,approved_quote_notes),
    approved_estimated_completion=COALESCE($5,approved_estimated_completion),
    admin_quote_action='submitted_for_review',
    admin_quote_notes=$6,
    admin_reviewed_by=$7,
    admin_reviewed_at=NOW(),
    updated_at=NOW()
  WHERE id=$1
  RETURNING *
  `,
  [
    id,
    amount,
    currency,
    notes,
    estimated_completion,
    reason,
    auth.user?.id || null,
  ]
)

      await auditLog(
        auth.user?.id || null,
        "request_submitted_for_super_admin_review",
        request,
        {
          request_id: id,
          approved_quote_amount: amount
        }
      )

      await recordRequestAudit(
        id,
        auth.user?.id || null,
        "request_submitted_for_super_admin_review",
        {
          approved_quote_amount: amount,
          reason
        }
      )

      await notifySuperAdmins({
        type: "quote_review",
        title: "Quote awaiting final approval",
        message: `${item.title || "Investigation request"} requires super administrator review.`,
       metadata: {
  request_id: id,
  quote_version_id: adminVersion.id,
  action: "review_quote",
  target_page: "super_admin_request_review",
}
      })

      return NextResponse.json(updated.rows[0])
    }
  } catch (error) {
    console.error("ADMIN REQUEST PATCH ERROR", error)
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }
}
