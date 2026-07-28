import RoleDashboard from "@/components/dashboard/RoleDashboard"

export default function AnalystDashboard() {
  return (
    <RoleDashboard
      eyebrow="Intelligence Analysis"
      title="Analyst Dashboard"
      description="Prioritize intelligence queues, manage analysis tasks, and prepare report-ready findings for internal review."
      metrics={[
        { key: "intelligence_queue", label: "Intelligence Queue", value: "0", helper: "Cases awaiting analytical review" },
        { key: "pending_analysis", label: "Analysis Tasks", value: "0", helper: "Entity, timeline, OSINT, and forensic analysis work" },
        { key: "completed_reports", label: "Reports Pending", value: "0", helper: "Findings waiting for report compilation" },
        { key: "priority_cases", label: "Priority Cases", value: "0", helper: "High-priority analytical work" },
      ]}
      queueTitle="Analyst Tasking"
      queueItems={[
        { title: "Source review", detail: "OSINT and submitted evidence queues will be organized here.", status: "Prepared" },
        { title: "Entity correlation", detail: "Graph-linked entities and relationships will feed analyst tasks.", status: "Ready" },
        { title: "Findings draft", detail: "Report-ready findings can be staged before final review.", status: "Queued" },
      ]}
    />
  )
}
