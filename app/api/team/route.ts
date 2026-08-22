import { NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const result = await query(
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
        COUNT(DISTINCT ca.case_id) FILTER (WHERE ca.removed_at IS NULL)::int AS active_assignments,
        MAX(ca.assigned_at) AS last_assigned_at
      FROM app_users au
      LEFT JOIN user_profiles up ON up.user_id = au.id
      LEFT JOIN case_assignments ca ON ca.assigned_to = up.id
      WHERE au.role IN ('administrator', 'super_administrator', 'super-administrator', 'investigator', 'analyst')
      GROUP BY au.id, up.id
      ORDER BY
        CASE au.role
          WHEN 'super_administrator' THEN 1
          WHEN 'super-administrator' THEN 1
          WHEN 'administrator' THEN 2
          WHEN 'investigator' THEN 3
          WHEN 'analyst' THEN 4
          ELSE 5
        END,
        au.username
      `,
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("TEAM GET ERROR", error)
    return NextResponse.json({ error: "Failed to load team" }, { status: 500 })
  }
}
