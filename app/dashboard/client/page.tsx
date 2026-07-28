import RoleDashboard from "@/components/dashboard/RoleDashboard"

export default function ClientDashboard() {
  return (
    <RoleDashboard
      eyebrow="Client Operations"
      title="Client Dashboard"
      description="Track active investigations, review case movement, monitor secure messages, and prepare final report downloads from one bureau workspace."
      metrics={[
        { key: "active_cases", label: "Active Cases", value: "0", helper: "Live investigations visible to your account" },
        { key: "latest_updates", label: "Case Tracking", value: "0", helper: "Recent case movements from the last seven days" },
        { key: "unread_messages", label: "Messages", value: "0", helper: "Unread secure client-investigator conversations" },
        { key: "reports_available", label: "Reports", value: "0", helper: "Final reports and supporting documents" },
      ]}
      queueTitle="Client Case Activity"
      queueItems={[
        { title: "Active case roster", detail: "Upcoming integration point for client-owned investigations.", status: "Prepared" },
        { title: "Case status timeline", detail: "Workflow transitions will appear here as cases advance.", status: "Queued" },
        { title: "Secure correspondence", detail: "Message summaries will surface without exposing sensitive contents.", status: "Secure" },
        { title: "Report delivery", detail: "Completed reports will become available for download review.", status: "Pending" },
      ]}
    />
  )
}
