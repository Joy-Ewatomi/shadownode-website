import { query } from "@/lib/db"
import { deliverExternalNotification } from "@/lib/services/notification-delivery-service"

/* =======================================================
   Types
   ======================================================= */

export type NotificationEvent = {
  caseId?: string | null
  type: string
  title: string
  message?: string
  metadata?: Record<string, unknown>
}

/* =======================================================
   Helpers
   ======================================================= */

function normalizeNotificationType(
  type: string,
): string {
  return String(type || "system")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_:-]/g, "_")
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

function destinationForResource(
  resourceType: string | null,
  resourceId: string | null,
  metadata: Record<string, unknown>,
  normalizedType?: string,
) {
  const explicit =
    asString(metadata.destination) ||
    asString(metadata.destination_url) ||
    asString(metadata.destinationUrl)

  if (explicit?.startsWith("/")) {
    return explicit
  }

  const targetPage =
    asString(metadata.target_page) ||
    asString(metadata.target)

  const audience =
    asString(metadata.audience) ||
    asString(metadata.recipient_role)

  const staffFacing =
    audience === "staff" ||
    audience === "administrator" ||
    audience === "super_administrator" ||
    [
      "client_request",
      "quote_negotiation_requested",
      "quote_accepted",
      "quote_declined",
      "quote_pending_super_admin_review",
      "case_ready_for_assignment",
      "training_ready_for_assignment",
      "case_assignment",
      "case_assignment_approval",
      "case_assignment_approved",
      "case_assignment_rejected",
      "staff_case_message",
      "report_pending_approval",
      "report_approved",
    ].includes(normalizedType || "")

  if (resourceType === "request" && resourceId) {
    if (
      targetPage === "super_admin_request_review" ||
      targetPage === "super_admin_quote_review"
    ) {
      return `/dashboard/super-administrator/requests/${resourceId}`
    }

    if (
      staffFacing ||
      targetPage === "admin_request_review" ||
      targetPage === "administrator_negotiation_review"
    ) {
      return `/dashboard/requests/${resourceId}`
    }

    return `/dashboard/client/requests/${resourceId}`
  }

  if (resourceType === "case" && resourceId) {
    if (
      staffFacing ||
      targetPage === "case_assignment" ||
      targetPage === "case_team"
    ) {
      return `/dashboard/cases/${resourceId}/team`
    }

    return `/dashboard/client/cases/${resourceId}`
  }

  if (resourceType === "report" && resourceId) {
    const caseId =
      asString(metadata.case_id) ||
      asString(metadata.caseId)

    if (staffFacing || targetPage === "report" || targetPage === "report_review") {
      return caseId
        ? `/dashboard/cases/${caseId}/reports?reportId=${encodeURIComponent(resourceId)}`
        : "/dashboard/reports"
    }

    return `/dashboard/client/reports/${resourceId}`
  }

  if (resourceType === "training" && resourceId) {
    if (
      staffFacing ||
      targetPage === "training_assignment" ||
      targetPage === "staff_training_assignment"
    ) {
      return `/dashboard/training/${resourceId}`
    }

    if (targetPage === "client_training_materials") {
      return `/dashboard/training/${resourceId}/materials`
    }

    if (targetPage === "client_training_schedule") {
      return `/dashboard/training/${resourceId}/schedule`
    }

    if (targetPage === "client_training_certificate") {
      return staffFacing
        ? `/dashboard/training/${resourceId}/certificates`
        : "/dashboard/client/certificates"
    }

    return `/dashboard/training/${resourceId}`
  }

  if (resourceType === "certificate") {
    const trainingId =
      asString(metadata.training_engagement_id) ||
      asString(metadata.training_id)

    if (trainingId) {
      return staffFacing
        ? `/dashboard/training/${trainingId}/certificates`
        : "/dashboard/client/certificates"
    }
  }

  return null
}

