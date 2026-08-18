import RoleDashboard from "@/components/dashboard/RoleDashboard"

export default function ClientDashboard() {
  return (
    <div className="space-y-6">
      <RoleDashboard
        role="client"
        eyebrow="ShadowNode Operations"
        title="Client Dashboard"
        description="Manage investigation requests, cybersecurity engagements, reports and secure bureau communication."
        metrics={[
          {
            key: "active_cases",
            label: "Active Cases",
            value: "0",
            helper: "Ongoing investigations",
          },
          {
            key: "pending_requests",
            label: "Pending Requests",
            value: "0",
            helper: "Awaiting bureau review",
          },
          {
            key: "available_reports",
            label: "Reports",
            value: "0",
            helper: "Completed intelligence reports",
          },
          {
            key: "notifications",
            label: "Notifications",
            value: "0",
            helper: "Secure updates",
          },
        ]}
        queueTitle="Client Operations"
        queueItems={[
          {
            id: "new_request",
            title: "Create Investigation Request",
            detail:
              "Submit OSINT, cybersecurity, digital forensics or intelligence requests.",
            status: "Available",
          },
          {
            id: "pending_review",
            title: "Request Review",
            detail:
              "ShadowNode analysts review requirements and prepare engagement details.",
            status: "Waiting",
          },
          {
            id: "secure_messages",
            title: "Secure Communication",
            detail:
              "Communicate with assigned analysts through the bureau portal.",
            status: "Secure",
          },
          {
            id: "reports",
            title: "Investigation Reports",
            detail:
              "Access completed intelligence and forensic reports.",
            status: "Protected",
          },
        ]}
      />
    </div>
  )
}