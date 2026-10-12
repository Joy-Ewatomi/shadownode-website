import { NextRequest, NextResponse } from "next/server"

import { auditLog, getCurrentUser } from "@/lib/auth"
import { query, withTransaction } from "@/lib/db"
import { isSuperAdministratorRole } from "@/lib/role-access"
import { isSameOriginMutation } from "@/lib/security-center"

const NO_STORE = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

type InternalCase = {
  id: string
  case_number: string
}

type DependencyCounts = Record<string, number | string>

const dependencyLabels: Record<string, string> = {
  evidence_count: "evidence files",
  report_count: "reports",
  entity_count: "graph entities",
  relationship_count: "graph relationships",
  source_count: "intelligence sources",
  timeline_count: "timeline events",
  observation_count: "observations",
  task_count: "review tasks",
  message_count: "messages",
  conversation_count: "conversations",
  note_count: "case notes",
  analysis_count: "analysis results",
  payment_count: "payments",
  notification_count: "notifications",
  activity_count: "activity records",
  workflow_count: "workflow records",
  search_result_count: "intelligence search results",
  report_version_count: "approved report versions",
  report_artifact_count: "report artifacts",
  extra_update_count: "additional case updates",
  extra_assignment_count: "additional case assignments",
}

function cleanConfirmation(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginMutation(request)) {
    return responseError("Request could not be verified.", 403)
  }

  const user = await getCurrentUser()
  if (!user) return responseError("Authentication required.", 401)
  if (!isSuperAdministratorRole(user.role)) {
    return responseError("This action requires super-administrator access.", 403)
  }

  const { id: caseId } = await context.params
  const body = await request.json().catch(() => ({})) as { case_number?: unknown }
  const confirmation = cleanConfirmation(body.case_number)

  try {
    const deleted = await withTransaction(async (client) => {
      const internalCase = await client.query<InternalCase>(
        `
          SELECT c.id, c.case_number
          FROM cases c
          WHERE c.id = $1
            AND c.client_profile_id IS NULL
            AND c.case_user_id IS NULL
            AND COALESCE(c.payment_status, '') = 'waived'
            AND NOT EXISTS (
              SELECT 1 FROM requests request_record
              WHERE request_record.converted_case_id = c.id
            )
            AND EXISTS (
              SELECT 1 FROM case_updates update_record
              WHERE update_record.case_id = c.id
                AND update_record.update_type = 'internal_case_created'
            )
          LIMIT 1
          FOR UPDATE
        `,
        [caseId],
      )
      const caseRecord = internalCase.rows[0]
      if (!caseRecord) throw new Error("INTERNAL_CASE_NOT_FOUND")
      if (confirmation !== caseRecord.case_number) throw new Error("CONFIRMATION_MISMATCH")

      const dependencies = await client.query<DependencyCounts>(
        `
          SELECT
            (SELECT COUNT(*) FROM forensic_files WHERE case_id = $1)::int AS evidence_count,
            (SELECT COUNT(*) FROM case_reports WHERE case_id = $1)::int AS report_count,
            (SELECT COUNT(*) FROM investigation_entities WHERE case_id = $1)::int AS entity_count,
            (SELECT COUNT(*) FROM entity_relationships WHERE case_id = $1)::int AS relationship_count,
            (SELECT COUNT(*) FROM intelligence_sources WHERE case_id = $1)::int AS source_count,
            (SELECT COUNT(*) FROM investigation_timeline WHERE case_id = $1)::int AS timeline_count,
            (SELECT COUNT(*) FROM intelligence_observations WHERE case_id = $1)::int AS observation_count,
            (SELECT COUNT(*) FROM investigation_tasks WHERE case_id = $1)::int AS task_count,
            (SELECT COUNT(*) FROM messages WHERE case_id = $1)::int AS message_count,
            (SELECT COUNT(*) FROM conversations WHERE case_id = $1)::int AS conversation_count,
            (SELECT COUNT(*) FROM case_notes WHERE case_id = $1)::int AS note_count,
            (SELECT COUNT(*) FROM analysis_results WHERE case_id = $1)::int AS analysis_count,
            (SELECT COUNT(*) FROM payments WHERE case_id = $1)::int AS payment_count,
            (SELECT COUNT(*) FROM notifications WHERE case_id = $1)::int AS notification_count,
            (SELECT COUNT(*) FROM activity_logs WHERE case_id = $1)::int AS activity_count,
            (SELECT COUNT(*) FROM workflow_history WHERE case_id = $1)::int AS workflow_count,
            (SELECT COUNT(*) FROM osint_search_results WHERE case_id = $1)::int AS search_result_count,
            (SELECT COUNT(*) FROM case_report_versions WHERE case_id = $1)::int AS report_version_count,
            (SELECT COUNT(*) FROM case_report_artifacts WHERE case_id = $1)::int AS report_artifact_count,
            GREATEST((SELECT COUNT(*) FROM case_updates WHERE case_id = $1) - 1, 0)::int AS extra_update_count,
            GREATEST((SELECT COUNT(*) FROM case_assignments WHERE case_id = $1) - 1, 0)::int AS extra_assignment_count
        `,
        [caseId],
      )
      const blockers = Object.entries(dependencies.rows[0] || {})
        .filter(([, count]) => Number(count) > 0)
        .map(([key, count]) => `${count} ${dependencyLabels[key] || key}`)
      if (blockers.length) throw new Error(`CASE_NOT_EMPTY:${blockers.join(", ")}`)

      // Only the initial creation update and self-assignment remain after the empty-case checks above.
      await client.query("DELETE FROM case_assignments WHERE case_id = $1", [caseId])
      await client.query("DELETE FROM case_updates WHERE case_id = $1", [caseId])

      const result = await client.query<InternalCase>(
        "DELETE FROM cases WHERE id = $1 RETURNING id, case_number",
        [caseId],
      )
      if (!result.rows[0]) throw new Error("INTERNAL_CASE_NOT_FOUND")
      return result.rows[0]
    })

    await auditLog(user.id, "internal_case_deleted", request, {
      case_id: deleted.id,
      case_number: deleted.case_number,
    })

    return NextResponse.json({ ok: true, case_number: deleted.case_number }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message === "INTERNAL_CASE_NOT_FOUND") {
      return responseError("Internal case not found or not eligible for deletion.", 404)
    }
    if (message === "CONFIRMATION_MISMATCH") {
      return responseError("Type the exact case number to confirm deletion.", 400)
    }
    if (message.startsWith("CASE_NOT_EMPTY:")) {
      return responseError(`This internal case cannot be deleted because it contains ${message.slice("CASE_NOT_EMPTY:".length)}. Archive it instead.`, 409)
    }

    console.error("INTERNAL CASE DELETE ERROR:", error)
    return responseError("The internal case could not be deleted.", 500)
  }
}
