import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"
import { recordInvestigationTimeline } from "@/lib/investigation-workspace"

const statuses = new Set(["draft", "review", "approved", "published"])

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value)
}

async function resolveCaseId(caseId: string) {
  if (isUuid(caseId)) return caseId

  const result = await query<{ id: string }>(
    "SELECT id FROM cases WHERE case_number=$1 OR id::text=$1 LIMIT 1",
    [caseId],
  )

  return result.rows[0]?.id ?? null
}

async function profileIdForUser(userId: string) {
  const profile = await query<{ id: string }>(
    "SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1",
    [userId],
  ).catch(() => ({ rows: [] }))

  return profile.rows[0]?.id ?? null
}

async function canUseReports(userId: string, role: string, caseId: string) {
  if (isAdminRole(role)) return true
  if (!["investigator", "analyst"].includes(role)) return false

  const profileId = await profileIdForUser(userId)
  if (!profileId) return false

  const access = await query<{ id: string }>(
    `
    SELECT c.id
    FROM cases c
    LEFT JOIN case_assignments ca
      ON ca.case_id = c.id
      AND ca.assigned_to = $2
      AND ca.removed_at IS NULL
      AND COALESCE(ca.status, 'assigned') <> 'removed'
    WHERE c.id = $1
      AND (
        c.assigned_to = $2
        OR ca.id IS NOT NULL
      )
    LIMIT 1
    `,
    [caseId, profileId],
  )

  return Boolean(access.rows.length)
}

