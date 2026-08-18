import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (user.role !== "client") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      )
    }

    const profile = await query<{ id: string }>(
      `
      SELECT id
      FROM user_profiles
      WHERE user_id = $1
      LIMIT 1
      `,
      [user.id],
    )

    const profileId = profile.rows[0]?.id

    if (!profileId) {
      return NextResponse.json(
        { error: "Client profile not found" },
        { status: 404 },
      )
    }

    const result = await query(
      `
      SELECT
        c.id,
        c.case_number,
        c.title,
        c.description,
        c.service_type,
        c.status,
        c.priority,
        c.progress,
        c.budget,
        c.estimated_completion,
        c.payment_status,
        c.started_at,
        c.completed_at,
        c.created_at,
        c.updated_at
      FROM cases c
      WHERE c.client_profile_id = $1
      ORDER BY c.created_at DESC
      `,
      [profileId],
    )

    return NextResponse.json({
      cases: result.rows,
    })
  } catch (error) {
    console.error("CLIENT CASES ERROR:", error)

    return NextResponse.json(
      { error: "Failed to load client cases" },
      { status: 500 },
    )
  }
}