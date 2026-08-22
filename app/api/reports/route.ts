import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  canUseInvestigationWorkspace,
  profileIdForUser,
  resolveCaseId,
} from "@/lib/investigation-workspace"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const rawCaseId = searchParams.get("case_id")
    const caseId = rawCaseId ? await resolveCaseId(rawCaseId) : null

    if (rawCaseId && !caseId) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    const profileId = await profileIdForUser(user.id)

    if (caseId && !(await canUseInvestigationWorkspace(user.id, user.role, caseId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const result = await query(
      `
      SELECT
        cr.id,
        cr.case_id,
        cr.title,
        cr.file_url,
        cr.summary,
        cr.created_by,
        cr.created_at,
        cr.report_type,
        cr.status,
        cr.classification,
        cr.approved_by,
        cr.updated_at,
        c.case_number,
        c.title AS case_title,
        creator.username AS created_by_username,
        approver.username AS approved_by_username
      FROM case_reports cr
      JOIN cases c ON c.id = cr.case_id
      LEFT JOIN user_profiles creator_profile ON creator_profile.id = cr.created_by
      LEFT JOIN app_users creator ON creator.id = creator_profile.user_id
      LEFT JOIN user_profiles approver_profile ON approver_profile.id = cr.approved_by
      LEFT JOIN app_users approver ON approver.id = approver_profile.user_id
      WHERE
        ($1::uuid IS NULL OR cr.case_id = $1::uuid)
        AND (
          $2::boolean = TRUE
          OR c.client_profile_id = $3::uuid
          OR c.assigned_to = $3::uuid
          OR EXISTS (
            SELECT 1
            FROM case_assignments ca
            WHERE ca.case_id = c.id
              AND ca.assigned_to = $3::uuid
              AND ca.removed_at IS NULL
          )
        )
        AND (
          $4::text <> 'client'
          OR cr.status IN ('approved', 'delivered', 'final')
        )
      ORDER BY cr.updated_at DESC, cr.created_at DESC
      `,
      [caseId, isAdminRole(user.role), profileId, user.role],
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("REPORTS GET ERROR", error)
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const caseId = await resolveCaseId(String(body.case_id || ""))

    if (!caseId) {
      return NextResponse.json({ error: "Valid case_id is required" }, { status: 400 })
    }

    if (!(await canUseInvestigationWorkspace(user.id, user.role, caseId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (user.role === "client") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const profileId = await profileIdForUser(user.id)
    if (!profileId) {
      return NextResponse.json({ error: "User profile not found" }, { status: 400 })
    }

    const title = String(body.title || "").trim()
    if (!title) {
      return NextResponse.json({ error: "Report title is required" }, { status: 400 })
    }

    const inserted = await query(
      `
      INSERT INTO case_reports (
        case_id,
        title,
        summary,
        report_type,
        classification,
        status,
        created_by,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'draft'), $7, NOW())
      RETURNING *
      `,
      [
        caseId,
        title,
        body.summary ? String(body.summary) : null,
        body.report_type ? String(body.report_type) : null,
        body.classification ? String(body.classification) : "confidential",
        body.status ? String(body.status) : "draft",
        profileId,
      ],
    )

    await query(
      `
      INSERT INTO case_updates (case_id, updated_by, update_type, title, content)
      VALUES ($1, $2, 'report', 'Report Updated', $3)
      `,
      [caseId, profileId, `Report draft created: ${title}`],
    )

    return NextResponse.json(inserted.rows[0], { status: 201 })
  } catch (error) {
    console.error("REPORTS POST ERROR", error)
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 })
  }
}
