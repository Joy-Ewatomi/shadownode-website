import { query } from "@/lib/db"
import { notifyUser } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"

export async function convertAcceptedRequestToCase(requestId: string, actorUserId: string) {
  const current = await query<{
    id: string
    case_number: string | null
    user_id: string | null
    title: string | null
    description: string | null
    service_type: string | null
    category: string | null
    ai_suggested_priority: string | null
    urgency: string | null
    approved_quote_amount: number | null
    approved_estimated_completion: string | null
    preferred_deadline: string | null
    converted_case_id: string | null
  }>("SELECT * FROM requests WHERE id=$1 AND user_id=$2 LIMIT 1", [requestId, actorUserId])
  const item = current.rows[0]
  if (!item) throw new Error("Request not found")
  if (item.converted_case_id) return item.converted_case_id

  const profile = item.user_id ? await query<{ id: string; organization_id: string | null }>("SELECT id, organization_id FROM user_profiles WHERE user_id=$1 LIMIT 1", [item.user_id]) : { rows: [] }
  const investigator = await query<{ id: string; user_id: string | null }>(
    `
    SELECT up.id, up.user_id
    FROM user_profiles up
    JOIN app_users au ON au.id=up.user_id
    WHERE au.role='investigator' AND au.status='active'
    ORDER BY up.created_at ASC
    LIMIT 1
    `,
  ).catch(() => ({ rows: [] }))
  const caseNumber = item.case_number || `SN-${new Date().getFullYear()}-${Date.now()}`
  const created = await query<{ id: string }>(
    `
    INSERT INTO cases
      (organization_id, case_number, client_profile_id, case_user_id, title, description, service_type, status, priority, assigned_to, budget, estimated_completion, progress, payment_status, started_at)
    VALUES
      (COALESCE($1, (SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1)), $2, $3, $3, $4, $5, $6, 'active', $7, $8, $9, $10, 0, 'pending', NOW())
    RETURNING id
    `,
    [profile.rows[0]?.organization_id || null, caseNumber, profile.rows[0]?.id || null, item.title || "Investigation request", item.description || null, item.service_type || item.category || "osint", item.ai_suggested_priority || item.urgency || "normal", investigator.rows[0]?.id || null, item.approved_quote_amount || null, item.approved_estimated_completion || item.preferred_deadline || null],
  )
  const caseId = created.rows[0].id
  await query("UPDATE requests SET status='active', converted_case_id=$2, client_decision_at=NOW(), updated_at=NOW() WHERE id=$1", [requestId, caseId])
  await query("INSERT INTO case_updates (case_id, updated_by, update_type, title, content) VALUES ($1, $2, 'status_change', 'Case created', 'Client accepted the final quote and the investigation case was opened.')", [caseId, profile.rows[0]?.id || null])
  if (investigator.rows[0]?.id) {
    await query("INSERT INTO case_assignments (case_id, assigned_to, assignment_role, status, assigned_by) VALUES ($1, $2, 'investigator', 'assigned', $3)", [caseId, investigator.rows[0].id, actorUserId]).catch(() => undefined)
    await notifyUser(investigator.rows[0].user_id, { caseId, type: "assignment_completed", title: "New case assignment", message: item.title || "A new investigation case was assigned.", metadata: { request_id: requestId } })
  }
  await notifyUser(item.user_id, { caseId, type: "case_created", title: "Case created", message: "Your accepted quote has been converted into an active investigation.", metadata: { request_id: requestId } })
  await recordRequestAudit(requestId, actorUserId, "client_accepted_quote_case_created", { case_id: caseId })
  return caseId
}
