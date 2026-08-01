import RoleDashboard from "@/components/dashboard/RoleDashboard"

export default function AdministratorDashboard() {
  return (
    <RoleDashboard
      eyebrow="Mission Control"
      title="Administrator Dashboard"
      description="Review bureau-wide case posture, active investigation load, team workload, and operational approvals."
      metrics={[
        { key: "total_cases", label: "Mission Control Summary", value: "0", helper: "Total investigations in bureau custody" },
        { key: "active_investigations", label: "Active Investigations", value: "0", helper: "Open cases across all teams" },
        { key: "pending_assignments", label: "Team Workload", value: "0", helper: "Assignments waiting for operator acceptance" },
        { key: "unresolved_alerts", label: "Pending Approvals", value: "0", helper: "Unread operational alerts and approvals" },
      ]}
      queueTitle="Administrator Review Queue"
      queueItems={[
        { title: "Case intake review", detail: "Anonymous and registered requests will be triaged here.", status: "Prepared" },
        { title: "Team assignments", detail: "Workload balancing will connect to normalized assignments.", status: "Ready" },
        { title: "Report approval", detail: "Final reports will queue for administrator sign-off.", status: "Queued" },
        { title: "Audit review", detail: "Operational events and sensitive actions will surface for inspection.", status: "Secure" },
      ]} role={""}    />
  )
}
