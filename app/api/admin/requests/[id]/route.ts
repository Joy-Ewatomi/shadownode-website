import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

const requestStatuses = new Set(["pending_review", "reviewing", "approved", "quote_sent", "payment_pending", "active", "rejected", "submitted", "completed"])

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

    const { id } = await params
    const body = await request.json()
    const action = String(body.action || "update")

    const current = await query<{
      id: string
      client_id: string | null
      title: string | null
      description: string | null
      category: string | null
      service_type: string | null
      urgency: string | null
      preferred_deadline: string | null
      case_number: string | null
      converted_case_id: string | null
    }>("SELECT * FROM requests WHERE id=$1 LIMIT 1", [id])

    const item = current.rows[0]
    if (!item) return NextResponse.json({ error: "Request not found" }, { status: 404 })

    if (action === "convert_to_case") {
      if (item.converted_case_id) return NextResponse.json({ error: "Request already converted" }, { status: 400 })

      const profile = item.client_id
        ? await query<{ id: string }>("SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1", [item.client_id]).catch(() => ({ rows: [] }))
        : { rows: [] }

      const caseNumber = item.case_number || `SN-${new Date().getFullYear()}-${Date.now()}`
      const created = await query<{ id: string }>(
        `
        INSERT INTO cases
          (organization_id, case_number, client_profile_id, case_user_id, title, description, service_type, status, priority, estimated_completion)
        VALUES
          (
            (SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1),
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            'active',
            $7,
            $8
          )
        RETURNING id
        `,
        [
          caseNumber,
          profile.rows[0]?.id || null,
          profile.rows[0]?.id || null,
          item.title || `${item.service_type || item.category || "Investigation"} Request`,
          item.description,
          item.service_type || item.category || "osint",
          item.urgency || "normal",
          item.preferred_deadline || null,
        ],
      )

      const updated = await query(
        `
        UPDATE requests
        SET status='active', converted_case_id=$2, reviewed_by=$3, updated_at=NOW()
        WHERE id=$1
        RETURNING *
        `,
        [id, created.rows[0].id, auth.user?.id || null],
      )

      await auditLog(auth.user?.id || null, "request_converted_to_case", request, { request_id: id, case_id: created.rows[0].id })
      return NextResponse.json(updated.rows[0])
    }

    const nextStatus = body.status ? String(body.status) : null
    if (nextStatus && !requestStatuses.has(nextStatus)) {
      return NextResponse.json({ error: "Invalid request status" }, { status: 400 })
    }

    const updated = await query(
      `
      UPDATE requests
      SET
        status = COALESCE($2, status),
        quote_amount = COALESCE($3, quote_amount),
        quote_currency = COALESCE($4, quote_currency),
        quote_notes = COALESCE($5, quote_notes),
        final_price = COALESCE($6, final_price),
        reviewed_by = $7,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        nextStatus,
        body.quote_amount ?? null,
        body.quote_currency ?? null,
        body.quote_notes ?? null,
        body.final_price ?? body.quote_amount ?? null,
        auth.user?.id || null,
      ],
    )

    await auditLog(auth.user?.id || null, "request_review_updated", request, {
      request_id: id,
      action,
      status: nextStatus,
      quote_amount: body.quote_amount ?? null,
    })

    return NextResponse.json(updated.rows[0])
  } catch (error) {
    console.error("ADMIN REQUEST PATCH ERROR", error)
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }
}
