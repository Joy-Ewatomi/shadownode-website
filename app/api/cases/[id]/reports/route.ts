import { NextRequest, NextResponse } from "next/server"

import { auditLog } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  optionalText,
  profileIdForUser,
  recordInvestigationTimeline,
  requireInvestigationWorkspace,
} from "@/lib/investigation-workspace"
import { emitCaseWorkspaceEvent } from "@/lib/realtime/workspace-events"

const REPORT_STATUSES = [
  "draft",
  "review",
  "approved",
  "delivered",
  "final",
  "published",
]

const CLIENT_VISIBLE_STATUSES = new Set([
  "approved",
  "delivered",
  "final",
  "published",
])

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function canManageReports(
  role: string | null | undefined,
) {
  return (
    isSuperAdminRole(role) ||
    role === "administrator" ||
    role === "investigator" ||
    role === "analyst"
  )
}

function canApproveReports(
  role: string | null | undefined,
) {
  return (
    isSuperAdminRole(role) ||
    role === "administrator"
  )
}

function normalizeStatus(
  value: unknown,
) {
  const status =
    String(value || "draft")
      .trim()
      .toLowerCase()

  return REPORT_STATUSES.includes(status)
    ? status
    : null
}

async function loadReportDetails(
  caseId: string,
  reportId?: string,
) {
  const reportFilter = reportId
    ? "AND cr.id = $2"
    : ""

  const values = reportId
    ? [caseId, reportId]
    : [caseId]

  const reports = await query(
    `
      SELECT
        cr.id,
        cr.case_id,
        cr.title,
        cr.file_url,
        cr.summary,
        cr.report_type,
        cr.status,
        cr.classification,
        cr.created_by,
        cr.approved_by,
        cr.created_at,
        cr.updated_at,

        creator.username AS created_by_username,
        approver.username AS approved_by_username

      FROM case_reports cr

      LEFT JOIN user_profiles creator_profile
        ON creator_profile.id = cr.created_by

      LEFT JOIN app_users creator
        ON creator.id = creator_profile.user_id

      LEFT JOIN user_profiles approver_profile
        ON approver_profile.id = cr.approved_by

      LEFT JOIN app_users approver
        ON approver.id = approver_profile.user_id

      WHERE
        cr.case_id = $1
        ${reportFilter}

      ORDER BY cr.created_at DESC
    `,
    values,
  )

  if (!reports.rows.length) {
    return []
  }

  const reportIds = reports.rows.map(
    (report) => String(report.id),
  )

  const sections = await query(
    `
      SELECT
        id,
        report_id,
        section_type,
        title,
        content,
        order_index,
        created_by,
        created_at,
        updated_at

      FROM case_report_sections

      WHERE report_id = ANY($1::uuid[])

      ORDER BY
        order_index ASC,
        created_at ASC
    `,
    [reportIds],
  )

  const evidence = await query(
    `
      SELECT
        cre.report_id,
        ff.id,
        ff.file_name,
        ff.file_hash AS sha256_hash,
        ff.evidence_type,
        ff.created_at

      FROM case_report_evidence cre

      JOIN forensic_files ff
        ON ff.id = cre.forensic_file_id

      WHERE cre.report_id = ANY($1::uuid[])

      ORDER BY cre.created_at DESC
    `,
    [reportIds],
  )

  const entities = await query(
    `
      SELECT
        cre.report_id,
        ie.id,
        ie.name,
        ie.entity_type,
        ie.confidence_score,
        ie.verification_status

      FROM case_report_entities cre

      JOIN investigation_entities ie
        ON ie.id = cre.entity_id

      WHERE cre.report_id = ANY($1::uuid[])

      ORDER BY cre.created_at DESC
    `,
    [reportIds],
  )

  return reports.rows.map(
    (report) => ({
      ...report,

      report_type:
        report.report_type ||
        "intelligence",

      status:
        report.status ||
        "draft",

      classification:
        report.classification ||
        "confidential",

      executive_summary:
        report.summary,

      sections:
        sections.rows
          .filter(
            (section) =>
              String(
                section.report_id,
              ) ===
              String(report.id),
          )
          .map(
            (section) => ({
              id: String(
                section.id,
              ),
              section_type:
                section.section_type ||
                null,
              title:
                section.title ||
                null,
              content:
                section.content ||
                null,
              order_index:
                Number(
                  section.order_index ||
                    0,
                ),
            }),
          ),

      evidence:
        evidence.rows
          .filter(
            (item) =>
              String(
                item.report_id,
              ) ===
              String(report.id),
          )
          .map(
            (item) => ({
              id: String(
                item.id,
              ),
              file_name:
                item.file_name ||
                null,
              status:
                "submitted",
              sha256_hash:
                item.sha256_hash ||
                null,
            }),
          ),

      entities:
        entities.rows
          .filter(
            (item) =>
              String(
                item.report_id,
              ) ===
              String(report.id),
          )
          .map(
            (item) => ({
              id: String(
                item.id,
              ),
              name:
                item.name ||
                null,
              entity_type:
                item.entity_type ||
                null,
              confidence_score:
                item.confidence_score ===
                null
                  ? null
                  : Number(
                      item.confidence_score,
                    ),
            }),
          ),
    }),
  )
}

