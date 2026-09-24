import { NextRequest, NextResponse } from "next/server"

import { auditLog, getCurrentUser } from "@/lib/auth"
import { withTransaction } from "@/lib/db"
import { isSameOriginMutation } from "@/lib/security-center"
import {
  CUSTOM_SERVICE_TYPE,
  CustomRequestValidationError,
  buildCustomTriageRecommendation,
  parseCustomRequestInput,
} from "@/lib/custom-request-workflow"
import { notifyAdmins, notifyUser } from "@/lib/services/notification-service"

export const dynamic = "force-dynamic"
export const revalidate = 0

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, private" }

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: NO_STORE })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  if (user.role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE })

  try {
    const input = parseCustomRequestInput(await request.json())
    const triage = buildCustomTriageRecommendation(input)
    const created = await withTransaction(async (client) => {
      const recent = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM request_audit_events
         WHERE actor_user_id = $1 AND action = 'custom_request_submitted'
           AND created_at > NOW() - INTERVAL '1 hour'`,
        [user.id],
      )
      if (Number(recent.rows[0]?.count || 0) >= 5) throw new Error("RATE_LIMITED")

      const inserted = await client.query<{ id: string; case_number: string | null; created: boolean }>(
        `INSERT INTO requests (
          user_id, client_email, title, description, custom_description,
          service_type, status, priority, currency, preferred_currency,
          client_country, billing_country, supporting_links, custom_details,
          authorization_confirmed, terms_accepted, submission_key,
          communication_method, communication_email, communication_whatsapp,
          ai_analysis, ai_status, ai_complexity, ai_reasoning
        ) VALUES (
          $1, $2, $3, $4, $4, $5, 'pending_admin_review', $6, $7, $7,
          $8, $8, $9::jsonb, $10::jsonb, true, true, $11::uuid,
          $12, $13, $14, $15::jsonb, 'analyzed', $16, $17
        )
        ON CONFLICT (user_id, submission_key) WHERE submission_key IS NOT NULL
        DO UPDATE SET submission_key = EXCLUDED.submission_key
        RETURNING id, case_number, (xmax = 0) AS created`,
        [
          user.id, user.email, input.title || "Custom Service Request", input.objective,
          CUSTOM_SERVICE_TYPE, input.details.urgency === "urgent" ? "high" : "normal",
          input.preferredCurrency, input.billingCountry, JSON.stringify(input.supportingLinks),
          JSON.stringify(input.details), input.submissionKey, input.communicationMethod,
          input.communicationEmail, input.communicationWhatsapp,
          JSON.stringify(triage), triage.complexity,
          "Advisory triage only. Human review is required.",
        ],
      )
      const row = inserted.rows[0]
      if (!row) throw new Error("CREATE_FAILED")
      if (row.created) {
        await client.query(
          `INSERT INTO request_audit_events (request_id, actor_user_id, action, details)
           VALUES ($1, $2, 'custom_request_submitted', $3::jsonb)`,
          [row.id, user.id, JSON.stringify({ previous_status: null, new_status: "pending_admin_review", service_type: CUSTOM_SERVICE_TYPE })],
        )
      }
      return row
    })

    if (created.created) {
      await Promise.allSettled([
        notifyAdmins({
          type: "client_request",
          title: "New custom service request",
          message: "A custom service request requires administrator review.",
          metadata: { request_id: created.id, resource_type: "request", resource_id: created.id, audience: "administrator", target_page: "admin_request_review" },
        }),
        notifyUser(user.id, {
          type: "request_submitted",
          title: "Custom request received",
          message: "Your request has been received and is awaiting administrator review.",
          metadata: { request_id: created.id, resource_type: "request", resource_id: created.id },
        }),
        auditLog(user.id, "custom_request_submitted", request, { request_id: created.id }),
      ])
    }

    return NextResponse.json(
      { success: true, id: created.id, case_number: created.case_number, duplicate: !created.created },
      { status: created.created ? 201 : 200, headers: NO_STORE },
    )
  } catch (error) {
    if (error instanceof CustomRequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: NO_STORE })
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400, headers: NO_STORE })
    }
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: NO_STORE })
    }
    console.error("CUSTOM REQUEST CREATE ERROR:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to submit the request." }, { status: 500, headers: NO_STORE })
  }
}
