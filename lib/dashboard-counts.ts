import { query } from "@/lib/db"

export const CASE_STATUSES = {
  active: ["active"],
  awaitingAssignment: ["awaiting_assignment"],
  waitingOnClient: ["waiting_client", "waiting_evidence"],
  reportReview: ["report_review"],
} as const

export const ACTIVE_ASSIGNMENT_STATUSES = [
  "assigned",
  "approved",
  "active",
  "accepted",
] as const

export const OPERATIONAL_CASE_ASSIGNMENT_ROLES = [
  "lead_investigator",
  "investigator",
  "analyst",
] as const

export type DashboardCounts = Record<string, number>

function intValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getClientDashboardCounts({
  userId,
  profileId,
}: {
  userId: string
  profileId: string
}): Promise<DashboardCounts> {
  const result = await query<DashboardCounts>(
    `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM requests
          WHERE user_id = $1::uuid
        ) AS requests_total,
        (
          SELECT COUNT(*)::int
          FROM requests
          WHERE user_id = $1::uuid
            AND status IN (
              'quote_sent',
              'revised_quote_sent',
              'awaiting_client_acceptance',
              'negotiation_requested',
              'information_requested',
              'awaiting_client_information'
            )
        ) AS requests_requiring_action,
        (
          SELECT COUNT(*)::int
          FROM cases
          WHERE client_profile_id = $2::uuid
            AND status = 'active'
        ) AS active_cases,
        (
          SELECT COUNT(DISTINCT mr.conversation_id)::int
          FROM message_receipts mr
          JOIN conversations cv
            ON cv.id = mr.conversation_id
          JOIN cases c
            ON c.id = cv.case_id
          WHERE mr.user_id = $1::uuid
            AND mr.read_at IS NULL
            AND c.client_profile_id = $2::uuid
        ) AS unread_case_conversations,
        (
          SELECT COUNT(*)::int
          FROM case_reports r
          JOIN cases c
            ON c.id = r.case_id
          WHERE c.client_profile_id = $2::uuid
            AND COALESCE(r.status, 'published') IN (
              'approved',
              'delivered',
              'final',
              'published'
            )
            AND COALESCE(r.classification, 'confidential') <> 'internal'
        ) AS reports,
        (
          SELECT COUNT(DISTINCT r.id)::int
          FROM case_reports r
          JOIN cases c
            ON c.id = r.case_id
          JOIN notifications n
            ON n.user_id = $1::uuid
           AND n.is_read = false
           AND (
             n.metadata->>'report_id' = r.id::text
             OR n.metadata->>'reportId' = r.id::text
             OR (
               COALESCE(n.metadata->>'resource_type', n.metadata->>'resourceType') = 'report'
               AND COALESCE(n.metadata->>'resource_id', n.metadata->>'resourceId') = r.id::text
             )
           )
          WHERE c.client_profile_id = $2::uuid
            AND COALESCE(r.status, 'published') IN (
              'approved',
              'delivered',
              'final',
              'published'
            )
            AND COALESCE(r.classification, 'confidential') <> 'internal'
        ) AS new_reports,
        (
          SELECT COUNT(*)::int
          FROM training_engagements
          WHERE client_profile_id = $2::uuid
        ) AS training_engagements,
        (
          SELECT COUNT(DISTINCT tc.id)::int
          FROM training_certificates tc
          JOIN training_engagements te
            ON te.id = tc.training_engagement_id
          WHERE tc.client_profile_id = $2::uuid
            AND te.client_profile_id = $2::uuid
            AND tc.status = 'issued'
        ) AS certificates,
        (
          SELECT COUNT(DISTINCT tc.id)::int
          FROM training_certificates tc
          JOIN training_engagements te
            ON te.id = tc.training_engagement_id
          JOIN notifications n
            ON n.user_id = $1::uuid
           AND n.is_read = false
           AND (
             n.metadata->>'certificate_id' = tc.id::text
             OR n.metadata->>'certificateId' = tc.id::text
             OR (
               COALESCE(n.metadata->>'resource_type', n.metadata->>'resourceType') = 'certificate'
               AND COALESCE(n.metadata->>'resource_id', n.metadata->>'resourceId') = tc.id::text
             )
           )
          WHERE tc.client_profile_id = $2::uuid
            AND te.client_profile_id = $2::uuid
            AND tc.status = 'issued'
        ) AS new_certificates,
        (
          SELECT COUNT(DISTINCT p.id)::int
          FROM payments p
          LEFT JOIN cases c
            ON c.id = p.case_id
          LEFT JOIN requests r
            ON r.id = p.request_id
          LEFT JOIN training_engagements te
            ON te.id = p.training_engagement_id
          WHERE COALESCE(p.status, 'pending') IN (
              'pending',
              'unpaid',
              'awaiting_payment',
              'failed'
            )
            AND (
              c.client_profile_id = $2::uuid
              OR r.user_id = $1::uuid
              OR te.client_profile_id = $2::uuid
            )
        ) AS outstanding_payments,
        (
          SELECT COUNT(*)::int
          FROM notifications
          WHERE user_id = $1::uuid
            AND is_read = false
        ) AS unread_notifications
    `,
    [userId, profileId],
  )

  return Object.fromEntries(
    Object.entries(result.rows[0] || {}).map(([key, value]) => [
      key,
      intValue(value),
    ]),
  )
}