async function verifyReportBelongsToCase(
  reportId: string,
  caseId: string,
) {
  const result =
    await query<{
      id: string
      title: string | null
      status: string | null
    }>(
      `
        SELECT
          id,
          title,
          status

        FROM case_reports

        WHERE
          id = $1
          AND case_id = $2

        LIMIT 1
      `,
      [
        reportId,
        caseId,
      ],
    )

  return result.rows[0] || null
}

/*
 * GET
 *
 * Returns reports plus the existing case evidence and graph
 * entities that can be linked from the report builder.
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    const { id } = await params

    const access =
      await requireInvestigationWorkspace(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.error,
        },
        {
          status:
            access.status,
        },
      )
    }

    const allReports =
      await loadReportDetails(
        access.caseId,
      )

    const isClient =
      access.user.role ===
      "client"

    const reports =
      isClient
        ? allReports.filter(
            (report) =>
              CLIENT_VISIBLE_STATUSES.has(
                String(
                  report.status ||
                    "",
                ),
              ),
          )
        : allReports

    const [evidence, entities] =
      await Promise.all([
        query(
          `
            SELECT
              id,
              file_name,
              file_hash,
              evidence_type

            FROM forensic_files

            WHERE case_id = $1

            ORDER BY created_at DESC
          `,
          [access.caseId],
        ),

        query(
          `
            SELECT
              id,
              name,
              entity_type,
              confidence_score

            FROM investigation_entities

            WHERE case_id = $1

            ORDER BY created_at DESC
          `,
          [access.caseId],
        ),
      ])

    await auditLog(
      access.user.id,
      "reports_viewed",
      request,
      {
        case_id:
          access.caseId,
      },
    )

    return NextResponse.json({
      case_id:
        access.caseId,

      reports,

      evidence:
        evidence.rows.map(
          (item) => ({
            id: String(
              item.id,
            ),
            file_name:
              item.file_name ||
              null,
            status:
              item.evidence_type ||
              "submitted",
            sha256_hash:
              item.file_hash ||
              null,
          }),
        ),

      entities:
        entities.rows.map(
          (item) => ({
            id: String(
              item.id,
            ),
            name:
              item.name ||
              null,
            entity_type:
              item.entity_type ||
              null,
            confidence_score:
              item.confidence_score ===
              null
                ? null
                : Number(
                    item.confidence_score,
                  ),
          }),
        ),
    })
  } catch (error) {
    console.error(
      "REPORTS GET ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to load reports",
      },
      {
        status: 500,
      },
    )
  }
}

/*
 * POST
 *
 * Creates a report in draft state.
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    const { id } = await params

    const access =
      await requireInvestigationWorkspace(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.error,
        },
        {
          status:
            access.status,
        },
      )
    }

    if (
      !canManageReports(
        access.user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to create reports.",
        },
        {
          status: 403,
        },
      )
    }

    const body =
      await request.json()

    const title =
      optionalText(
        body?.title,
      )

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Report title required",
        },
        {
          status: 400,
        },
      )
    }

    const creatorProfileId =
      await profileIdForUser(
        access.user.id,
      )

    if (!creatorProfileId) {
      return NextResponse.json(
        {
          error:
            "User profile missing",
        },
        {
          status: 500,
        },
      )
    }

    const reportType =
      optionalText(
        body?.report_type,
      ) ||
      "intelligence"

    const classification =
      optionalText(
        body?.classification,
      ) ||
      "confidential"

    const summary =
      optionalText(
        body?.executive_summary,
      ) ??
      optionalText(
        body?.summary,
      )

    const inserted =
      await query(
        `
          INSERT INTO case_reports (
            case_id,
            title,
            file_url,
            summary,
            created_by,
            report_type,
            status,
            classification,
            created_at,
            updated_at
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            'draft',
            $7,
            NOW(),
            NOW()
          )

          RETURNING *
        `,
        [
          access.caseId,
          title,
          optionalText(
            body?.file_url,
          ),
          summary,
          creatorProfileId,
          reportType,
          classification,
        ],
      )

    const report =
      inserted.rows[0]

    if (!report) {
      throw new Error(
        "Report creation returned no record",
      )
    }

    await recordInvestigationTimeline(
      access.caseId,
      access.user.id,
      "report_created",
      "Report Created",
      title,
    )

    await emitCaseWorkspaceEvent({
      type: "report.created",
      case_id:
        access.caseId,
      actor_id:
        access.user.id,
      record_id:
        String(report.id),
      data: {
        title,
        status:
          "draft",
      },
    })

    await auditLog(
      access.user.id,
      "report_created",
      request,
      {
        case_id:
          access.caseId,
        report_id:
          report.id,
      },
    )

    return NextResponse.json(
      report,
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "REPORTS POST ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to create report",
      },
      {
        status: 500,
      },
    )
  }
}

/*
 * PATCH
 *
 * Supports the actions already used by ReportBuilder:
 *
 * update_report
 * add_section
 * attach_evidence
 * attach_entity
 * approve
 * deliver
 * publish
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    const { id } = await params

    const access =
      await requireInvestigationWorkspace(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.error,
        },
        {
          status:
            access.status,
        },
      )
    }

    const body =
      await request.json()

    const reportId =
      optionalText(
        body?.report_id,
      )

    if (!reportId) {
      return NextResponse.json(
        {
          error:
            "Report id required",
        },
        {
          status: 400,
        },
      )
    }

    const report =
      await verifyReportBelongsToCase(
        reportId,
        access.caseId,
      )

    if (!report) {
      return NextResponse.json(
        {
          error:
            "Report not found",
        },
        {
          status: 404,
        },
      )
    }

    const action =
      optionalText(
        body?.action,
      ) || "update_report"

    /*
     * Clients have read-only report access.
     */
    if (
      access.user.role ===
      "client"
    ) {
      return NextResponse.json(
        {
          error:
            "Clients cannot modify case reports.",
        },
        {
          status: 403,
        },
      )
    }

    /*
     * All internal report editing requires
     * an authorized case operator.
     */
    if (
      !canManageReports(
        access.user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to modify this report.",
        },
        {
          status: 403,
        },
      )
    }

    const actorProfileId =
      await profileIdForUser(
        access.user.id,
      )

    if (!actorProfileId) {
      return NextResponse.json(
        {
          error:
            "User profile missing",
        },
        {
          status: 500,
        },
      )
    }

    /*
     * ADD SECTION
     */
    if (
      action ===
      "add_section"
    ) {
      const sectionTitle =
        optionalText(
          body?.title,
        )

      const sectionContent =
        optionalText(
          body?.content,
        )

      const sectionType =
        optionalText(
          body?.section_type,
        ) ||
        "analysis"

      if (
        !sectionTitle ||
        !sectionContent
      ) {
        return NextResponse.json(
          {
            error:
              "Section title and content are required.",
          },
          {
            status: 400,
          },
        )
      }

      const orderIndex =
        Number.isInteger(
          Number(
            body?.order_index,
          ),
        )
          ? Number(
              body.order_index,
            )
          : 0

      const sectionResult =
        await query(
          `
            INSERT INTO case_report_sections (
              report_id,
              section_type,
              title,
              content,
              order_index,
              created_by,
              created_at,
              updated_at
            )

            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              NOW(),
              NOW()
            )

            RETURNING *
          `,
          [
            reportId,
            sectionType,
            sectionTitle,
            sectionContent,
            Math.max(
              0,
              orderIndex,
            ),
            actorProfileId,
          ],
        )

      await query(
        `
          UPDATE case_reports
          SET updated_at = NOW()
          WHERE id = $1
        `,
        [reportId],
      )

      await recordInvestigationTimeline(
        access.caseId,
        access.user.id,
        "report_section_added",
        "Report Section Added",
        sectionTitle,
      )

      await auditLog(
        access.user.id,
        "report_section_added",
        request,
        {
          case_id:
            access.caseId,
          report_id:
            reportId,
          section_id:
            sectionResult.rows[0]
              ?.id,
        },
      )

      const refreshed =
        await loadReportDetails(
          access.caseId,
          reportId,
        )

      return NextResponse.json(
        refreshed[0],
      )
    }

    /*
     * ATTACH EVIDENCE
     */
    if (
      action ===
      "attach_evidence"
    ) {
      const evidenceId =
        optionalText(
          body?.evidence_id,
        )

      if (!evidenceId) {
        return NextResponse.json(
          {
            error:
              "Evidence id required",
          },
          {
            status: 400,
          },
        )
      }

      const evidence =
        await query<{
          id: string
        }>(
          `
            SELECT id

            FROM forensic_files

            WHERE
              id = $1
              AND case_id = $2

            LIMIT 1
          `,
          [
            evidenceId,
            access.caseId,
          ],
        )

      if (!evidence.rows[0]) {
        return NextResponse.json(
          {
            error:
              "Evidence not found for this case",
          },
          {
            status: 404,
          },
        )
      }

      await query(
        `
          INSERT INTO case_report_evidence (
            report_id,
            forensic_file_id,
            created_by,
            created_at
          )

          VALUES (
            $1,
            $2,
            $3,
            NOW()
          )

          ON CONFLICT (
            report_id,
            forensic_file_id
          )
          DO NOTHING
        `,
        [
          reportId,
          evidenceId,
          actorProfileId,
        ],
      )

      await query(
        `
          UPDATE case_reports
          SET updated_at = NOW()
          WHERE id = $1
        `,
        [reportId],
      )

      await auditLog(
        access.user.id,
        "report_evidence_attached",
        request,
        {
          case_id:
            access.caseId,
          report_id:
            reportId,
          evidence_id:
            evidenceId,
        },
      )

      const refreshed =
        await loadReportDetails(
          access.caseId,
          reportId,
        )

      return NextResponse.json(
        refreshed[0],
      )
    }

    /*
     * ATTACH ENTITY
     */
    if (
      action ===
      "attach_entity"
    ) {
      const entityId =
        optionalText(
          body?.entity_id,
        )

      if (!entityId) {
        return NextResponse.json(
          {
            error:
              "Entity id required",
          },
          {
            status: 400,
          },
        )
      }

      const entity =
        await query<{
          id: string
        }>(
          `
            SELECT id

            FROM investigation_entities

            WHERE
              id = $1
              AND case_id = $2

            LIMIT 1
          `,
          [
            entityId,
            access.caseId,
          ],
        )

      if (!entity.rows[0]) {
        return NextResponse.json(
          {
            error:
              "Entity not found for this case",
          },
          {
            status: 404,
          },
        )
      }

      await query(
        `
          INSERT INTO case_report_entities (
            report_id,
            entity_id,
            created_by,
            created_at
          )

          VALUES (
            $1,
            $2,
            $3,
            NOW()
          )

          ON CONFLICT (
            report_id,
            entity_id
          )
          DO NOTHING
        `,
        [
          reportId,
          entityId,
          actorProfileId,
        ],
      )

      await query(
        `
          UPDATE case_reports
          SET updated_at = NOW()
          WHERE id = $1
        `,
        [reportId],
      )

      await auditLog(
        access.user.id,
        "report_entity_attached",
        request,
        {
          case_id:
            access.caseId,
          report_id:
            reportId,
          entity_id:
            entityId,
        },
      )

      const refreshed =
        await loadReportDetails(
          access.caseId,
          reportId,
        )

      return NextResponse.json(
        refreshed[0],
      )
    }

    /*
     * STATUS / REPORT UPDATE
     */
    const requestedStatus =
      body?.status !==
      undefined
        ? normalizeStatus(
            body.status,
          )
        : null

    if (
      body?.status !==
        undefined &&
      !requestedStatus
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid report status.",
        },
        {
          status: 400,
        },
      )
    }

    const approvalAction =
      action === "approve"

    const deliveryAction =
      action === "deliver"

    const publishAction =
      action === "publish"

    if (
      (approvalAction ||
        deliveryAction ||
        publishAction ||
        requestedStatus ===
          "approved" ||
        requestedStatus ===
          "delivered" ||
        requestedStatus ===
          "published") &&
      !canApproveReports(
        access.user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Only an administrator or Super Administrator can approve or publish reports.",
        },
        {
          status: 403,
        },
      )
    }

    let nextStatus =
      requestedStatus

    if (approvalAction) {
      nextStatus = "approved"
    } else if (
      deliveryAction
    ) {
      nextStatus = "delivered"
    } else if (
      publishAction
    ) {
      nextStatus = "published"
    }

    const title =
      optionalText(
        body?.title,
      )

    const fileUrl =
      optionalText(
        body?.file_url,
      )

    const summary =
      optionalText(
        body?.summary,
      ) ??
      optionalText(
        body?.executive_summary,
      )

    const reportType =
      optionalText(
        body?.report_type,
      )

    const classification =
      optionalText(
        body?.classification,
      )

    const updated =
      await query(
        `
          UPDATE case_reports

          SET
            title = COALESCE(
              $2,
              title
            ),

            file_url = COALESCE(
              $3,
              file_url
            ),

            summary = COALESCE(
              $4,
              summary
            ),

            report_type = COALESCE(
              $5,
              report_type
            ),

            classification = COALESCE(
              $6,
              classification
            ),

            status = COALESCE(
              $7,
              status
            ),

            approved_by =
              CASE
                WHEN $7 IN (
                  'approved',
                  'delivered',
                  'final',
                  'published'
                )
                THEN $8

                ELSE approved_by
              END,

            updated_at = NOW()

          WHERE
            id = $1
            AND case_id = $9

          RETURNING *
        `,
        [
          reportId,
          title,
          fileUrl,
          summary,
          reportType,
          classification,
          nextStatus,
          actorProfileId,
          access.caseId,
        ],
      )

    if (!updated.rows[0]) {
      return NextResponse.json(
        {
          error:
            "Report not found",
        },
        {
          status: 404,
        },
      )
    }

    const updatedReport =
      updated.rows[0]

    const finalTitle =
  typeof updatedReport.title === "string" &&
  updatedReport.title.trim()
    ? updatedReport.title.trim()
    : "Case report"

    if (
      nextStatus
    ) {
      const timelineType =
        nextStatus ===
        "approved"
          ? "report_approved"
          : nextStatus ===
              "published"
            ? "report_published"
            : nextStatus ===
                "delivered"
              ? "report_delivered"
              : "report_status_updated"

      await recordInvestigationTimeline(
        access.caseId,
        access.user.id,
        timelineType,
        `Report ${nextStatus}`,
        finalTitle,
      )
    } else {
      await recordInvestigationTimeline(
        access.caseId,
        access.user.id,
        "report_updated",
        "Report Updated",
        finalTitle,
      )
    }

    if (
      nextStatus ===
      "published"
    ) {
      await emitCaseWorkspaceEvent({
        type: "report.published",
        case_id:
          access.caseId,
        actor_id:
          access.user.id,
        record_id:
          String(reportId),
        data: {
          title:
            finalTitle,
          status:
            nextStatus,
        },
      })
    }

    await auditLog(
      access.user.id,
      nextStatus ===
        "approved"
        ? "report_approved"
        : nextStatus ===
            "published"
          ? "report_published"
          : nextStatus ===
              "delivered"
            ? "report_delivered"
            : "report_updated",
      request,
      {
        case_id:
          access.caseId,
        report_id:
          reportId,
        status:
          nextStatus,
      },
    )

    const refreshed =
      await loadReportDetails(
        access.caseId,
        reportId,
      )

    return NextResponse.json(
      refreshed[0] ||
        updatedReport,
    )
  } catch (error) {
    console.error(
      "REPORTS PATCH ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to update report",
      },
      {
        status: 500,
      },
    )
  }
}