async function reportBelongsToCase(reportId: string, caseId: string) {
  const report = await query<{ id: string }>(
    "SELECT id FROM case_reports WHERE id=$1 AND case_id=$2 LIMIT 1",
    [reportId, caseId],
  )
  return Boolean(report.rows.length)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const caseId = await resolveCaseId(id)
    if (!caseId) return NextResponse.json({ error: "Case not found" }, { status: 404 })
    if (!(await canUseReports(user.id, user.role, caseId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const [reports, evidence, entities] = await Promise.all([
      query(
        `
        SELECT
          cr.*,
          creator.username AS created_by_username,
          approver.username AS approved_by_username,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', rs.id,
                'section_type', rs.section_type,
                'title', rs.title,
                'content', rs.content,
                'order_index', rs.order_index,
                'created_at', rs.created_at
              )
            ) FILTER (WHERE rs.id IS NOT NULL),
            '[]'::json
          ) AS sections,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', ef.id,
                'file_name', ef.file_name,
                'status', ef.status,
                'sha256_hash', ef.sha256_hash
              )
            ) FILTER (WHERE ef.id IS NOT NULL),
            '[]'::json
          ) AS evidence,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', ie.id,
                'name', ie.name,
                'entity_type', ie.entity_type,
                'confidence_score', ie.confidence_score
              )
            ) FILTER (WHERE ie.id IS NOT NULL),
            '[]'::json
          ) AS entities
        FROM case_reports cr
        LEFT JOIN app_users creator ON creator.id = cr.created_by
        LEFT JOIN app_users approver ON approver.id = cr.approved_by
        LEFT JOIN report_sections rs ON rs.report_id = cr.id
        LEFT JOIN report_evidence_links rel ON rel.report_id = cr.id
        LEFT JOIN evidence_files ef ON ef.id = rel.evidence_id
        LEFT JOIN report_entity_links renl ON renl.report_id = cr.id
        LEFT JOIN investigation_entities ie ON ie.id = renl.entity_id
        WHERE cr.case_id = $1
        GROUP BY cr.id, creator.username, approver.username
        ORDER BY cr.created_at DESC
        `,
        [caseId],
      ),
      query(
        `
        SELECT id, file_name, status, sha256_hash
        FROM evidence_files
        WHERE case_id = $1
        ORDER BY created_at DESC
        `,
        [caseId],
      ),
      query(
        `
        SELECT id, name, entity_type, confidence_score
        FROM investigation_entities
        WHERE case_id = $1
        ORDER BY created_at DESC
        `,
        [caseId],
      ),
    ])

    await auditLog(user.id, "reports_viewed", request, { case_id: caseId })

    return NextResponse.json({
      case_id: caseId,
      reports: reports.rows,
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
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const caseId = await resolveCaseId(id)
    if (!caseId) return NextResponse.json({ error: "Case not found" }, { status: 404 })
    if (!(await canUseReports(user.id, user.role, caseId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    if (!body.title) return NextResponse.json({ error: "Report title required" }, { status: 400 })

    const inserted = await query(
      `
      INSERT INTO case_reports
        (case_id, title, report_type, status, classification, executive_summary, created_by)
      VALUES
        ($1, $2, $3, 'draft', $4, $5, $6)
      RETURNING *
      `,
      [
        caseId,
        body.title,
        body.report_type ?? "intelligence",
        body.classification ?? "internal",
        body.executive_summary ?? null,
        user.id,
      ],
    )

    await auditLog(user.id, "report_draft_created", request, { case_id: caseId, report_id: inserted.rows[0].id })
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
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const caseId = await resolveCaseId(id)
    if (!caseId) return NextResponse.json({ error: "Case not found" }, { status: 404 })
    if (!(await canUseReports(user.id, user.role, caseId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const reportId = String(body.report_id || "")
    const action = String(body.action || "")
    if (!reportId || !(await reportBelongsToCase(reportId, caseId))) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    if (action === "update_report") {
      const approvedBy = body.status === "approved" ? user.id : null
      if (body.status && !statuses.has(String(body.status))) {
        return NextResponse.json({ error: "Invalid report status" }, { status: 400 })
      }

      const updated = await query<{ title: string | null }>(
        `
        UPDATE case_reports
        SET
          title = COALESCE($2, title),
          report_type = COALESCE($3, report_type),
          status = COALESCE($4, status),
          classification = COALESCE($5, classification),
          executive_summary = COALESCE($6, executive_summary),
          approved_by = COALESCE($7, approved_by),
          updated_at = NOW()
        WHERE id = $1 AND case_id = $8
        RETURNING *
        `,
        [
          reportId,
          body.title ?? null,
          body.report_type ?? null,
          body.status ?? null,
          body.classification ?? null,
          body.executive_summary ?? null,
          approvedBy,
          caseId,
        ],
      )

      if (body.status === "published") {
        await recordInvestigationTimeline(caseId, user.id, "report_published", "Report published", updated.rows[0]?.title ?? "Case report")
      }

      await auditLog(user.id, "report_updated", request, { case_id: caseId, report_id: reportId, status: body.status ?? null })
      return NextResponse.json(updated.rows[0])
    }

    if (action === "add_section") {
      if (!body.title || !body.content) return NextResponse.json({ error: "Section title and content required" }, { status: 400 })

      const inserted = await query(
        `
        INSERT INTO report_sections
          (report_id, section_type, title, content, order_index, created_by)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
          reportId,
          body.section_type ?? "analysis",
          body.title,
          body.content,
          Number(body.order_index ?? 0),
          user.id,
        ],
      )

      await query("UPDATE case_reports SET updated_at=NOW() WHERE id=$1", [reportId])
      await auditLog(user.id, "report_section_added", request, { case_id: caseId, report_id: reportId, section_id: inserted.rows[0].id })
      return NextResponse.json(inserted.rows[0], { status: 201 })
    }

    if (action === "attach_evidence") {
      if (!body.evidence_id) return NextResponse.json({ error: "Evidence required" }, { status: 400 })

      const inserted = await query(
        `
        INSERT INTO report_evidence_links (report_id, evidence_id)
        SELECT $1, id
        FROM evidence_files
        WHERE id = $2 AND case_id = $3
        ON CONFLICT (report_id, evidence_id) DO NOTHING
        RETURNING *
        `,
        [reportId, body.evidence_id, caseId],
      )

      await auditLog(user.id, "report_evidence_attached", request, { case_id: caseId, report_id: reportId, evidence_id: body.evidence_id })
      return NextResponse.json(inserted.rows[0] ?? { report_id: reportId, evidence_id: body.evidence_id })
    }

    if (action === "attach_entity") {
      if (!body.entity_id) return NextResponse.json({ error: "Entity required" }, { status: 400 })

      const inserted = await query(
        `
        INSERT INTO report_entity_links (report_id, entity_id)
        SELECT $1, id
        FROM investigation_entities
        WHERE id = $2 AND case_id = $3
        ON CONFLICT (report_id, entity_id) DO NOTHING
        RETURNING *
        `,
        [reportId, body.entity_id, caseId],
      )

      await auditLog(user.id, "report_entity_attached", request, { case_id: caseId, report_id: reportId, entity_id: body.entity_id })
      return NextResponse.json(inserted.rows[0] ?? { report_id: reportId, entity_id: body.entity_id })
    }

    return NextResponse.json({ error: "Unsupported report action" }, { status: 400 })
  } catch (error) {
    console.error("REPORTS PATCH ERROR", error)
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
  }
}