export async function getStaffDashboardCounts({
  userId,
  profileId,
}: {
  userId: string
  profileId: string
}): Promise<DashboardCounts> {
  const result = await query<DashboardCounts>(
    `
      WITH active_case_assignments AS (
        SELECT DISTINCT ca.case_id
        FROM case_assignments ca
        JOIN cases c
          ON c.id = ca.case_id
        WHERE ca.assigned_to = $2::uuid
          AND ca.removed_at IS NULL
          AND COALESCE(ca.status, 'assigned') = ANY($3::text[])
          AND COALESCE(ca.assignment_role, 'investigator') = ANY($4::text[])
          AND c.status IN ('active', 'waiting_client', 'waiting_evidence', 'report_review')
      ),
      active_training_assignments AS (
        SELECT DISTINCT tet.training_engagement_id
        FROM training_engagement_trainers tet
        JOIN training_engagements te
          ON te.id = tet.training_engagement_id
        WHERE tet.trainer_profile_id = $2::uuid
          AND tet.removed_at IS NULL
          AND COALESCE(tet.assignment_status, 'approved') = 'approved'
          AND COALESCE(te.status, 'awaiting_payment') NOT IN ('completed', 'closed', 'archived')
      )
      SELECT
        (
          SELECT COUNT(*)::int
          FROM active_case_assignments
        ) AS assigned_active_cases,
        (
          SELECT COUNT(*)::int
          FROM active_case_assignments aca
          JOIN cases c
            ON c.id = aca.case_id
          WHERE c.status IN ('waiting_client', 'waiting_evidence', 'report_review')
        ) AS cases_awaiting_staff_action,
        (
          SELECT COUNT(*)::int
          FROM active_training_assignments
        ) AS assigned_training_engagements,
        (
          SELECT COUNT(DISTINCT mr.conversation_id)::int
          FROM message_receipts mr
          JOIN conversations cv
            ON cv.id = mr.conversation_id
          JOIN active_case_assignments aca
            ON aca.case_id = cv.case_id
          WHERE mr.user_id = $1::uuid
            AND mr.read_at IS NULL
        ) AS unread_assigned_case_conversations,
        (
          SELECT COUNT(*)::int
          FROM case_reports r
          WHERE r.created_by = $2::uuid
            AND COALESCE(r.status, 'draft') IN ('draft', 'pending', 'review', 'pending_review')
        ) AS reports_in_progress,
        (
          SELECT COUNT(*)::int
          FROM case_reports r
          WHERE r.created_by = $2::uuid
            AND COALESCE(r.status, '') IN ('revision_requested', 'needs_revision', 'changes_requested')
        ) AS reports_requiring_revision,
        (
          SELECT COUNT(*)::int
          FROM investigation_tasks t
          WHERE t.assigned_to = $2::uuid
            AND COALESCE(t.status, 'pending') NOT IN ('completed', 'closed', 'archived')
        ) AS assigned_tasks,
        (
          SELECT COUNT(*)::int
          FROM training_sessions ts
          JOIN active_training_assignments ata
            ON ata.training_engagement_id = ts.training_engagement_id
          WHERE ts.scheduled_at >= NOW()
            AND COALESCE(ts.status, 'scheduled') = 'scheduled'
        ) AS upcoming_training_sessions,
        (
          SELECT COUNT(*)::int
          FROM notifications
          WHERE user_id = $1::uuid
            AND is_read = false
        ) AS unread_notifications
    `,
    [
      userId,
      profileId,
      [...ACTIVE_ASSIGNMENT_STATUSES],
      [...OPERATIONAL_CASE_ASSIGNMENT_ROLES],
    ],
  )

  return Object.fromEntries(
    Object.entries(result.rows[0] || {}).map(([key, value]) => [
      key,
      intValue(value),
    ]),
  )
}

