import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"
import { notifyUser } from "@/lib/services/notification-service"

type AssignmentInput = {
  case_id?: string
  assigned_to_user_id?: string
  assigned_to_profile_id?: string
}

async function resolveAssignee(input: AssignmentInput) {
  if (input.assigned_to_profile_id) {
    const result = await query<{
      profile_id: string
      user_id: string
      role: string
      username: string
    }>(
      `
      SELECT
        up.id AS profile_id,
        au.id AS user_id,
        au.role,
        au.username
      FROM user_profiles up
      JOIN app_users au ON au.id = up.user_id
      WHERE up.id = $1
      LIMIT 1
      `,
      [input.assigned_to_profile_id],
    )

    return result.rows[0] ?? null
  }

  if (!input.assigned_to_user_id) return null

  const result = await query<{
    profile_id: string
    user_id: string
    role: string
    username: string
  }>(
    `
    SELECT
      up.id AS profile_id,
      au.id AS user_id,
      au.role,
      au.username
    FROM app_users au
    JOIN user_profiles up ON up.user_id = au.id
    WHERE au.id = $1
    LIMIT 1
    `,
    [input.assigned_to_user_id],
  )

  return result.rows[0] ?? null
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const profileId = await profileIdForUser(user.id)

    const result = await query(
      `
      SELECT
        ca.id,
        ca.case_id,
        ca.assigned_to,
        ca.assigned_by,
        ca.assigned_at,
        ca.removed_at,
        c.case_number,
        c.title AS case_title,
        c.status AS case_status,
        assignee.username AS assignee_username,
        assigner.username AS assigned_by_username
      FROM case_assignments ca
      JOIN cases c ON c.id = ca.case_id
      JOIN user_profiles assignee_profile ON assignee_profile.id = ca.assigned_to
      JOIN app_users assignee ON assignee.id = assignee_profile.user_id
      LEFT JOIN user_profiles assigner_profile ON assigner_profile.id = ca.assigned_by
      LEFT JOIN app_users assigner ON assigner.id = assigner_profile.user_id
      WHERE
        $1::boolean = TRUE
        OR ca.assigned_to = $2::uuid
      ORDER BY ca.assigned_at DESC
      `,
      [isAdminRole(user.role), profileId],
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("ASSIGNMENTS GET ERROR", error)
    return NextResponse.json({ error: "Failed to load assignments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isAdminRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = (await request.json()) as AssignmentInput
    const caseId = String(body.case_id || "").trim()

    if (!caseId) {
      return NextResponse.json({ error: "case_id is required" }, { status: 400 })
    }

    const assignedBy = await profileIdForUser(user.id)
    if (!assignedBy) {
      return NextResponse.json({ error: "Administrator profile not found" }, { status: 400 })
    }

    const assignee = await resolveAssignee(body)
    if (!assignee) {
      return NextResponse.json({ error: "Assignee profile not found" }, { status: 404 })
    }

    if (!["investigator", "analyst"].includes(assignee.role)) {
      return NextResponse.json({ error: "Cases can only be assigned to investigators or analysts" }, { status: 400 })
    }

    const caseResult = await query<{ id: string; title: string | null; case_number: string | null }>(
      `
      SELECT id, title, case_number
      FROM cases
      WHERE id = $1
      LIMIT 1
      `,
      [caseId],
    )

    const caseRow = caseResult.rows[0]
    if (!caseRow) return NextResponse.json({ error: "Case not found" }, { status: 404 })

    await query("BEGIN")

    try {
      await query(
        `
        UPDATE case_assignments
        SET removed_at = NOW()
        WHERE case_id = $1
          AND assigned_to = $2
          AND removed_at IS NULL
        `,
        [caseId, assignee.profile_id],
      )

      const inserted = await query(
        `
        INSERT INTO case_assignments (case_id, assigned_to, assigned_by)
        VALUES ($1, $2, $3)
        RETURNING id, case_id, assigned_to, assigned_by, assigned_at, removed_at
        `,
        [caseId, assignee.profile_id, assignedBy],
      )

      if (assignee.role === "investigator") {
        await query(
          `
          UPDATE cases
          SET assigned_to = $2, status = CASE WHEN status = 'awaiting_assignment' THEN 'assigned' ELSE status END, updated_at = NOW()
          WHERE id = $1
          `,
          [caseId, assignee.profile_id],
        )
      }

      await query(
        `
        INSERT INTO case_updates (case_id, updated_by, update_type, title, content)
        VALUES ($1, $2, 'assignment', 'Case Assigned', $3)
        `,
        [
          caseId,
          assignedBy,
          `${assignee.username} was assigned to this case as ${assignee.role}.`,
        ],
      )

      await query("COMMIT")

      await notifyUser(assignee.user_id, {
        caseId,
        type: "assignment",
        title: "Case assignment",
        message: `You have been assigned to ${caseRow.case_number || caseRow.title || "a case"}.`,
        metadata: {
          case_id: caseId,
          target_page: "case",
          action: "open_case",
        },
      })

      return NextResponse.json(inserted.rows[0], { status: 201 })
    } catch (error) {
      await query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("ASSIGNMENTS POST ERROR", error)
    return NextResponse.json({ error: "Failed to assign case" }, { status: 500 })
  }
}
