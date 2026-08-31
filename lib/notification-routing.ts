type NotificationMetadata = Record<string, unknown> | null | undefined

export type NotificationLike = {
  type?: string | null
  metadata?: NotificationMetadata
  case_id?: string | null
  bureau_notification?: boolean | null
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value)
  }

  return null
}


export function getNotificationDestination(
  notification: NotificationLike
): string | null {

  const metadata = notification.metadata || {}

  const requestId =
    asString(
      (metadata as Record<string, unknown>).request_id
    ) ||
    asString(
      (metadata as Record<string, unknown>).requestId
    )


  const caseId =
    asString(
      (metadata as Record<string, unknown>).case_id
    ) ||
    asString(
      (metadata as Record<string, unknown>).caseId
    )


  const target =
    asString(
      (metadata as Record<string, unknown>).target_page
    ) ||
    asString(
      (metadata as Record<string, unknown>).target
    )


  const type =
    (notification.type || "").toLowerCase()



  if (target) {

    switch (target) {

case "client_request":
case "client_request_review":
case "client_quote_review":
  return requestId
    ? `/dashboard/client/requests/${requestId}`
    : "/dashboard/client/requests"


      case "payment":
case "client_payment":
case "payment_required":
  return requestId
    ? `/dashboard/client/requests/${requestId}`
    : "/dashboard/client/requests"



      case "client_case_timeline":

      case "client_case_messages":

        return caseId
          ? `/dashboard/client/cases/${caseId}`
          : "/dashboard/client/cases"



      case "admin_request_review":

case "quote_review":

    return requestId
      ? `/dashboard/requests/${requestId}`
      : "/dashboard/requests"



case "super_admin_request_review":
case "needs_super_admin_review":
case "super_admin_quote_review":

  return requestId
    ? `/dashboard/super-administrator/requests/${requestId}`
    : "/dashboard/super-administrator/requests"
      default:
        break
    }

  }



if (type === "payment_required") {
  return requestId
    ? `/dashboard/client/requests/${requestId}`
    : "/dashboard/client/requests"
}


if (
  type === "payment_received" ||
  type === "payment_failed"
) {

  return caseId
    ? `/dashboard/client/payments/${caseId}`
    : requestId
      ? `/dashboard/client/requests/${requestId}`
      : "/dashboard/client/payments"

}



  if (
    type === "request_created" ||
    type === "negotiation_requested" ||
    type === "request_updated"
  ) {

    return requestId
      ? `/dashboard/requests/${requestId}`
      : "/dashboard/requests"

  }



  if (
    type === "quote_ready" ||
    type === "quote_adjusted" ||
    type === "quote_review"
  ) {

    return requestId
      ? `/dashboard/client/requests/${requestId}`
      : "/dashboard/client/requests"

  }



  if (
    type === "case_completed" ||
    type === "case_update" ||
    type === "case_assignment" ||
    type === "new_message"
  ) {

    return caseId
      ? `/dashboard/cases/${caseId}`
      : "/dashboard/cases"

  }



  return "/dashboard"

}