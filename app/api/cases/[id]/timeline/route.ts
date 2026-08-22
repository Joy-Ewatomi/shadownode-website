import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import {
  optionalText,
  profileIdForUser,
  recordInvestigationTimeline,
  requireInvestigationWorkspace,
} from "@/lib/investigation-workspace"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const access = await requireInvestigationWorkspace(request, id)

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const result = await query(
      `
      SELECT
        cu.id,
        cu.case_id,
        cu.updated_by,
        au.username AS updated_by_username,
        cu.update_type,
        cu.title,
        cu.content,
        cu.created_at
      FROM case_updates cu
      LEFT JOIN user_profiles up ON up.id = cu.updated_by
      LEFT JOIN app_users au ON au.id = up.user_id
      WHERE cu.case_id = $1
      ORDER BY cu.created_at DESC
      `,
      [access.caseId],
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("CASE TIMELINE GET ERROR", error)
    return NextResponse.json({ error: "Failed to load timeline" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const access = await requireInvestigationWorkspace(request, id)

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    if (access.user.role === "client") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const title = optionalText(body.title)
    const content = optionalText(body.content)
    const updateType = optionalText(body.update_type) || "case_update"

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    await recordInvestigationTimeline(access.caseId, access.user.id, updateType, title, content)

    const profileId = await profileIdForUser(access.user.id)

    const latest = await query(
      `
      SELECT
        cu.id,
        cu.case_id,
        cu.updated_by,
        cu.update_type,
        cu.title,
        cu.content,
        cu.created_at
      FROM case_updates cu
      WHERE cu.case_id = $1
        AND cu.updated_by IS NOT DISTINCT FROM $2::uuid
        AND cu.title = $3
        AND cu.content = $4
      ORDER BY cu.created_at DESC
      LIMIT 1
      `,
      [access.caseId, profileId, title, content],
    )

    return NextResponse.json(latest.rows[0] || { success: true }, { status: 201 })
  } catch (error) {
    console.error("CASE TIMELINE POST ERROR", error)
    return NextResponse.json({ error: "Failed to create timeline update" }, { status: 500 })
  }
}
