import { NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
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

    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    /*
     * Client Requests
     *
     * Every request currently in the request workflow.
     */
    const clientRequests = await query(`
      SELECT COUNT(*)::int AS count
      FROM requests
    `)

    /*
     * Active Investigations
     *
     * Actual cases, not requests.
     */
    const activeInvestigations = await query(`
      SELECT COUNT(*)::int AS count
      FROM cases
      WHERE status IN (
        'assigned',
        'accepted',
        'active',
        'in_progress'
      )
    `)

    /*
     * Team Workload
     *
     * Cases currently waiting for assignment.
     */
    const pendingAssignments = await query(`
      SELECT COUNT(*)::int AS count
      FROM cases c
      WHERE c.status IN (
        'submitted',
        'pending_assignment',
        'pending_investigator',
        'awaiting_assignment'
      )
      AND c.assigned_to IS NULL
    `)

    /*
     * Training Engagements
     *
     * Total training engagements managed by the bureau.
     */
    const totalTraining = await query(`
      SELECT COUNT(*)::int AS count
      FROM training_engagements
    `)

    /*
     * Operational Alerts
     *
     * Only notifications belonging to the currently
     * authenticated administrator.
     */
    const unresolvedAlerts = await query(
      `
        SELECT COUNT(*)::int AS count
        FROM notifications
        WHERE user_id = $1
          AND is_read = false
      `,
      [user.id]
    )

    const stats = {
      total_cases:
        clientRequests.rows[0]?.count ?? 0,

      active_investigations:
        activeInvestigations.rows[0]?.count ?? 0,

      pending_assignments:
        pendingAssignments.rows[0]?.count ?? 0,

      total_training:
        totalTraining.rows[0]?.count ?? 0,

      unresolved_alerts:
        unresolvedAlerts.rows[0]?.count ?? 0,
    }

    console.log("ADMIN DASHBOARD STATS:", stats)

    return NextResponse.json(stats)
  } catch (error) {
    console.error(
      "DASHBOARD OVERVIEW ERROR",
      error
    )

    return NextResponse.json(
      {
        error: "Failed to load dashboard",
      },
      {
        status: 500,
      }
    )
  }
}