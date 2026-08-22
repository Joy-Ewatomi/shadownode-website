import { NextRequest, NextResponse } from "next/server"
import { auditLog } from "@/lib/auth"
import { optionalText, profileIdForUser, recordInvestigationTimeline, requireInvestigationWorkspace } from "@/lib/investigation-workspace"
import { query } from "@/lib/db"
import { emitCaseWorkspaceEvent } from "@/lib/realtime/workspace-events"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const access = await requireInvestigationWorkspace(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const [reports, evidence, entities] = await Promise.all([
      query(
        `
        SELECT
          cr.id,
          cr.case_id,
          cr.title,
          cr.file_url,
          cr.summary,
          cr.created_by,
          cr.created_at,
          au.username AS created_by_username
        FROM case_reports cr
        LEFT JOIN user_profiles up ON up.id = cr.created_by
        LEFT JOIN app_users au ON au.id = up.user_id
        WHERE cr.case_id = $1
        ORDER BY cr.created_at DESC
        `,
        [access.caseId],
      ),
      query(
        `
        SELECT id, file_name, file_hash
        FROM forensic_files
        WHERE case_id = $1
        ORDER BY created_at DESC
        `,
        [access.caseId],
      ),
      query(
        `
        SELECT id, name, entity_type, confidence_score
        FROM investigation_entities
        WHERE case_id = $1
        ORDER BY created_at DESC
        `,
        [access.caseId],
      ),
    ])

    await auditLog(access.user.id, "reports_viewed", request, { case_id: access.caseId })

    return NextResponse.json({
      case_id: access.caseId,
      reports: reports.rows.map((report) => ({
        ...report,
        report_type: "intelligence",
        status: "published",
        classification: "internal",
        executive_summary: report.summary,
        updated_at: report.created_at,
        sections: [],
        evidence: [],
        entities: [],
      })),
      evidence: evidence.rows,
      entities: entities.rows,
    })
  } catch (error) {
    console.error("REPORTS GET ERROR", error)
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const access = await requireInvestigationWorkspace(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json()
    const title = optionalText(body.title)
    if (!title) return NextResponse.json({ error: "Report title required" }, { status: 400 })
    const creatorProfileId = await profileIdForUser(access.user.id)
    if (!creatorProfileId) return NextResponse.json({ error: "User profile missing" }, { status: 500 })

    const inserted = await query<{ id: string; title: string | null; summary: string | null }>(
      `
      INSERT INTO case_reports
        (case_id, title, file_url, summary, created_by)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        access.caseId,
        title,
        optionalText(body.file_url),
        optionalText(body.summary) ?? optionalText(body.executive_summary),
        creatorProfileId,
      ],
    )

    await emitCaseWorkspaceEvent({
      type: "report.created",
      case_id: access.caseId,
      actor_id: access.user.id,
      record_id: inserted.rows[0].id,
      data: { title },
    })
    await recordInvestigationTimeline(access.caseId, access.user.id, "report_published", "Report published", title)
    await emitCaseWorkspaceEvent({
      type: "report.published",
      case_id: access.caseId,
      actor_id: access.user.id,
      record_id: inserted.rows[0].id,
      data: { title },
    })
    await auditLog(access.user.id, "report_created", request, { case_id: access.caseId, report_id: inserted.rows[0].id })

    return NextResponse.json(inserted.rows[0], { status: 201 })
  } catch (error) {
    console.error("REPORTS POST ERROR", error)
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const access = await requireInvestigationWorkspace(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json()
    const reportId = optionalText(body.report_id)
    if (!reportId) return NextResponse.json({ error: "Report id required" }, { status: 400 })

    const updated = await query<{ id: string; title: string | null; summary: string | null }>(
      `
      UPDATE case_reports
      SET
        title = COALESCE($3, title),
        file_url = COALESCE($4, file_url),
        summary = COALESCE($5, summary)
      WHERE id = $1 AND case_id = $2
      RETURNING *
      `,
      [
        reportId,
        access.caseId,
        optionalText(body.title),
        optionalText(body.file_url),
        optionalText(body.summary) ?? optionalText(body.executive_summary),
      ],
    )

    if (!updated.rows.length) return NextResponse.json({ error: "Report not found" }, { status: 404 })

    if (body.action === "publish" || body.status === "published") {
      const title = updated.rows[0].title ?? "Case report"
      await recordInvestigationTimeline(access.caseId, access.user.id, "report_published", "Report published", title)
      await emitCaseWorkspaceEvent({
        type: "report.published",
        case_id: access.caseId,
        actor_id: access.user.id,
        record_id: reportId,
        data: { title },
      })
    }

    await auditLog(access.user.id, "report_updated", request, { case_id: access.caseId, report_id: reportId })
    return NextResponse.json(updated.rows[0])
  } catch (error) {
    console.error("REPORTS PATCH ERROR", error)
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
  }
}