export async function getAdminDashboardCounts({
  userId,
  profileId,
  superAdmin = false,
}: {
  userId: string
  profileId: string | null
  superAdmin?: boolean
}): Promise<DashboardCounts> {
  const personalProfile = profileId || "00000000-0000-0000-0000-000000000000"
  const result = await query<DashboardCounts>(
    `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM requests
          WHERE status = $3
        ) AS requests_awaiting_review,
        (
          SELECT COUNT(*)::int
          FROM requests
          WHERE status IN ($4, $5)
        ) AS quotes_requiring_action,
        (
          SELECT COUNT(*)::int
          FROM cases
          WHERE status = 'awaiting_assignment'
        ) AS cases_awaiting_assignment,
        (
          SELECT COUNT(*)::int
          FROM cases
          WHERE status = 'active'
        ) AS active_cases,
        (
          SELECT COUNT(*)::int
          FROM cases
          WHERE status IN ('waiting_client', 'waiting_evidence')
        ) AS cases_waiting_client_evidence,
        (
          SELECT COUNT(*)::int
          FROM case_reports
          WHERE COALESCE(status, 'draft') = $6
        ) AS reports_pending_review,
        (
          SELECT COUNT(*)::int
          FROM training_engagements
          WHERE status IN ('awaiting_assignment', 'pending_assignment', 'awaiting_scheduling')
             OR trainer_approval_status IN ($7, 'pending')
        ) AS training_requiring_action,
        (
          SELECT COUNT(DISTINCT p.id)::int
          FROM payments p
          WHERE COALESCE(p.status, 'pending') IN (
            'pending',
            'unpaid',
            'awaiting_payment',
            'failed',
            'requires_confirmation'
          )
        ) AS outstanding_payments,
        (
          SELECT COUNT(*)::int
          FROM app_users
          WHERE status = 'active'
            AND role IN ('staff', 'administrator', 'super_administrator', 'super-administrator')
        ) AS active_staff,
        (
          SELECT COUNT(*)::int
          FROM notifications
          WHERE user_id = $1::uuid
            AND is_read = false
        ) AS unread_notifications,
        (
          SELECT COUNT(DISTINCT ca.case_id)::int
          FROM case_assignments ca
          JOIN cases c
            ON c.id = ca.case_id
          WHERE ca.assigned_to = $2::uuid
            AND ca.removed_at IS NULL
            AND COALESCE(ca.status, 'assigned') = ANY($8::text[])
            AND COALESCE(ca.assignment_role, 'investigator') = ANY($9::text[])
            AND c.status IN ('active', 'waiting_client', 'waiting_evidence', 'report_review')
        ) AS my_assigned_cases,
        (
          SELECT COUNT(DISTINCT tet.training_engagement_id)::int
          FROM training_engagement_trainers tet
          JOIN training_engagements te
            ON te.id = tet.training_engagement_id
          WHERE tet.trainer_profile_id = $2::uuid
            AND tet.removed_at IS NULL
            AND COALESCE(tet.assignment_status, 'approved') = 'approved'
            AND COALESCE(te.status, 'awaiting_payment') NOT IN ('completed', 'closed', 'archived')
        ) AS my_assigned_training
    `,
    [
      userId,
      personalProfile,
      superAdmin
        ? "pending_super_admin_review"
        : "pending_admin_review",
      superAdmin
        ? "pending_super_admin_quote_review"
        : "pending_admin_quote_review",
      superAdmin
        ? "quote_pending_super_admin_approval"
        : "quote_pending_admin_action",
      superAdmin ? "pending_final_approval" : "pending_review",
      superAdmin ? "pending_super_admin_approval" : "pending_admin_approval",
      [...ACTIVE_ASSIGNMENT_STATUSES],
      [...OPERATIONAL_CASE_ASSIGNMENT_ROLES],
    ],
  )

  return Object.fromEntries(
    Object.entries(result.rows[0] || {}).map(([key, value]) => [
      key,
      intValue(value),
    ]),
  )
}
