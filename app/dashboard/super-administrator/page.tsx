"use client"

import { useEffect, useState } from "react"
import RoleDashboard from "@/components/dashboard/RoleDashboard"

type DashboardStats = {
  system_health: string
  total_users: number
  audit_events: number
  security_events: number
  total_training: number

  security: {
    active_sessions: number
    login_events: number
    oauth_accounts: number
  }

  governance: {
    active_users: number
    pending_users: number
    disabled_users: number
    super_admins: number
    administrators: number
  }

  operational: {
    requests_awaiting_review?: number
    quotes_requiring_action?: number
    cases_awaiting_assignment?: number
    active_cases?: number
    reports_pending_review?: number
    training_requiring_action?: number
    outstanding_payments?: number
    active_staff?: number
    unread_notifications?: number
    my_assigned_cases?: number
    my_assigned_training?: number
  }
}

export default function SuperAdministratorDashboard() {
  const [stats, setStats] =
    useState<DashboardStats | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      try {
        setError(null)

        const response = await fetch(
          "/api/dashboard/super-admin",
          {
            method: "GET",
            cache: "no-store",
          },
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to load dashboard",
          )
        }

        if (mounted) {
          setStats(data)
        }
      } catch (err) {
        console.error(
          "SUPER ADMIN DASHBOARD FETCH ERROR",
          err,
        )

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load dashboard",
          )
        }
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  if (error) {
    return (
      <RoleDashboard
        role="super_admin"
        eyebrow="Bureau Command"
        title="Super Administrator Dashboard"
        description="Monitor platform health, user governance, audit posture, and security controls across the ShadowNode operating environment."
        metrics={[
          {
            key: "requests_awaiting_review",
            label: "Requests Awaiting Final Review",
            value: "error",
            helper: error,
            icon: "alert",
          },
          {
            key: "active_cases",
            label: "Active Cases",
            value: "—",
            helper: "Unable to load operational statistics",
            icon: "briefcase",
          },
          {
            key: "active_staff",
            label: "Active Staff",
            value: "—",
            helper: "Unable to load team statistics",
            icon: "users",
          },
          {
            key: "unread_notifications",
            label: "My Notifications",
            value: "—",
            helper: "Unable to load personal notifications",
            icon: "bell",
          },
        ]}
        queueTitle="System Governance"
        queueItems={[]}
      />
    )
  }

  const systemHealth =
    stats?.system_health || "loading"

  return (
    <RoleDashboard
      role="super_admin"
      eyebrow="Bureau Command"
      title="Super Administrator Dashboard"
      description="Monitor platform health, user governance, audit posture, and security controls across the ShadowNode operating environment."
      metrics={[
        {
          key: "requests_awaiting_review",
          label: "Requests Awaiting Final Review",
          value: String(stats?.operational.requests_awaiting_review ?? 0),
          helper: "Organization-wide requests awaiting super-admin review",
          href: "/dashboard/requests?status=review",
          section: "oversight",
          icon: "receipt",
        },
{
  key: "quotes_requiring_action",
  label: "Quotes Awaiting Approval",
  value: String(stats?.operational.quotes_requiring_action ?? 0),
  helper: "Quote approvals requiring super-admin authority",
  href: "/dashboard/requests?status=quoted",
  section: "oversight",
  icon: "alert",
},
        {
          key: "cases_awaiting_assignment",
          label: "Cases Awaiting Assignment",
          value: String(stats?.operational.cases_awaiting_assignment ?? 0),
          helper: "Organization-wide canonical awaiting_assignment cases",
          href: "/dashboard/cases",
          section: "oversight",
          icon: "briefcase",
        },
        {
          key: "active_cases",
          label: "Active Cases",
          value: String(stats?.operational.active_cases ?? 0),
          helper: "Organization-wide active operational cases",
          href: "/dashboard/cases?status=active",
          section: "oversight",
          icon: "activity",
        },
        {
          key: "reports_pending_review",
          label: "Reports Pending Final Approval",
          value: String(stats?.operational.reports_pending_review ?? 0),
          helper: "Reports awaiting final approval",
          href: "/dashboard/reports?status=pending",
          section: "oversight",
          icon: "fileText",
        },
        {
          key: "training_requiring_action",
          label: "Training Requiring Approval",
          value: String(stats?.operational.training_requiring_action ?? 0),
          helper: "Training approvals, assignments, or scheduling requiring attention",
          href: "/dashboard/training",
          section: "oversight",
          icon: "graduationCap",
        },
        {
          key: "outstanding_payments",
          label: "Payment Exceptions",
          value: String(stats?.operational.outstanding_payments ?? 0),
          helper: "Pending or exception payment records supported by payment status",
          section: "oversight",
          icon: "creditCard",
        },
        {
          key: "active_staff",
          label: "Active Staff",
          value: String(stats?.operational.active_staff ?? 0),
          helper: "Active staff and administrative accounts",
          href: "/dashboard/team",
          section: "oversight",
          icon: "users",
        },
        {
          key: "unread_notifications",
          label: "My Notifications",
          value: String(stats?.operational.unread_notifications ?? 0),
          helper: "Personal unread super-admin notifications only",
          href: "/dashboard/notifications",
          section: "personal",
          icon: "bell",
        },
        {
          key: "my_assigned_cases",
          label: "My Assigned Cases",
          value: String(stats?.operational.my_assigned_cases ?? 0),
          helper: "Operational case assignments to your profile",
          href: "/dashboard/cases?status=active",
          section: "personal",
          icon: "briefcase",
        },
        {
          key: "system_health",
          label: "System Health",
          value:
            systemHealth === "healthy"
              ? "Ready"
              : systemHealth === "unhealthy"
                ? "Unhealthy"
                : "Loading",
          helper:
            "Database readiness, shown separately from operational counts",
          section: "personal",
          icon: "shield",
        },
      ]}
      queueTitle="System Governance"
      queueItems={[
        {
          id: "user-governance",
          title: "User governance",
          detail: stats
            ? `${stats.governance.active_users} active users, ${stats.governance.pending_users} pending, ${stats.governance.disabled_users} disabled.`
            : "Loading user governance...",
          status: stats
            ? "Ready"
            : "Loading",
        },
        {
          id: "audit-intelligence",
          title: "Audit intelligence",
          detail: stats
            ? `${stats.audit_events} request audit events recorded.`
            : "Loading audit intelligence...",
          status: stats
            ? "Prepared"
            : "Loading",
        },
        {
          id: "security-controls",
          title: "Security controls",
          detail: stats
            ? `${stats.security.active_sessions} active sessions and ${stats.security.login_events} login events recorded.`
            : "Loading security controls...",
          status: stats
            ? "Secure"
            : "Loading",
        },
        {
          id: "platform-health",
          title: "Platform health",
          detail: stats
            ? `Database connection is ${stats.system_health}.`
            : "Checking database health...",
          status:
            stats?.system_health === "healthy"
              ? "Ready"
              : stats
                ? "Attention"
                : "Loading",
        },
      ]}
    />
  )
}
