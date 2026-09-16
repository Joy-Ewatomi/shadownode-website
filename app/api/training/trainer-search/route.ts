import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

type TrainerSearchRow = {
  id: string
  full_name: string | null
  user_id: string | null
  email: string | null
  role: string | null
}

const TRAINER_ROLES = [
  "staff",
  "investigator",
  "analyst",
  "administrator",
  "super_administrator",
  "super-administrator",
]

const ADMIN_ROLES = [
  "administrator",
  "super_administrator",
  "super-administrator",
]

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      )
    }

    const requesterRole = String(user.role || "")
      .trim()
      .toLowerCase()

    if (!ADMIN_ROLES.includes(requesterRole)) {
      return NextResponse.json(
        { error: "You are not authorized to search for trainers" },
        { status: 403 },
      )
    }

    const url = new URL(req.url)
    const search = (url.searchParams.get("q") || "").trim()

    if (!search) {
      return NextResponse.json({ trainers: [] })
    }

    if (search.length < 2) {
      return NextResponse.json({ trainers: [] })
    }

    const searchPattern = `%${search}%`

    const result = await query<TrainerSearchRow>(
      `
        SELECT
          up.id,
          up.full_name,
          up.user_id,
          au.email,
          au.role
        FROM user_profiles up
        JOIN app_users au
          ON au.id = up.user_id
        WHERE au.status = 'active'
          AND au.role IN (
            'staff',
            'investigator',
            'analyst',
            'administrator',
            'super_administrator',
            'super-administrator'
          )
          AND (
            up.full_name ILIKE $1
            OR au.email ILIKE $1
          )
        ORDER BY
          CASE
            WHEN LOWER(COALESCE(up.full_name, '')) = LOWER($2)
              THEN 0
            WHEN LOWER(COALESCE(up.full_name, '')) LIKE LOWER($3)
              THEN 1
            ELSE 2
          END,
          up.full_name ASC
        LIMIT 20
      `,
      [
        searchPattern,
        search,
        `${search}%`,
      ],
    )

    const trainers = result.rows.map((row) => ({
      id: row.id,
      full_name: row.full_name || "",
      user_id: row.user_id,
      email: row.email,
      role: row.role,
    }))

    return NextResponse.json({ trainers })
  } catch (error) {
    console.error("TRAINER SEARCH ERROR:", error)

    return NextResponse.json(
      { error: "Unable to search trainers" },
      { status: 500 },
    )
  }
}
