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
        al.id,
        al.user_id,
        au.username,
        au.email,
        au.role,
        al.action,
        al.ip,
        al.user_agent,
        al.metadata,
        al.created_at
      FROM audit_logs al
      LEFT JOIN app_users au ON au.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT 200
      `,
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("AUDIT LOGS GET ERROR", error)
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 })
  }
}
