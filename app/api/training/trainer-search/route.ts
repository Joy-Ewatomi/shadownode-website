import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = (url.searchParams.get("q") || "").trim()

  if (!q) {
    return NextResponse.json({ trainers: [] })
  }

  // Search user_profiles by name (case-insensitive) and limit results
  // Restrict results to users who have trainer-capable roles (investigator, analyst) and are active
  const res = await query<{
    id: string
    full_name: string | null
    user_id: string | null
    role: string | null
  }>(
    `
      SELECT up.id, up.full_name, up.user_id, au.role
      FROM user_profiles up
      JOIN app_users au ON au.id = up.user_id
      WHERE up.full_name ILIKE $1
        AND au.role IN ('investigator', 'analyst', 'administrator', 'super_administrator', 'super-administrator')
        AND au.status = 'active'
      ORDER BY up.full_name ASC
      LIMIT 20
    `,
    [`%${q}%`],
  )

  const trainers = res.rows.map((r) => ({ id: r.id, full_name: r.full_name || "", user_id: r.user_id, role: r.role }))

  return NextResponse.json({ trainers })
}
