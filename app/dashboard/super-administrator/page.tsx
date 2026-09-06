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
            key: "database_health",
            label: "System Health",
            value: "error",
            helper: error,
          },
          {
            key: "total_users",
            label: "Users",
            value: "—",
            helper:
              "Unable to load user statistics",
          },
          {
            key: "audit_events",
            label: "Audit Logs",
            value: "—",
            helper:
              "Unable to load audit statistics",
          },
          {
            key: "security_events",
            label: "Security Overview",
            value: "—",
            helper:
              "Unable to load security statistics",
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
          key: "database_health",
          label: "System Health",
          value:
            systemHealth === "healthy"
              ? "Ready"
              : systemHealth === "unhealthy"
                ? "Unhealthy"
                : "Loading",
          helper:
            "Application, database, and service readiness overview",
        },
        {
          key: "total_users",
          label: "Users",
          value:
            stats?.total_users?.toString() || "0",
          helper:
            "Role-governed personnel and client accounts",
        },
{
  key: "total_training",
  label: "Training Engagements",
  value:
    stats?.total_training?.toString() || "0",
  helper:
    "Total training engagements across the bureau",
},

        {
          key: "audit_events",
          label: "Audit Logs",
          value:
            stats?.audit_events?.toString() || "0",
          helper:
            "Security-relevant actions and administrative events",
        },
        {
          key: "security_events",
          label: "Security Overview",
          value:
            stats?.security_events?.toString() || "0",
          helper:
            "Authentication, session, and access-control events",
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