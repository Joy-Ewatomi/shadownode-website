"use client"

import { useEffect, useState } from "react"
import RoleDashboard from "@/components/dashboard/RoleDashboard"

type DashboardStats = {
  requests_awaiting_review?: number
  quotes_requiring_action?: number
  cases_awaiting_assignment?: number
  active_cases?: number
  cases_waiting_client_evidence?: number
  reports_pending_review?: number
  training_requiring_action?: number
  outstanding_payments?: number
  active_staff?: number
  unread_notifications?: number
  my_assigned_cases?: number
  my_assigned_training?: number
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
            requests_awaiting_review: 0,
            quotes_requiring_action: 0,
            cases_awaiting_assignment: 0,
            active_cases: 0,
            cases_waiting_client_evidence: 0,
            reports_pending_review: 0,
            training_requiring_action: 0,
            outstanding_payments: 0,
            active_staff: 0,
            unread_notifications: 0,
            my_assigned_cases: 0,
            my_assigned_training: 0,
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
      primaryAction={{
        label: "Create Request",
        href: "/request/anonymous",
      }}
      metrics={[
        {
          key: "total_cases",
          label: "Requests Awaiting Review",
          value: String(stats.requests_awaiting_review ?? 0),
          helper: "Requests awaiting administrator review",
          href: "/dashboard/requests?status=review",
          icon: "receipt",
        },
        {
          key: "cases_awaiting_assignment",
          label: "Cases Awaiting Assignment",
          value: String(stats.cases_awaiting_assignment ?? 0),
          helper: "Canonical awaiting_assignment cases",
          href: "/dashboard/cases",
          icon: "briefcase",
        },
        {
          key: "active_cases",
          label: "Active Cases",
          value: String(stats.active_cases ?? 0),
          helper: "Organization-wide active operational cases",
          href: "/dashboard/cases?status=active",
          icon: "activity",
        },
        {
          key: "active_staff",
          label: "Active Staff",
          value: String(stats.active_staff ?? 0),
          helper: "Active staff and administrative team members",
          href: "/dashboard/team",
          icon: "users",
        },
        {
          key: "quotes_requiring_action",
          label: "Quotes Requiring Action",
          value: String(stats.quotes_requiring_action ?? 0),
          helper: "Quote workflow items administrators may action",
          href: "/dashboard/requests?status=quoted",
          section: "attention",
          icon: "alert",
        },
        {
          key: "cases_waiting_client_evidence",
          label: "Waiting On Client/Evidence",
          value: String(stats.cases_waiting_client_evidence ?? 0),
          helper: "Cases in waiting_client or waiting_evidence",
          href: "/dashboard/cases?status=waiting_client",
          section: "attention",
          icon: "clock",
        },
        {
          key: "reports_pending_review",
          label: "Reports Pending Review",
          value: String(stats.reports_pending_review ?? 0),
          helper: "Reports pending permitted administrator review",
          href: "/dashboard/reports?status=pending",
          section: "attention",
          icon: "fileText",
        },
        {
          key: "training_requiring_action",
          label: "Training Requiring Action",
          value: String(stats.training_requiring_action ?? 0),
          helper: "Training awaiting assignment, scheduling, or approval",
          href: "/dashboard/training",
          section: "attention",
          icon: "graduationCap",
        },
        {
          key: "outstanding_payments",
          label: "Outstanding Payments",
          value: String(stats.outstanding_payments ?? 0),
          helper: "Pending obligations administrators may view",
          section: "attention",
          icon: "creditCard",
        },
        {
          key: "unread_notifications",
          label: "My Notifications",
          value: String(stats.unread_notifications ?? 0),
          helper: "Personal unread administrator notifications",
          href: "/dashboard/notifications",
          section: "attention",
          icon: "bell",
        },
        {
          key: "my_assigned_cases",
          label: "My Assigned Cases",
          value: String(stats.my_assigned_cases ?? 0),
          helper: "Operational assignments to your profile",
          href: "/dashboard/cases?status=active",
          section: "personal",
          icon: "briefcase",
        },
        {
          key: "my_assigned_training",
          label: "My Assigned Training",
          value: String(stats.my_assigned_training ?? 0),
          helper: "Approved training assignments to your profile",
          href: "/dashboard/training",
          section: "personal",
          icon: "graduationCap",
        },
      ]}
      queueTitle="Administrator Operations"
      queueItems={[
        {
          id: "request-review",
          title: "Request review",
          detail: `${stats.requests_awaiting_review ?? 0} client requests await administrator review.`,
          status:
            (stats.requests_awaiting_review ?? 0) > 0
              ? "Action required"
              : "Clear",
          href: "/dashboard/requests?status=review",
        },
        {
          id: "case-assignment",
          title: "Case assignment",
          detail: `${stats.cases_awaiting_assignment ?? 0} cases are waiting for an operational assignment.`,
          status:
            (stats.cases_awaiting_assignment ?? 0) > 0
              ? "Action required"
              : "Clear",
          href: "/dashboard/cases",
        },
        {
          id: "report-review",
          title: "Report review",
          detail: `${stats.reports_pending_review ?? 0} reports await permitted administrator review.`,
          status:
            (stats.reports_pending_review ?? 0) > 0
              ? "Pending"
              : "Clear",
          href: "/dashboard/reports?status=pending",
        },
        {
          id: "training-coordination",
          title: "Training coordination",
          detail: `${stats.training_requiring_action ?? 0} training engagements require assignment, scheduling, or approval.`,
          status:
            (stats.training_requiring_action ?? 0) > 0
              ? "Action required"
              : "Clear",
          href: "/dashboard/training",
        },
        {
          id: "payment-review",
          title: "Payment review",
          detail: `${stats.outstanding_payments ?? 0} outstanding payment obligations are visible to administrators.`,
          status:
            (stats.outstanding_payments ?? 0) > 0
              ? "Pending"
              : "Clear",
        },
      ]}
    />
  )
}