function normalizeResourceMetadata(
  event: NotificationEvent,
  normalizedType: string,
) {
  const metadata = {
    ...(event.metadata || {}),
  }

  const requestId =
    asString(metadata.request_id) ||
    asString(metadata.requestId)
  const reportId =
    asString(metadata.report_id) ||
    asString(metadata.reportId)
  const conversationId =
    asString(metadata.conversation_id) ||
    asString(metadata.conversationId)
  const trainingId =
    asString(metadata.training_engagement_id) ||
    asString(metadata.training_id) ||
    asString(metadata.trainingId)
  const certificateId =
    asString(metadata.certificate_id) ||
    asString(metadata.certificateId)
  const paymentId =
    asString(metadata.payment_id) ||
    asString(metadata.paymentId)
  const caseId =
    event.caseId ||
    asString(metadata.case_id) ||
    asString(metadata.caseId)

  let resourceType =
    asString(metadata.resource_type) ||
    asString(metadata.resourceType)
  let resourceId =
    asString(metadata.resource_id) ||
    asString(metadata.resourceId)

  if (!resourceType || !resourceId) {
    if (
      requestId &&
      (normalizedType.startsWith("request_") ||
        normalizedType.startsWith("quote_") ||
        normalizedType.startsWith("negotiation_") ||
        normalizedType === "payment_required")
    ) {
      resourceType = "request"
      resourceId = requestId
    } else if (
      conversationId &&
      (normalizedType.includes("message") ||
        normalizedType === "new_case_message")
    ) {
      resourceType = "conversation"
      resourceId = conversationId
    } else if (reportId || normalizedType.startsWith("report_")) {
      resourceType = "report"
      resourceId = reportId
    } else if (
      certificateId ||
      normalizedType.startsWith("certificate_")
    ) {
      resourceType = "certificate"
      resourceId = certificateId || trainingId
    } else if (trainingId || normalizedType.startsWith("training_")) {
      resourceType = "training"
      resourceId = trainingId
    } else if (
      caseId ||
      normalizedType.startsWith("case_") ||
      normalizedType === "staff_case_message"
    ) {
      resourceType = "case"
      resourceId = caseId
    } else if (paymentId && normalizedType.startsWith("payment_")) {
      resourceType = "payment"
      resourceId = paymentId
    }
  }

  if (resourceType && resourceId) {
    metadata.resource_type = resourceType
    metadata.resource_id = resourceId
  }

  if (caseId) {
    metadata.case_id = caseId
  }

  const targetPage =
    asString(metadata.target_page) ||
    asString(metadata.target)
  const clientFacingType =
    [
      "request_under_review",
      "request_more_information_required",
      "request_approved",
      "request_declined",
      "quote_available",
      "quote_revised",
      "negotiation_response_received",
      "payment_required",
      "payment_confirmed",
      "case_created",
      "case_status_changed",
      "case_on_hold",
      "case_resumed",
      "case_completed",
      "additional_evidence_requested",
      "evidence_requires_attention",
      "new_case_message",
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
      "client_request",
      "quote_negotiation_requested",
      "quote_accepted",
      "quote_declined",
      "quote_pending_super_admin_review",
      "case_ready_for_assignment",
      "training_ready_for_assignment",
      "case_assignment",
      "case_assignment_approval",
      "case_assignment_approved",
      "case_assignment_rejected",
      "staff_case_message",
      "report_pending_approval",
      "report_approved",
    ].includes(normalizedType)

  const shouldSetDestination =
    clientFacingType ||
    String(targetPage || "").startsWith("client_") ||
    [
      "admin_request_review",
      "administrator_negotiation_review",
      "super_admin_request_review",
      "super_admin_quote_review",
      "case_assignment",
      "case_team",
      "training_assignment",
      "staff_training_assignment",
      "report",
      "report_review",
    ].includes(String(targetPage || "")) ||
    (normalizedType === "payment_confirmed" && targetPage === "case")

  const destination = shouldSetDestination
    ? destinationForResource(
        resourceType || null,
        resourceId || null,
        metadata,
        normalizedType,
      )
    : null

  if (destination) {
    metadata.destination = destination
  }

  return metadata
}

/* =======================================================
   Generic User Notification
   ======================================================= */

export async function notifyUser(
  userId: string | null | undefined,
  event: NotificationEvent,
) {
  if (!userId) {
    return
  }

  const normalizedType =
    normalizeNotificationType(event.type)
  const normalizedMetadata =
    normalizeResourceMetadata(
      event,
      normalizedType,
    )

  const inserted = await query<{
    id: string
    user_id: string
    case_id: string | null
    type: string
    title: string
    message: string | null
    metadata: Record<string, unknown> | null
  }>(
    `
      INSERT INTO notifications (
        user_id,
        case_id,
        type,
        title,
        message,
        metadata,
        is_read
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
      $6::jsonb,
        false
      )
      RETURNING
        id,
        user_id,
        case_id,
        type,
        title,
        message,
        metadata
    `,
    [
      userId,
      event.caseId || null,
      normalizedType,
      event.title,
      event.message || null,
      JSON.stringify(normalizedMetadata),
    ],
  ).catch((err) => {
    console.error(
      "NOTIFICATION INSERT ERROR:",
      err,
    )
    return null
  })

  const notification =
    inserted?.rows[0]

  if (notification) {
    await deliverExternalNotification({
      ...notification,
      metadata:
        notification.metadata || {},
    }).catch((err) => {
      console.error(
        "NOTIFICATION EXTERNAL DELIVERY ERROR:",
        err instanceof Error
          ? err.message
          : err,
      )
    })
  }
}

