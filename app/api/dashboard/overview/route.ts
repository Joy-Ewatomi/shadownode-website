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


   const stats = await query(`
  SELECT

    /* =========================
       SYSTEM HEALTH
       ========================= */

    'healthy' AS database_health,

    /* =========================
       USERS
       ========================= */

    (
      SELECT COUNT(*)::int
      FROM app_users
    ) AS total_users,

    (
      SELECT COUNT(*)::int
      FROM app_users
      WHERE status = 'active'
    ) AS active_users,

    /* =========================
       REQUESTS
       ========================= */

    (
      SELECT COUNT(*)::int
      FROM requests
    ) AS total_requests,

    (
      SELECT COUNT(*)::int
      FROM requests
      WHERE status = 'active'
    ) AS active_investigations,

    (
      SELECT COUNT(*)::int
      FROM requests
      WHERE status IN (
        'submitted',
        'pending_review',
        'pending_super_admin_review'
      )
    ) AS pending_requests,

    /* =========================
       AUDIT
       ========================= */

    (
      SELECT COUNT(*)::int
      FROM request_audit_events
    ) AS audit_events,

    /* =========================
       NOTIFICATIONS
       ========================= */

    (
      SELECT COUNT(*)::int
      FROM notifications
      WHERE is_read = false
    ) AS unread_notifications

`)

    const alerts = await query(`
      SELECT COUNT(*)::int AS unresolved_alerts
      FROM notifications
      WHERE is_read = false
      AND user_id = $1
    `,[user.id])


    const requests = await query(`
      SELECT
        r.*,

        u.username AS client_username,
        u.email AS client_email

      FROM requests r

      LEFT JOIN app_users u
        ON u.id = r.user_id

      ORDER BY r.created_at DESC

      LIMIT 100
    `)

    console.log("DASHBOARD REQUESTS:", requests.rows)

  return NextResponse.json({
  database_health:
    stats.rows[0]?.database_health ?? "unknown",

  total_users:
    stats.rows[0]?.total_users ?? 0,

  active_users:
    stats.rows[0]?.active_users ?? 0,

  total_requests:
    stats.rows[0]?.total_requests ?? 0,

  active_investigations:
    stats.rows[0]?.active_investigations ?? 0,

  pending_requests:
    stats.rows[0]?.pending_requests ?? 0,

  audit_events:
    stats.rows[0]?.audit_events ?? 0,

  unread_notifications:
    stats.rows[0]?.unread_notifications ?? 0,
})

  } catch(error){

    console.error(
      "DASHBOARD OVERVIEW ERROR",
      error
    )

    return NextResponse.json(
      {
        error:"Failed to load dashboard"
      },
      {
        status:500
      }
    )
  }
}