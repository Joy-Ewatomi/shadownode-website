import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

const invoiceOwnerColumn = `client_${"id"}`

async function count(sql: string, params: unknown[] = []) {
  const result = await query<{ total: string | number }>(sql, params)
  return Number(result.rows[0]?.total || 0)
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isAdminRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const [
      activeCasesTotal,
      highPriorityCases,
      pendingClientRequests,
      publishedReports,
      investigatorsOnline,
      evidenceUploadedToday,
      recentActivity,
      activeCases,
      pendingRequests,
      pendingInvoices,
      investigatorWorkload,
      notifications,
      quoteReviews,
      alerts,
    ] = await Promise.all([
      count("SELECT COUNT(*) AS total FROM cases WHERE status <> 'archived'"),
      count("SELECT COUNT(*) AS total FROM cases WHERE priority IN ('high', 'critical') AND status <> 'archived'"),
      count(`
  SELECT COUNT(*) AS total
  FROM requests
  WHERE status IN (
    'pending_admin_review',
    'negotiation_requested'
  )
`),
      count("SELECT COUNT(*) AS total FROM case_reports"),
      count("SELECT COUNT(*) AS total FROM app_users WHERE role IN ('staff', 'investigator', 'analyst') AND status='active'"),
      count("SELECT COUNT(*) AS total FROM forensic_files WHERE created_at >= CURRENT_DATE"),
      query(
        `
        SELECT activity_type, title, detail, created_at
        FROM (
          SELECT 'case_update' AS activity_type, COALESCE(title, update_type) AS title, content AS detail, created_at
          FROM case_updates
          UNION ALL
          SELECT 'activity_log' AS activity_type, action AS title, details::text AS detail, created_at
          FROM activity_logs
          UNION ALL
          SELECT 'audit_log' AS activity_type, action AS title, metadata::text AS detail, created_at
          FROM audit_logs
        ) activity
        ORDER BY created_at DESC
        LIMIT 12
        `,
      ),
      query(
        `
        SELECT qn.*, r.case_number, r.title AS request_title, r.ai_price_estimate, r.approved_quote_amount, au.email AS client_email,
          COALESCE(
            json_agg(
              json_build_object(
                'id', history.id,
                'round_number', history.round_number,
                'status', history.status,
                'requested_budget', history.requested_budget,
                'client_reason', history.client_reason,
                'administrator_recommendation', history.administrator_recommendation,
                'revised_quote_amount', history.revised_quote_amount,
                'owner_decision', history.owner_decision,
                'created_at', history.created_at
              )
              ORDER BY history.created_at ASC
            ) FILTER (WHERE history.id IS NOT NULL),
            '[]'::json
          ) AS history
        FROM quote_negotiations qn
        JOIN requests r ON r.id=qn.request_id
        LEFT JOIN app_users au ON au.id=qn.client_id
        LEFT JOIN quote_negotiations history
        ON history.request_id=qn.request_id
        WHERE qn.status IN ('requested', 'reviewing', 'approved')
        GROUP BY qn.id, r.id, au.email
        ORDER BY qn.created_at DESC
        LIMIT 10
        `,
      ).catch((error) => {
  console.error("MISSION CONTROL QUOTE NEGOTIATIONS ERROR", error)
  throw error
}),
      query(
        `
        SELECT
          c.id,
          c.case_number,
          c.title,
          c.priority,
          c.status,
          c.progress,
          COALESCE(au.username, up.full_name, 'Unassigned') AS assigned_investigator
        FROM cases c
        LEFT JOIN user_profiles up ON up.id = c.assigned_to
        LEFT JOIN app_users au ON au.id = up.user_id
        WHERE c.status <> 'archived'
        ORDER BY
          CASE c.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
          c.created_at DESC
        LIMIT 10
        `,
      ),
 query(
  `
  SELECT
    r.id,
    r.case_number,
    r.title,
    r.service_type,
    r.status,
    r.client_email,
    r.created_at,
    qn.id AS negotiation_id,
    qn.requested_budget,
    qn.quote_currency,
    qn.client_reason,
    qn.status AS negotiation_status
  FROM requests r
  LEFT JOIN LATERAL (
    SELECT
      id,
      requested_budget,
      quote_currency,
      client_reason,
      status
    FROM quote_negotiations
    WHERE request_id = r.id
    ORDER BY created_at DESC
    LIMIT 1
  ) qn ON true
  WHERE r.status IN (
    'pending_admin_review',
    'negotiation_requested'
  )
  ORDER BY r.created_at DESC
  LIMIT 10
  `,
),
      query(
        `
        SELECT i.id, i.case_id, i.${invoiceOwnerColumn} AS invoice_user_id, i.amount, i.currency, i.status, i.created_at, c.case_number, c.title AS case_title
        FROM invoices i
        LEFT JOIN cases c ON c.id = i.case_id
        WHERE i.status IN ('draft', 'sent')
        ORDER BY i.created_at DESC
        LIMIT 10
        `,
      ).catch(() => ({ rows: [] })),
      query(
        `
        SELECT
          up.id,
          COALESCE(up.full_name, au.username) AS name,
          au.role,
          COUNT(ca.case_id)::int AS assigned_cases,
          COUNT(ca.case_id)::int AS current_workload
        FROM user_profiles up
        JOIN app_users au ON au.id = up.user_id
        LEFT JOIN case_assignments ca ON ca.assigned_to = up.id AND ca.removed_at IS NULL
        WHERE au.role IN ('staff', 'investigator', 'analyst')
          AND au.status = 'active'
        GROUP BY up.id, up.full_name, au.username, au.role
        ORDER BY current_workload DESC, name ASC
        LIMIT 12
        `,
      ),
      query(
        `
        SELECT id, case_id, type, title, message, is_read, created_at
        FROM notifications
        WHERE user_id = $1
          AND is_read = false
        ORDER BY created_at DESC
        LIMIT 10
        `,
        [user.id],
      ),
      query(
        `
        SELECT id, case_number, title, priority, status, progress, created_at
        FROM cases
        WHERE priority = 'critical'
          AND status <> 'archived'
        ORDER BY created_at DESC
        LIMIT 8
        `,
      ),
    ])

    await auditLog(user.id, "mission_control_viewed", request)

 return NextResponse.json({
  user_role: user.role,

  statistics: {
        active_cases: activeCasesTotal,
        high_priority_cases: highPriorityCases,
        pending_client_requests: pendingClientRequests,
        published_reports: publishedReports,
        investigators_online: investigatorsOnline,
        evidence_uploaded_today: evidenceUploadedToday,
      },
      recent_activity: recentActivity.rows,
      active_cases: activeCases.rows,
      pending_requests: pendingRequests.rows,
      pending_reports: [],
      pending_invoices: pendingInvoices.rows,
      quote_reviews: quoteReviews.rows,
      investigator_workload: investigatorWorkload.rows,
      notifications: notifications.rows,
      alerts: alerts.rows,
    })
  } catch (error) {
    console.error("MISSION CONTROL ERROR", error)
    return NextResponse.json({ error: "Failed to load mission control" }, { status: 500 })
  }
}