/* =======================================================
   Training Notification Destination
   ======================================================= */

function getTrainingNotificationTarget(
  updateType: string,
): string {
  const type =
    String(updateType || "")
      .toLowerCase()

  if (
    type.includes("module")
  ) {
    return "client_training_plan"
  }

  if (
    type.includes("material")
  ) {
    return "client_training_materials"
  }

  if (
    type.includes("progress")
  ) {
    return "client_training_progress"
  }

  if (
    type.includes("session")
  ) {
    return "client_training_schedule"
  }

  if (
    type.includes("feedback")
  ) {
    return "client_training_feedback"
  }

  if (
    type.includes("certificate")
  ) {
    return "client_training_certificate"
  }

  if (
    type.includes("trainer")
  ) {
    return "client_training"
  }

  if (
    type.includes("completion")
  ) {
    return "client_training"
  }

  if (
    type.includes("status")
  ) {
    return "client_training"
  }

  return "client_training"
}

function getTrainingNotificationType(
  updateType: string,
): string {
  const type = String(updateType || "").toLowerCase()

  if (type.includes("certificate")) {
    return "certificate_issued"
  }

  if (type.includes("material")) {
    return "training_material_available"
  }

  if (type.includes("session") || type.includes("schedule")) {
    return "training_schedule_changed"
  }

  if (type.includes("assessment")) {
    return "training_assessment_available"
  }

  if (type.includes("completion") || type.includes("completed")) {
    return "training_completed"
  }

  if (type.includes("enrollment") || type.includes("trainer")) {
    return "training_enrollment_confirmed"
  }

  return "training_enrollment_confirmed"
}

/* =======================================================
   Training Client Notification
   ======================================================= */

export async function notifyTrainingClient(
  trainingEngagementId: string | null | undefined,
  event: {
    type: string
    title: string
    message?: string
    metadata?: Record<string, unknown>
  },
) {
  if (!trainingEngagementId) {
    return
  }

  try {
    const result =
      await query<{
        user_id: string | null
        request_id: string | null
      }>(
        `
          SELECT
            au.id AS user_id,
            te.request_id
          FROM training_engagements te
          JOIN user_profiles up
            ON up.id = te.client_profile_id
          JOIN app_users au
            ON au.id = up.user_id
          WHERE te.id = $1
          LIMIT 1
        `,
        [trainingEngagementId],
      )

    const clientUserId =
      result.rows[0]?.user_id || null

    if (!clientUserId) {
      return
    }

    const targetPage =
      getTrainingNotificationTarget(
        event.type,
      )

    await notifyUser(
      clientUserId,
      {
        type:
          getTrainingNotificationType(
            event.type,
          ),
        title: event.title,
        message:
          event.message ||
          "There is a new update on your training engagement.",
        metadata: {
            ...(event.metadata || {}),
            training_engagement_id:
              trainingEngagementId,
            request_id:
              result.rows[0]?.request_id || null,
            resource_type:
            getTrainingNotificationType(event.type) ===
            "certificate_issued"
              ? "certificate"
              : "training",
          resource_id:
            trainingEngagementId,
          target_page: targetPage,
          notification_source:
            "training_updates",
        },
      },
    )
  } catch (err) {
    console.error(
      "TRAINING CLIENT NOTIFICATION ERROR:",
      err,
    )
  }
}

/* =======================================================
   Administrator Notifications
   ======================================================= */

export async function notifyAdmins(
  event: NotificationEvent,
) {
  try {
    const users =
      await query<{ id: string }>(
        `
          SELECT id
          FROM app_users
          WHERE role = 'administrator'
            AND status = 'active'
        `,
      )

    await Promise.all(
      users.rows.map((user) =>
        notifyUser(
          user.id,
          event,
        ),
      ),
    )
  } catch (err) {
    console.error(
      "ADMIN NOTIFICATION ERROR:",
      err,
    )
  }
}

/* =======================================================
   Super Administrator Notifications
   ======================================================= */

export async function notifySuperAdmins(
  event: NotificationEvent,
) {
  try {
    const users =
      await query<{ id: string }>(
        `
          SELECT id
          FROM app_users
          WHERE role IN (
            'super_administrator',
            'super-administrator'
          )
          AND status = 'active'
        `,
      )

    await Promise.all(
      users.rows.map((user) =>
        notifyUser(
          user.id,
          event,
        ),
      ),
    )
  } catch (err) {
    console.error(
      "SUPER ADMIN NOTIFICATION ERROR:",
      err,
    )
  }
}
