import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  canUseCaseOperationalAccess,
  canUseCaseOversightRead,
  canUseCaseReviewAccess,
  profileIdForUser,
} from "@/lib/investigation-workspace"
import {
  notifySuperAdmins,
  notifyUser,
} from "@/lib/services/notification-service"

const CLIENT_VISIBLE_REPORT_STATUSES = new Set([
  "delivered",
  "final",
  "published",
])

async function loadReport(reportId: string) {
  const result = await query<{
    id: string
    case_id: string
    title: string | null
    file_url: string | null
    summary: string | null
    report_type: string | null
    status: string | null
    classification: string | null
    created_by: string | null
    approved_by: string | null
    created_at: string
    updated_at: string
    case_number: string | null
    case_title: string | null
    client_user_id: string | null
    created_by_user_id: string | null
    created_by_username: string | null
    approved_by_username: string | null
  }>(
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
      c.case_number,
      c.title AS case_title,
      client_profile.user_id AS client_user_id,
      creator.id AS created_by_user_id,
      creator.username AS created_by_username,
      approver.username AS approved_by_username
    FROM case_reports cr
    JOIN cases c ON c.id = cr.case_id
    LEFT JOIN user_profiles client_profile ON client_profile.id = c.client_profile_id
    LEFT JOIN user_profiles creator_profile ON creator_profile.id = cr.created_by
    LEFT JOIN app_users creator ON creator.id = creator_profile.user_id
    LEFT JOIN user_profiles approver_profile ON approver_profile.id = cr.approved_by
    LEFT JOIN app_users approver ON approver.id = approver_profile.user_id
    WHERE cr.id = $1
    LIMIT 1
    `,
    [reportId],
  )

  return result.rows[0] ?? null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const report = await loadReport(id)

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    const canView =
      user.role === "client"
        ? report.client_user_id === user.id &&
          CLIENT_VISIBLE_REPORT_STATUSES.has(report.status || "") &&
          String(report.classification || "confidential").toLowerCase() !== "internal"
        : (await canUseCaseOperationalAccess(user.id, user.role, report.case_id)) ||
          (await canUseCaseReviewAccess(user.id, user.role, report.case_id)) ||
          (await canUseCaseOversightRead(user.id, user.role, report.case_id))

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("REPORT GET ERROR", error)
    return NextResponse.json({ error: "Failed to load report" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isAdminRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const current = await loadReport(id)

    if (!current) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    if (
      !(await canUseCaseReviewAccess(user.id, user.role, current.case_id)) &&
      !(await canUseCaseOversightRead(user.id, user.role, current.case_id))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const profileId = await profileIdForUser(user.id)
    if (!profileId) {
      return NextResponse.json({ error: "User profile not found" }, { status: 400 })
    }

    const body = await request.json()
    const action = String(body.action || "").trim()
    const requestedStatus = body.status ? String(body.status).trim() : null
    const nextStatus =
      action === "approve"
        ? "approved"
        : action === "deliver"
          ? "delivered"
          : requestedStatus

    const currentStatus = String(current.status || "draft").toLowerCase()
    const normalizedNextStatus = nextStatus ? String(nextStatus).toLowerCase() : null
    const transitions: Record<string, string[]> = {
      draft: ["draft", "review"],
      review: ["review", "draft", "approved"],
      approved: ["approved", "final", "delivered", "published"],
      final: ["final", "delivered", "published"],
      delivered: ["delivered", "published"],
      published: ["published"],
    }

    if (
      normalizedNextStatus &&
      !transitions[currentStatus]?.includes(normalizedNextStatus)
    ) {
      return NextResponse.json(
        { error: `Invalid report transition from ${currentStatus} to ${normalizedNextStatus}.` },
        { status: 409 },
      )
    }

    const superAdmin =
      user.role === "super_administrator" ||
      user.role === "super-administrator"

    if (
      normalizedNextStatus &&
      ["final", "delivered", "published"].includes(normalizedNextStatus) &&
      !superAdmin
    ) {
      return NextResponse.json(
        { error: "Only a Super Administrator can finalize, deliver, or publish reports." },
        { status: 403 },
      )
    }

    const nextClassification = String(
      body.classification || current.classification || "confidential",
    ).toLowerCase()

    if (
      normalizedNextStatus &&
      ["delivered", "published"].includes(normalizedNextStatus) &&
      nextClassification === "internal"
    ) {
      return NextResponse.json(
        { error: "Internal reports cannot be delivered or published to the client." },
        { status: 409 },
      )
    }

    const updated = await query(
      `
      UPDATE case_reports
      SET
        title = COALESCE($2, title),
        file_url = COALESCE($3, file_url),
        summary = COALESCE($4, summary),
        report_type = COALESCE($5, report_type),
        classification = COALESCE($6, classification),
        status = COALESCE($7, status),
        approved_by = CASE
          WHEN $7 IN ('approved', 'delivered', 'final', 'published') THEN $8
          ELSE approved_by
        END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        body.title ? String(body.title) : null,
        body.file_url ? String(body.file_url) : null,
        body.summary ? String(body.summary) : null,
        body.report_type ? String(body.report_type) : null,
        body.classification ? String(body.classification) : null,
        normalizedNextStatus,
        profileId,
      ],
    )

    const report = updated.rows[0]

    await query(
      `
      INSERT INTO case_updates (case_id, updated_by, update_type, title, content)
      VALUES ($1, $2, 'report', $3, $4)
      `,
      [
        current.case_id,
        profileId,
        nextStatus ? `Report ${nextStatus}` : "Report updated",
        current.title || "Case report",
      ],
    ).catch(() => undefined)

    if (nextStatus === "review") {
      await notifySuperAdmins({
        type: "report_pending_approval",
        title: "Report pending approval",
        message: `${current.title || "A report"} is ready for review for ${current.case_number || "a case"}.`,
        metadata: {
          report_id: id,
          case_id: current.case_id,
          resource_type: "report",
          resource_id: id,
          target_page: "report_review",
          audience: "super_administrator",
          action: "review_report",
        },
      })
    }

    if (
      nextStatus === "approved" &&
      current.created_by_user_id &&
      current.created_by_user_id !== user.id
    ) {
      await notifyUser(current.created_by_user_id, {
        caseId: current.case_id,
        type: "report_approved",
        title: "Report approved",
        message: `${current.title || "A report"} has been approved for ${current.case_number || "a case"}.`,
        metadata: {
          report_id: id,
          case_id: current.case_id,
          resource_type: "report",
          resource_id: id,
          target_page: "report_review",
          audience: "staff",
          action: "view_report",
        },
      })
    }

    if (nextStatus === "delivered") {
      await notifyUser(current.client_user_id, {
        caseId: current.case_id,
        type: "report_available",
        title: "Report available",
        message: "Your investigation report is available in your client portal.",
        metadata: {
          report_id: id,
          case_id: current.case_id,
          resource_type: "report",
          resource_id: id,
          target_page: "client_reports",
          action: "view_report",
        },
      })
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("REPORT PATCH ERROR", error)
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
  }
}
