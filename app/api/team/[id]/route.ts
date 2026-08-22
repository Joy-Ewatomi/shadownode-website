import { NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isAdminRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params

    const operator = await query(
      `
      SELECT
        au.id,
        up.id AS profile_id,
        au.username,
        au.email,
        au.role,
        au.status,
        up.full_name,
        up.organization_id,
        au.created_at,
        au.updated_at
      FROM app_users au
      LEFT JOIN user_profiles up ON up.user_id = au.id
      WHERE au.id = $1
      LIMIT 1
      `,
      [id],
    )

    const item = operator.rows[0]
    if (!item) return NextResponse.json({ error: "Operator not found" }, { status: 404 })

    const assignments = item.profile_id
      ? await query(
          `
          SELECT
            ca.id,
            ca.case_id,
            ca.assigned_at,
            ca.removed_at,
            c.case_number,
            c.title AS case_title,
            c.status AS case_status
          FROM case_assignments ca
          JOIN cases c ON c.id = ca.case_id
          WHERE ca.assigned_to = $1
          ORDER BY ca.removed_at NULLS FIRST, ca.assigned_at DESC
          `,
          [item.profile_id],
        )
      : { rows: [] }

    return NextResponse.json({
      ...item,
      assignments: assignments.rows,
    })
  } catch (error) {
    console.error("TEAM MEMBER GET ERROR", error)
    return NextResponse.json({ error: "Failed to load operator" }, { status: 500 })
  }
}
