import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { analyzeRequest } from "@/lib/services/request-analysis-service"
import { notifyAdmins } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"

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
        quote_notes,
        ai_price_estimate,
        ai_complexity,
        ai_estimated_hours,
        ai_suggested_service,
        ai_suggested_priority,
        ai_confidence,
        ai_reasoning,
        approved_quote_amount,
        approved_quote_currency,
        approved_quote_notes,
        approved_estimated_completion,
        converted_case_id,
        created_at,
        updated_at
      FROM requests
      WHERE user_id = $1
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
    const analysis = analyzeRequest({ serviceType: category, description, urgency, timeline: body.preferred_deadline ? "standard" : urgency })

    const inserted = await query<{ id: string }>(
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
          user_id,
          client_email,
          is_anonymous,
          priority,
          timeline,
          currency,
          estimated_price,
          ai_price_estimate,
          ai_complexity,
          ai_estimated_hours,
          ai_suggested_service,
          ai_suggested_priority,
          ai_confidence,
          ai_reasoning,
          created_at,
          updated_at
        )
      VALUES
        ($1, $2, $3, $4, $4, $5, $6, $7, 'pending_review', $8, $9, false, $11, $10, 'NGN', $12, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
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
        analysis.suggestedPriority,
        analysis.suggestedPrice,
        analysis.complexity,
        analysis.estimatedHours,
        analysis.suggestedService,
        analysis.suggestedPriority,
        analysis.confidence,
        analysis.reasoning,
      ],
    )

    await notifyAdmins({
      type: "client_request",
      title: "New client investigation request",
      message: `${user.username} submitted ${title} (${trackingNumber})`,
      metadata: { request_id: inserted.rows[0].id },
    })
    await recordRequestAudit(inserted.rows[0].id, user.id, "ai_estimate_generated", {
      suggested_price: analysis.suggestedPrice,
      confidence: analysis.confidence,
    })

    await auditLog(user.id, "client_request_created", request, { request_id: inserted.rows[0].id })

    return NextResponse.json(inserted.rows[0], { status: 201 })
  } catch (error) {
    console.error("CLIENT REQUESTS POST ERROR", error)
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 })
  }
}
