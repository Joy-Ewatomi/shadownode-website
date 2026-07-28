import RoleDashboard from "@/components/dashboard/RoleDashboard"

export default function AdministratorDashboard() {
  return (
    <RoleDashboard
      eyebrow="Mission Control"
      title="Administrator Dashboard"
      description="Review bureau-wide case posture, active investigation load, team workload, and operational approvals."
      metrics={[
        { label: "Mission Control Summary", value: "Online", helper: "Command surface ready for live operational metrics" },
        { label: "Active Investigations", value: "0", helper: "Open cases across all teams" },
        { label: "Team Workload", value: "0", helper: "Assignments distributed across investigators and analysts" },
        { label: "Pending Approvals", value: "0", helper: "Requests, transitions, and reports awaiting approval" },
      ]}
      queueTitle="Administrator Review Queue"
      queueItems={[
        { title: "Case intake review", detail: "Anonymous and registered requests will be triaged here.", status: "Prepared" },
        { title: "Team assignments", detail: "Workload balancing will connect to normalized assignments.", status: "Ready" },
        { title: "Report approval", detail: "Final reports will queue for administrator sign-off.", status: "Queued" },
        { title: "Audit review", detail: "Operational events and sensitive actions will surface for inspection.", status: "Secure" },
      ]}
    />
  )
}
