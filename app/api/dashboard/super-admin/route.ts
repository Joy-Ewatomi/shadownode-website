import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getAdminDashboardCounts } from "@/lib/dashboard-counts"
import { query } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"
import { normalizePermanentRole } from "@/lib/role-access"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (normalizePermanentRole(user.role) !== "super_administrator") {
  return NextResponse.json(
    { error: "Forbidden" },
    { status: 403 },
  )
}

    /*
     * ------------------------------------------------------
     * DATABASE HEALTH
     * ------------------------------------------------------
     */
    let databaseHealth = "healthy"

    try {
      await query(`SELECT 1`)
    } catch (error) {
      console.error(
        "SUPER ADMIN DATABASE HEALTH ERROR",
        error,
      )

      databaseHealth = "unhealthy"
    }

/*
 * ------------------------------------------------------
 * USERS
 * ------------------------------------------------------
 */
const usersResult = await query<{
  total_users: number
}>(`
  SELECT
    COUNT(*)::int AS total_users
  FROM app_users
`)

/*
 * ------------------------------------------------------
 * TRAINING ENGAGEMENTS
 * ------------------------------------------------------
 */
const [profileId, operationalCounts] = await Promise.all([
  profileIdForUser(user.id),
  getAdminDashboardCounts({
    userId: user.id,
    profileId: null,
    superAdmin: true,
  }),
])

const personalOperationalCounts = profileId
  ? await getAdminDashboardCounts({
      userId: user.id,
      profileId,
      superAdmin: true,
    })
  : operationalCounts

/*
 * ------------------------------------------------------
 * AUDIT EVENTS
 * ------------------------------------------------------
 */
    const auditResult = await query<{
      audit_events: number
    }>(`
      SELECT
        COUNT(*)::int AS audit_events
      FROM request_audit_events
    `)

    /*
     * ------------------------------------------------------
     * SECURITY EVENTS
     * ------------------------------------------------------
     *
     * Sessions + login history + OAuth accounts give us
     * an actual security posture instead of a hardcoded 0.
     */
    const securityResult = await query<{
      active_sessions: number
      login_events: number
      oauth_accounts: number
    }>(`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM sessions
        ) AS active_sessions,

        (
          SELECT COUNT(*)::int
          FROM login_history
        ) AS login_events,

        (
          SELECT COUNT(*)::int
          FROM oauth_accounts
        ) AS oauth_accounts
    `)

    /*
     * ------------------------------------------------------
     * USER GOVERNANCE
     * ------------------------------------------------------
     */
    const governanceResult = await query<{
      active_users: number
      pending_users: number
      disabled_users: number
      super_admins: number
      administrators: number
    }>(`
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'active'
        )::int AS active_users,

        COUNT(*) FILTER (
          WHERE status NOT IN ('active', 'disabled')
        )::int AS pending_users,

        COUNT(*) FILTER (
          WHERE status = 'disabled'
        )::int AS disabled_users,

        COUNT(*) FILTER (
          WHERE role IN (
            'super_administrator',
            'super-administrator'
          )
        )::int AS super_admins,

        COUNT(*) FILTER (
          WHERE role = 'administrator'
        )::int AS administrators

      FROM app_users
    `)

    const security = securityResult.rows[0] || {
      active_sessions: 0,
      login_events: 0,
      oauth_accounts: 0,
    }

    const governance = governanceResult.rows[0] || {
      active_users: 0,
      pending_users: 0,
      disabled_users: 0,
      super_admins: 0,
      administrators: 0,
    }

    return NextResponse.json({
      system_health: databaseHealth,

  total_users:
  usersResult.rows[0]?.total_users ?? 0,

total_training:
  operationalCounts.training_requiring_action ?? 0,

      operational: {
        ...operationalCounts,
        my_assigned_cases:
          personalOperationalCounts.my_assigned_cases ?? 0,
        my_assigned_training:
          personalOperationalCounts.my_assigned_training ?? 0,
        unread_notifications:
          personalOperationalCounts.unread_notifications ?? 0,
      },

audit_events:
        auditResult.rows[0]?.audit_events ?? 0,

      security_events:
        Number(security.active_sessions) +
        Number(security.login_events),

      security: {
        active_sessions:
          security.active_sessions,

        login_events:
          security.login_events,

        oauth_accounts:
          security.oauth_accounts,
      },

      governance: {
        active_users:
          governance.active_users,

        pending_users:
          governance.pending_users,

        disabled_users:
          governance.disabled_users,

        super_admins:
          governance.super_admins,

        administrators:
          governance.administrators,
      },
    })
  } catch (error) {
    console.error(
      "SUPER ADMIN DASHBOARD ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to load Super Administrator dashboard",
      },
      {
        status: 500,
      },
    )
  }
}
