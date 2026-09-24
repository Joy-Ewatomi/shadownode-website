type NotificationMetadata =
  | Record<string, unknown>
  | null
  | undefined

export type NotificationLike = {
  type?: string | null
  metadata?: NotificationMetadata
  case_id?: string | null
  bureau_notification?: boolean | null
  recipient_role?: string | null
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value)
  }

  return null
}

function isClientNotification(
  notification: NotificationLike,
  target: string | null,
) {
  const metadata =
    notification.metadata || {}
  const type =
    String(notification.type || "").toLowerCase()

  return (
    notification.recipient_role === "client" ||
    asString(metadata.audience)?.toLowerCase() === "client" ||
    asString(metadata.recipient_role)?.toLowerCase() === "client" ||
    String(target || "").startsWith("client_") ||
    [
      "quote_available",
      "quote_revised",
      "quote_ready",
      "request_declined",
      "payment_required",
      "payment_confirmed",
      "case_created",
      "case_status_changed",
      "case_on_hold",
      "case_resumed",
      "case_completed",
      "case_update",
      "new_case_message",
      "new_message",
      "report_available",
      "report_updated",
      "final_report_available",
      "training_enrollment_confirmed",
      "training_schedule_changed",
      "training_material_available",
      "training_assessment_available",
      "training_completed",
      "certificate_issued",
      "certificate_reissued",
    ].includes(type)
  )
}

function staffCasePath(caseId: string | null) {
  return caseId
    ? `/dashboard/cases/${caseId}`
    : "/dashboard/cases"
}

function clientCasePath(caseId: string | null) {
  return caseId
    ? `/dashboard/client/cases/${caseId}`
    : "/dashboard/client/cases"
}

function staffRequestPath(requestId: string | null) {
  return requestId
    ? `/dashboard/requests/${requestId}`
    : "/dashboard/requests"
}

function clientRequestPath(requestId: string | null) {
  return requestId
    ? `/dashboard/client/requests/${requestId}`
    : "/dashboard/client/requests"
}

function staffReportPath(
  caseId: string | null,
  reportId: string | null,
) {
  if (caseId) {
    return reportId
      ? `/dashboard/cases/${caseId}/reports?reportId=${encodeURIComponent(reportId)}`
      : `/dashboard/cases/${caseId}/reports`
  }

  return "/dashboard/reports"
}

