"use client"

import { useEffect, useState } from "react"
import RoleDashboard from "@/components/dashboard/RoleDashboard"

type DashboardStats = {
  total_cases?: number
  active_investigations?: number
  pending_assignments?: number
  unresolved_alerts?: number
  total_training?: number
}

export default function AdministratorDashboard() {
  const [stats, setStats] =
    useState<DashboardStats | null>(null)

  useEffect(() => {
    let mounted = true

    fetch("/api/dashboard/overview", {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            `Dashboard request failed: ${res.status}`,
          )
        }

        return res.json()
      })
      .then((data) => {
        if (mounted) {
          setStats(data)
        }
      })
      .catch((error) => {
        console.error(
          "ADMIN DASHBOARD ERROR:",
          error,
        )

        if (mounted) {
          setStats({
            total_cases: 0,
            active_investigations: 0,
            pending_assignments: 0,
            unresolved_alerts: 0,
            total_training: 0,
          })
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  if (!stats) {
    return (
      <div className="p-6 text-sm text-white/50">
        Loading dashboard...
      </div>
    )
  }

  return (
    <RoleDashboard
      role="administrator"
      eyebrow="Mission Control"
      title="Administrator Dashboard"
      description="Manage client requests, prepare investigation quotes, review operational workflow, and coordinate active bureau assignments."
      metrics={[
        {
          key: "total_cases",
          label: "Client Requests",
          value: String(stats.total_cases ?? 0),
          helper: "Total client requests received",
        },
        {
          key: "active_investigations",
          label: "Active Investigations",
          value: String(
            stats.active_investigations ?? 0,
          ),
          helper:
            "Requests currently moving through the operational workflow",
        },
        {
          key: "total_training",
          label: "Training Engagements",
          value: String(
            stats.total_training ?? 0,
          ),
          helper:
            "Total training engagements in the bureau",
        },
        {
          key: "pending_assignments",
          label: "Team Workload",
          value: String(
            stats.pending_assignments ?? 0,
          ),
          helper:
            "Requests requiring administrator attention",
        },
        {
          key: "unresolved_alerts",
          label: "Operational Alerts",
          value: String(
            stats.unresolved_alerts ?? 0,
          ),
          helper:
            "Unread notifications and operational items",
        },
      ]}
      queueTitle=""
      queueItems={[]}
    />
  )
}