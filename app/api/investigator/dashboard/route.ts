import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (user.role !== "investigator") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const stats = await query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE status IN (
            'assigned',
            'accepted',
            'active',
            'in_progress'
          )
        )::int AS assigned_cases,

        COUNT(*) FILTER (
          WHERE status IN (
            'submitted',
            'pending_review',
            'pending_assignment',
            'pending_investigator'
          )
        )::int AS pending_assignments,

        COUNT(*) FILTER (
          WHERE preferred_deadline IS NOT NULL
          AND preferred_deadline >= NOW()
        )::int AS deadlines

      FROM requests
      `
    )

    const requests = await query(
      `
      SELECT
        r.*,
        u.username AS client_username,
        u.email AS client_email
      FROM requests r
      LEFT JOIN app_users u
        ON u.id = r.user_id
      ORDER BY r.created_at DESC
      LIMIT 100
      `
    )

    const evidenceTasks = requests.rows.filter(
      (request: any) =>
        Array.isArray(request.evidence_uploads) &&
        request.evidence_uploads.length > 0
    ).length

    const queue = requests.rows.map((request: any) => ({
      id: request.id,
      type: "request",
      title:
        request.case_number ||
        request.title ||
        "Investigation Request",
      detail:
        request.description ||
        request.service_type ||
        "Investigation request",
      status: request.status || "submitted",
      data: request,
    }))

    return NextResponse.json({
      stats: {
        assigned_cases:
          stats.rows[0]?.assigned_cases ?? 0,

        pending_assignments:
          stats.rows[0]?.pending_assignments ?? 0,

        deadlines:
          stats.rows[0]?.deadlines ?? 0,

        evidence_tasks: evidenceTasks,
      },

      requests: queue,
    })
  } catch (error) {
    console.error(
      "INVESTIGATOR DASHBOARD ERROR",
      error
    )

    return NextResponse.json(
      {
        error: "Failed to load investigator dashboard",
      },
      {
        status: 500,
      }
    )
  }
}