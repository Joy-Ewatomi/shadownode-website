"use client"

import RoleDashboard from "@/components/dashboard/RoleDashboard"
import { useClientNotifications } from "@/components/notifications/ClientNotificationProvider"

export default function ClientDashboard() {
  const { unreadCount } = useClientNotifications()

  return (
    <div className="space-y-6">
      <RoleDashboard
        role="client"
        eyebrow="ShadowNode Operations"
        title="Client Dashboard"
        description="Manage investigation requests, cybersecurity engagements, reports and secure bureau communication."
        metrics={[
          {
            key: "requests_total",
            label: "Requests",
            value: "0",
            helper: "Total requests submitted by your account",
            href: "/dashboard/client/requests",
            icon: "receipt",
          },
          {
            key: "active_cases",
            label: "Active Cases",
            value: "0",
            helper: "Your active operational cases",
            href: "/dashboard/client/cases",
            icon: "briefcase",
          },
          {
            key: "reports",
            label: "Reports",
            value: "0",
            helper: "Published reports available to you",
            href: "/dashboard/client/reports",
            icon: "fileText",
          },
          {
            key: "training_engagements",
            label: "Training Engagements",
            value: "0",
            helper: "Training owned by your account",
            href: "/dashboard/client/training",
            icon: "graduationCap",
          },
          {
            key: "certificates",
            label: "Certificates",
            value: "0",
            helper: "Issued training certificates",
            href: "/dashboard/client/certificates",
            icon: "award",
          },
          {
            key: "requests_requiring_action",
            label: "Requests Requiring Action",
            value: "0",
            helper: "Quotes, information requests, or decisions waiting on you",
            href: "/dashboard/client/requests",
            section: "attention",
            icon: "alert",
          },
          {
            key: "unread_case_conversations",
            label: "Unread Case Conversations",
            value: "0",
            helper: "Conversations with unread receipts",
            href: "/dashboard/messages",
            section: "attention",
            icon: "message",
          },
          {
            key: "new_reports",
            label: "New Reports",
            value: "0",
            helper: "Unread report notifications",
            href: "/dashboard/client/reports",
            section: "attention",
            icon: "fileText",
          },
          {
            key: "new_certificates",
            label: "New Certificates",
            value: "0",
            helper: "Unread certificate notifications",
            href: "/dashboard/client/certificates",
            section: "attention",
            icon: "award",
          },
          {
            key: "outstanding_payments",
            label: "Outstanding Payments",
            value: "0",
            helper: "Pending payment obligations linked to your resources",
            href: "/dashboard/client/payments",
            section: "attention",
            icon: "creditCard",
          },
          {
            key: "unread_notifications",
            label: "Notifications",
            value: String(unreadCount),
            helper: "Unread portal notifications assigned to you",
            href: "/dashboard/client/notifications",
            section: "attention",
            icon: "bell",
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