export function getNotificationDestination(
  notification: NotificationLike,
): string | null {
  const metadata =
    notification.metadata || {}

  const type =
    String(notification.type || "").toLowerCase()

  const target =
    asString(metadata.target_page) ||
    asString(metadata.target)

  const requestId =
    asString(metadata.request_id) ||
    asString(metadata.requestId)

  const caseId =
    asString(metadata.case_id) ||
    asString(metadata.caseId) ||
    notification.case_id ||
    null

  const reportId =
    asString(metadata.report_id) ||
    asString(metadata.reportId)

  const trainingId =
    asString(metadata.training_engagement_id) ||
    asString(metadata.training_id) ||
    asString(metadata.trainingId)

  const explicitDestination =
    asString(metadata.destination) ||
    asString(metadata.destination_url) ||
    asString(metadata.destinationUrl)

  if (
    explicitDestination &&
    explicitDestination.startsWith("/")
  ) {
    return explicitDestination
  }

  const isClient =
    isClientNotification(notification, target)

  if (target) {
    switch (target) {
      case "client_request":
      case "client_request_review":
      case "client_quote_review":
      case "client_payment":
      case "payment_required":
        return clientRequestPath(requestId)

      case "client_case":
      case "client_case_timeline":
      case "client_case_messages":
      case "client_case_conversation":
      case "client_conversation":
      case "client_messages":
        return clientCasePath(caseId)

      case "staff_case_messages":
        return caseId
          ? `/dashboard/cases/${caseId}/messages`
          : "/dashboard/cases"

      case "client_reports":
      case "client_report":
        return reportId
          ? `/dashboard/client/reports/${reportId}`
          : "/dashboard/client/reports"

      case "client_training":
      case "client_training_engagement":
        return trainingId
          ? `/dashboard/training/${trainingId}`
          : "/dashboard/client/training"

      case "client_training_plan":
        return trainingId
          ? `/dashboard/training/${trainingId}/plan`
          : "/dashboard/client/training"

      case "client_training_materials":
        return trainingId
          ? `/dashboard/training/${trainingId}/materials`
          : "/dashboard/client/training"

      case "client_training_progress":
        return trainingId
          ? `/dashboard/training/${trainingId}/progress`
          : "/dashboard/client/training"

      case "client_training_schedule":
        return trainingId
          ? `/dashboard/training/${trainingId}/schedule`
          : "/dashboard/client/training"

      case "client_training_feedback":
        return trainingId
          ? `/dashboard/training/${trainingId}/feedback`
          : "/dashboard/client/training"

      case "client_training_certificate":
        return isClient
          ? "/dashboard/client/certificates"
          : trainingId
            ? `/dashboard/training/${trainingId}/certificates`
            : "/dashboard/training"

      case "admin_request_review":
      case "administrator_negotiation_review":
      case "quote_review":
        return staffRequestPath(requestId)

      case "super_admin_request_review":
      case "needs_super_admin_review":
      case "super_admin_quote_review":
        return requestId
          ? `/dashboard/super-administrator/requests/${requestId}`
          : "/dashboard/super-administrator/requests"

      case "case":
      case "staff_case":
        return isClient
          ? clientCasePath(caseId)
          : staffCasePath(caseId)

      case "case_assignment":
      case "case_team":
      case "assignment_approval":
        return caseId
          ? `/dashboard/cases/${caseId}/team`
          : "/dashboard/cases"

      case "training_assignment":
      case "staff_training_assignment":
        return trainingId
          ? `/dashboard/training/${trainingId}`
          : "/dashboard/training"

      case "report":
      case "report_review":
      case "staff_report_review":
        return staffReportPath(caseId, reportId)

      default:
        break
    }
  }

  if (
    type === "client_request" ||
    type === "new_request" ||
    type === "request_created" ||
    type === "request_updated" ||
    type === "quote_accepted" ||
    type === "quote_declined" ||
    type === "quote_rejected" ||
    type === "quote_negotiation_requested" ||
    type === "quote_review_requested"
  ) {
    return staffRequestPath(requestId)
  }

  if (
    type === "quote_pending_super_admin_review"
  ) {
    return requestId
      ? `/dashboard/super-administrator/requests/${requestId}`
      : "/dashboard/super-administrator/requests"
  }

  if (
    type === "quote_available" ||
    type === "quote_revised" ||
    type === "quote_ready" ||
    type === "request_declined" ||
    type === "request_approved" ||
    type === "request_under_review" ||
    type === "request_more_information_required" ||
    type === "negotiation_response_received"
  ) {
    return clientRequestPath(requestId)
  }

  if (
    type === "case_assignment" ||
    type === "case_assignment_approval" ||
    type === "case_assignment_approved" ||
    type === "case_assignment_rejected" ||
    type === "case_ready_for_assignment"
  ) {
    return caseId
      ? `/dashboard/cases/${caseId}/team`
      : "/dashboard/cases"
  }

  if (
    type === "staff_case_message"
  ) {
    return caseId
      ? `/dashboard/cases/${caseId}/messages`
      : "/dashboard/messages"
  }

  if (
    type === "new_case_message" ||
    type === "new_message" ||
    type === "case_completed" ||
    type === "case_update" ||
    type === "case_created" ||
    type === "case_status_changed" ||
    type === "case_on_hold" ||
    type === "case_resumed"
  ) {
    return isClient
      ? clientCasePath(caseId)
      : staffCasePath(caseId)
  }

  if (
    type === "report_pending_approval" ||
    type === "report_approved" ||
    type === "report_rejected" ||
    type === "report_returned"
  ) {
    return staffReportPath(caseId, reportId)
  }

  if (
    type === "report_available" ||
    type === "report_updated" ||
    type === "final_report_available"
  ) {
    return reportId
      ? `/dashboard/client/reports/${reportId}`
      : "/dashboard/client/reports"
  }

  if (
    type === "training_ready_for_assignment"
  ) {
    return trainingId
      ? `/dashboard/training/${trainingId}`
      : "/dashboard/training"
  }

  if (type.startsWith("training_")) {
    return trainingId
      ? `/dashboard/training/${trainingId}`
      : isClient
        ? "/dashboard/client/training"
        : "/dashboard/training"
  }

  if (
    type === "certificate_issued" ||
    type === "certificate_reissued"
  ) {
    if (isClient) {
      return "/dashboard/client/certificates"
    }

    return trainingId
      ? `/dashboard/training/${trainingId}/certificates`
      : "/dashboard/training"
  }

  if (type === "payment_required") {
    return clientRequestPath(requestId)
  }

  if (
    type === "payment_received" ||
    type === "payment_failed"
  ) {
    return isClient
      ? requestId
        ? `/dashboard/client/payments/${requestId}`
        : "/dashboard/client/payments"
      : staffCasePath(caseId)
  }

  return "/dashboard"
}
