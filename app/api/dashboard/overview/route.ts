import { NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

async function count(sql: string, params: unknown[] = []) {
  try {
    const result = await query<{ total: string | number }>(sql, params)
    return Number(result.rows[0]?.total || 0)
  } catch (error) {
    console.error("DASHBOARD COUNT ERROR", error)
    return 0
  }
}

async function profileId(userId: string) {
  const result = await query<{ id: string }>("SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1", [userId]).catch(() => ({ rows: [] }))
  return result.rows[0]?.id || null
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const profile = await profileId(user.id)

    if (user.role === "client") {
      return NextResponse.json({
        pending_quotes: await count(
 `
 SELECT COUNT(*) AS total
 FROM requests
 WHERE user_id=$1
 AND status='quote_sent'
 `,
 [user.id]
),
        active_cases: await count(
          "SELECT COUNT(*) AS total FROM cases WHERE client_profile_id=$1 AND status <> 'archived'",
          [profile],
        ),
        latest_updates: await count(
          `
          SELECT COUNT(*) AS total
          FROM case_updates cu
          JOIN cases c ON c.id = cu.case_id
          WHERE c.client_profile_id = $1
            AND cu.created_at > NOW() - INTERVAL '7 days'
          `,
          [profile],
        ),
        unread_messages: await count(
          `
          SELECT COUNT(*) AS total
          FROM messages m
          JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
          WHERE cm.user_id = $1
            AND m.sender_id <> $2
            AND m.read_at IS NULL
          `,
          [user.id, profile],
        ),
        reports_available: await count(
          `
          SELECT COUNT(*) AS total
          FROM case_reports r
          JOIN cases c ON c.id = r.case_id
          WHERE c.client_profile_id = $1
          `,
          [profile],
        ),
      })
    }

    if (user.role === "investigator") {
      return NextResponse.json({

  total_requests: await count(
    "SELECT COUNT(*) AS total FROM requests"
  ),

  pending_requests: await count(
    `
    SELECT COUNT(*) AS total
    FROM requests
    WHERE status IN ('pending_review','submitted','reviewing')
    `
  ),

  quoted_requests: await count(
    `
    SELECT COUNT(*) AS total
    FROM requests
    WHERE status IN ('quote_sent','negotiation_requested','revised_quote_sent')
    `
  ),

  active_cases: await count(
    `
    SELECT COUNT(*) AS total
    FROM cases
    WHERE status NOT IN ('closed','archived','completed')
    `
  ),

  investigators: await count(
    `
    SELECT COUNT(*) AS total
    FROM app_users
    WHERE role='investigator'
    `
  ),

  analysts: await count(
    `
    SELECT COUNT(*) AS total
    FROM app_users
    WHERE role='analyst'
    `
  ),

  unread_notifications: await count(
    `
    SELECT COUNT(*) AS total
    FROM notifications
    WHERE is_read=false
    `
  ),

})
    }

    if (user.role === "analyst") {
      return NextResponse.json({
        intelligence_queue: await count("SELECT COUNT(DISTINCT case_id) AS total FROM case_assignments WHERE assigned_to=$1 AND assignment_role IN ('analyst','intelligence_analyst') AND status IN ('assigned','accepted') AND removed_at IS NULL", [profile]),
        pending_analysis: await count("SELECT COUNT(*) AS total FROM analysis_results ar JOIN case_assignments ca ON ca.case_id=ar.case_id WHERE ca.assigned_to=$1 AND ar.findings IS NULL", [profile]),
        completed_reports: await count("SELECT COUNT(DISTINCT r.id) AS total FROM case_reports r JOIN case_assignments ca ON ca.case_id=r.case_id WHERE ca.assigned_to=$1", [profile]),
        priority_cases: await count("SELECT COUNT(DISTINCT c.id) AS total FROM cases c JOIN case_assignments ca ON ca.case_id=c.id WHERE ca.assigned_to=$1 AND c.priority IN ('high','critical')", [profile]),
      })
    }

    if (isAdminRole(user.role)) {

  if (user.role === "super_administrator") {
    return NextResponse.json({
      total_users: await count(
        "SELECT COUNT(*) AS total FROM app_users"
      ),

      system_activity: await count(
        "SELECT COUNT(*) AS total FROM activity_logs WHERE created_at > NOW() - INTERVAL '24 hours'"
      ),

      audit_events: await count(
        "SELECT COUNT(*) AS total FROM audit_logs WHERE created_at > NOW() - INTERVAL '7 days'"
      ),

      security_events: await count(
        `
        SELECT COUNT(*) AS total
        FROM audit_logs
        WHERE action ILIKE '%security%'
        OR action ILIKE '%password%'
        OR action ILIKE '%two_factor%'
        `
      ),

      database_health:"online",
    })
  }


  return NextResponse.json({

    total_cases: await count(
      `
      SELECT COUNT(*) AS total
      FROM requests
      `
    ),


    active_investigations: await count(
      `
      SELECT COUNT(*) AS total
      FROM requests
      WHERE status IN (
        'reviewing',
        'quote_sent',
        'accepted',
        'active'
      )
      `
    ),


    pending_assignments: await count(
      `
      SELECT COUNT(*) AS total
      FROM requests
      WHERE status IN (
        'pending_review',
        'submitted'
      )
      `
    ),


    investigators: await count(
      `
      SELECT COUNT(*) AS total
      FROM app_users
      WHERE role='investigator'
      `
    ),


    analysts: await count(
      `
      SELECT COUNT(*) AS total
      FROM app_users
      WHERE role='analyst'
      `
    ),


    unresolved_alerts: await count(
      `
      SELECT COUNT(*) AS total
      FROM notifications
      WHERE is_read=false
      `
    ),

  })
}
     

    return NextResponse.json({})
  } catch (error) {
    console.error("DASHBOARD OVERVIEW ERROR", error)
    return NextResponse.json({ error: "Failed to load dashboard overview" }, { status: 500 })
  }
}
