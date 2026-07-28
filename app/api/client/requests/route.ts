import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

const statuses = new Set(["pending_review", "reviewing", "approved", "quote_sent", "payment_pending", "active", "rejected"])

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const requests = await query(
      `
      SELECT
        id,
        case_number,
        title,
        category,
        service_type,
        description,
        urgency,
        preferred_deadline,
        status,
        quote_amount,
        quote_currency,
        quote_notes,
        converted_case_id,
        created_at,
        updated_at
      FROM requests
      WHERE client_id = $1
      ORDER BY created_at DESC
      `,
      [user.id],
    )

    return NextResponse.json(requests.rows)
  } catch (error) {
    console.error("CLIENT REQUESTS GET ERROR", error)
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const title = String(body.title || "").trim()
    const category = String(body.category || "").trim()
    const description = String(body.description || "").trim()
    const urgency = String(body.urgency || "normal").trim()

    if (!title || !category || description.length < 20) {
      return NextResponse.json({ error: "Title, category, and a 20+ character description are required" }, { status: 400 })
    }

    const year = new Date().getFullYear()
    const existing = await query<{ total: string | number }>(
      `
      SELECT COUNT(*) AS total
      FROM requests
      WHERE created_at >= $1
        AND created_at < $2
      `,
      [`${year}-01-01`, `${year + 1}-01-01`],
    )
    const trackingNumber = `SN-${year}-${String(Number(existing.rows[0]?.total || 0) + 1).padStart(6, "0")}`

    const inserted = await query(
      `
      INSERT INTO requests
        (
          token,
          case_number,
          title,
          category,
          service_type,
          description,
          urgency,
          preferred_deadline,
          status,
          client_id,
          client_email,
          is_anonymous,
          priority,
          timeline,
          currency,
          created_at,
          updated_at
        )
      VALUES
        ($1, $2, $3, $4, $4, $5, $6, $7, 'pending_review', $8, $9, false, $6, $10, 'NGN', NOW(), NOW())
      RETURNING *
      `,
      [
        nanoid(32),
        trackingNumber,
        title,
        category,
        description,
        urgency,
        body.preferred_deadline || null,
        user.id,
        user.email,
        body.preferred_deadline || urgency,
      ],
    )

    await query(
      `
      INSERT INTO notifications (user_id, type, title, message, is_read)
      SELECT id, 'client_request', 'New client investigation request', $1, false
      FROM app_users
      WHERE role IN ('administrator', 'super_administrator')
        AND status = 'active'
      `,
      [`${user.username} submitted ${title} (${trackingNumber})`],
    ).catch(() => undefined)

    await auditLog(user.id, "client_request_created", request, { request_id: inserted.rows[0].id })

    return NextResponse.json(inserted.rows[0], { status: 201 })
  } catch (error) {
    console.error("CLIENT REQUESTS POST ERROR", error)
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 })
  }
}
