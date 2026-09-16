import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"
import { isStaffLikeRole } from "@/lib/role-access"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isStaffLikeRole(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const profileId = await profileIdForUser(user.id)

    if (!profileId) {
      return NextResponse.json({
        stats: {
          assigned_cases: 0,
          pending_assignments: 0,
          active_cases: 0,
          deadlines: 0,
          evidence_tasks: 0,
        },
        cases: [],
        requests: [],
      })
    }

    const stats = await query(
      `
      SELECT
        COUNT(DISTINCT c.id) FILTER (
          WHERE c.status IN ('assigned', 'accepted', 'active', 'in_progress')
        )::int AS assigned_cases,
        COUNT(DISTINCT c.id) FILTER (
          WHERE c.status IN ('submitted', 'pending_review', 'pending_assignment', 'pending_investigator', 'awaiting_assignment')
        )::int AS pending_assignments,
        COUNT(DISTINCT c.id) FILTER (
          WHERE c.status IN ('active', 'in_progress')
        )::int AS active_cases,
        COUNT(DISTINCT c.id) FILTER (
          WHERE c.estimated_completion IS NOT NULL
            AND c.estimated_completion >= CURRENT_DATE
        )::int AS deadlines,
        COUNT(DISTINCT ff.id)::int AS evidence_tasks
      FROM cases c
      LEFT JOIN case_assignments ca
        ON ca.case_id = c.id
        AND ca.assigned_to = $1
        AND ca.removed_at IS NULL
      LEFT JOIN forensic_files ff
        ON ff.case_id = c.id
      WHERE c.assigned_to = $1
        OR ca.id IS NOT NULL
      `,
      [profileId],
    )

    const cases = await query(
      `
      SELECT DISTINCT
        c.id,
        c.case_number,
        c.title,
        c.description,
        c.service_type,
        c.status,
        c.priority,
        c.progress,
        c.estimated_completion,
        c.created_at,
        c.updated_at
      FROM cases c
      LEFT JOIN case_assignments ca
        ON ca.case_id = c.id
        AND ca.assigned_to = $1
        AND ca.removed_at IS NULL
      WHERE c.assigned_to = $1
        OR ca.id IS NOT NULL
      ORDER BY c.updated_at DESC
      LIMIT 100
      `,
      [profileId],
    )

    const queue = cases.rows.map((item) => ({
      id: item.id,
      type: "case",
      title: item.case_number || item.title || "Investigation Case",
      detail: item.description || item.service_type || "Assigned investigation case",
      status: item.status || "assigned",
      data: item,
    }))

    return NextResponse.json({
      stats: {
        assigned_cases: stats.rows[0]?.assigned_cases ?? 0,
        pending_assignments: stats.rows[0]?.pending_assignments ?? 0,
        active_cases: stats.rows[0]?.active_cases ?? 0,
        deadlines: stats.rows[0]?.deadlines ?? 0,
        evidence_tasks: stats.rows[0]?.evidence_tasks ?? 0,
      },
      cases: queue,
      requests: queue,
    })
  } catch (error) {
    console.error("INVESTIGATOR DASHBOARD ERROR", error)
    return NextResponse.json({ error: "Failed to load investigator dashboard" }, { status: 500 })
  }
}
