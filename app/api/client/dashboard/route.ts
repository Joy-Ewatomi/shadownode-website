import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const profile = await query<{ id: string }>("SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1", [user.id]).catch(() => ({ rows: [] }))
    const profileId = profile.rows[0]?.id || null

    const [requests, cases, reports, notifications, stats] = await Promise.all([
 query(
`
 SELECT
 id,
 case_number,
 title,
 status,
 priority,
 progress,
 created_at
FROM cases
WHERE client_profile_id=$1
AND payment_status='paid'
ORDER BY created_at DESC
LIMIT 6
`,
[profileId],
),
      query(
        `
        SELECT id, case_number, title, status, priority, progress, estimated_completion, created_at
        FROM cases
        WHERE client_profile_id=$1
        ORDER BY created_at DESC
        LIMIT 6
        `,
        [profileId],
      ),
      query(
        `
        SELECT r.id, r.title, r.summary, r.created_at, c.case_number
        FROM case_reports r
        JOIN cases c ON c.id=r.case_id
        WHERE c.client_profile_id=$1
        ORDER BY r.created_at DESC
        LIMIT 6
        `,
        [profileId],
      ),
      query(
        `
        SELECT id, type, title, message, is_read, created_at, case_id
        FROM notifications
        WHERE user_id=$1
        ORDER BY created_at DESC
        LIMIT 6
        `,
        [user.id],
      ).catch(() => ({ rows: [] })),
      query<{ active_cases: string; open_requests: string; reports_available: string; unread_notifications: string }>(
        `
        SELECT
          (SELECT COUNT(*) FROM cases WHERE client_profile_id=$2 AND status <> 'archived') AS active_cases,
          (SELECT COUNT(*) FROM requests WHERE user_id=$1 AND status NOT IN ('active', 'rejected', 'declined', 'completed')) AS open_requests,
          (SELECT COUNT(*) FROM case_reports r JOIN cases c ON c.id=r.case_id WHERE c.client_profile_id=$2) AS reports_available,
          (SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false) AS unread_notifications
        `,
        [user.id, profileId],
      ).catch(() => ({ rows: [{ active_cases: "0", open_requests: "0", reports_available: "0", unread_notifications: "0" }] })),
    ])

    return NextResponse.json({
      stats: stats.rows[0],
      requests: requests.rows,
      cases: cases.rows,
      reports: reports.rows,
      notifications: notifications.rows,
    })
  } catch (error) {
    console.error("CLIENT DASHBOARD ERROR", error)
    return NextResponse.json({ error: "Failed to load client dashboard" }, { status: 500 })
  }
}
