import RoleDashboard from "@/components/dashboard/RoleDashboard"

export default function InvestigatorDashboard() {
  return (
    <RoleDashboard
      role="investigator"
      eyebrow="Field Operations"
      title="Investigator Dashboard"
      description="Coordinate assigned investigations, accept or reject assignment requests, track deadlines, and manage evidence collection tasks."
      metrics={[
        {
          key: "assigned_cases",
          label: "Assigned Cases",
          value: "0",
          helper: "Cases assigned to your operator profile",
        },
        {
          key: "pending_assignments",
          label: "Pending Assignments",
          value: "0",
          helper: "Assignments awaiting acceptance or rejection",
        },
        {
          key: "deadlines",
          label: "Deadlines",
          value: "0",
          helper: "Upcoming operational due dates",
        },
        {
          key: "evidence_tasks",
          label: "Evidence Tasks",
          value: "0",
          helper: "Collection, review, and chain-of-custody actions",
        },
      ]}
      queueTitle="Investigator Work Queue"
      queueItems={[]}
    />
  )
}