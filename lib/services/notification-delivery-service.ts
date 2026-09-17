import { sendEmail } from "@/lib/email"
import { query } from "@/lib/db"

type DeliveryPreference =
  | "email"
  | "whatsapp"
  | "portal"

type DeliverySensitivity =
  | "detailed"
  | "brief"
  | "secure_email"

type PortalNotification = {
  id: string
  user_id: string
  case_id: string | null
  type: string
  title: string
  message: string | null
  metadata: Record<string, unknown>
}

type RecipientDeliveryContext = {
  user_id: string
  email: string | null
  email_verified_at: string | null
  communication_method: string | null
  communication_email: string | null
  communication_whatsapp: string | null
}

const EXTERNALLY_DELIVERABLE_TYPES = new Set([
  "request_received",
  "request_submitted",
  "request_under_review",
  "request_more_information_required",
  "request_approved",
  "request_declined",
  "quote_available",
  "quote_revised",
  "quote_approved",
  "quote_accepted",
  "negotiation_response_received",
  "payment_required",
  "payment_confirmed",
  "case_created",
  "case_status_changed",
  "case_on_hold",
  "case_resumed",
  "case_completed",
  "new_case_message",
  "report_available",
  "report_delivered",
  "final_report_available",
  "training_enrollment_confirmed",
  "training_schedule_changed",
  "training_material_available",
  "training_assessment_available",
  "training_completed",
  "certificate_issued",
])

const STAFF_ONLY_AUDIENCES = new Set([
  "staff",
  "administrator",
  "super_administrator",
  "super-administrator",
  "investigator",
  "analyst",
])

function asString(value: unknown) {
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function normalizePreference(
  value: string | null | undefined,
): DeliveryPreference {
  const text = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")

  if (
    text === "email" ||
    text === "email_updates" ||
    text === "email_notification"
  ) {
    return "email"
  }

  if (
    text === "whatsapp" ||
    text === "whats_app" ||
    text === "whatsapp_updates"
  ) {
    return "whatsapp"
  }

  if (
    text === "portal" ||
    text === "portal_notification" ||
    text === "portal_only"
  ) {
    return "portal"
  }

  return "portal"
}

function safeUuid(value: string | null) {
  if (
    value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return value
  }

  return null
}

function resourceValue(
  metadata: Record<string, unknown>,
  key: string,
) {
  return (
    asString(metadata[key]) ||
    asString(
      metadata[
        key.replace(/_([a-z])/g, (_, letter) =>
          String(letter).toUpperCase(),
        )
      ],
    )
  )
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).replace(/\/$/, "")
}

function absolutePortalUrl(
  destination: string | null,
) {
  const base = appBaseUrl()
  if (!base || !destination) return null
  if (/^https?:\/\//i.test(destination)) {
    return destination
  }
  return `${base}${destination.startsWith("/") ? "" : "/"}${destination}`
}

function normalizeEventType(type: string) {
  return String(type || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
}

function isExternallyDeliverable(
  notification: PortalNotification,
) {
  const metadata = notification.metadata || {}
  const type = normalizeEventType(notification.type)
  const audience =
    asString(metadata.audience) ||
    asString(metadata.recipient_role)

  if (
    audience &&
    STAFF_ONLY_AUDIENCES.has(
      audience.toLowerCase(),
    )
  ) {
    return false
  }

  if (
    type === "staff_case_message" ||
    type.includes("assignment") ||
    type.includes("approval") ||
    type.includes("audit") ||
    type.includes("oversight") ||
    type.includes("admin")
  ) {
    return false
  }

  return EXTERNALLY_DELIVERABLE_TYPES.has(type)
}

function sensitivityForNotification(
  notification: PortalNotification,
): DeliverySensitivity {
  const metadata = notification.metadata || {}
  const classification =
    String(
      metadata.classification ||
        metadata.confidentiality_level ||
        "",
    ).toLowerCase()
  const type = notification.type.toLowerCase()

  if (
    [
      "email_verification",
      "password_reset",
      "security_alert",
      "employee_invitation",
      "mandatory_account_notice",
    ].includes(type)
  ) {
    return "secure_email"
  }

  if (
    classification === "confidential" ||
    classification === "restricted" ||
    type.includes("message") ||
    type.includes("evidence") ||
    type.includes("finding") ||
    type.includes("internal") ||
    type.includes("review")
  ) {
    return "brief"
  }

  if (
    type.includes("request") ||
    type.includes("quote") ||
    type.includes("payment") ||
    type.includes("case") ||
    type.includes("report") ||
    type.includes("training") ||
    type.includes("certificate")
  ) {
    return "detailed"
  }

  return "brief"
}

function normalizeEmail(value: string | null) {
  const email = value?.trim().toLowerCase() || null
  if (
    email &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return email
  }

  return null
}

function normalizeWhatsAppNumber(value: string | null) {
  const compact =
    value?.replace(/[^\d+]/g, "") || ""
  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact
  }

  return null
}

function briefText(type: string) {
  if (type.includes("quote")) {
    return "A quote update is available in your ShadowNode portal."
  }
  if (type.includes("message")) {
    return "You have a new secure case message in your ShadowNode portal."
  }
  if (type.includes("report")) {
    return "A report update is available in your ShadowNode portal."
  }
  if (type.includes("payment")) {
    return "A payment update is available in your ShadowNode portal."
  }
  if (type.includes("certificate")) {
    return "A certificate update is available in your ShadowNode portal."
  }
  return "A ShadowNode portal update is available."
}

function emailTemplate(
  notification: PortalNotification,
  sensitivity: DeliverySensitivity,
  portalUrl: string | null,
) {
  const safeTitle = escapeHtml(notification.title)
  const intro =
    sensitivity === "detailed"
      ? escapeHtml(
          notification.message ||
            "There is a new update in your ShadowNode portal.",
        )
      : escapeHtml(briefText(notification.type))
  const button = portalUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtml(portalUrl)}" style="background:#20dc73;color:#06110f;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700">Open secure portal</a></p>`
    : ""

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#047857">ShadowNode Intelligence Bureau</p>
      <h1 style="font-size:20px;margin:0 0 12px">${safeTitle}</h1>
      <p>${intro}</p>
      ${button}
      <p style="font-size:13px;color:#475569">Sensitive case information is only available after signing in to the secure portal.</p>
    </div>
  `

  const text = `${notification.title}\n\n${sensitivity === "detailed" ? notification.message || briefText(notification.type) : briefText(notification.type)}\n\n${portalUrl || "Sign in to your ShadowNode portal."}\n\nSensitive case information is only available after signing in to the secure portal.`

  return {
    subject:
      sensitivity === "detailed"
        ? notification.title
        : "ShadowNode portal update",
    html,
    text,
  }
}

function whatsappText(
  notification: PortalNotification,
  sensitivity: DeliverySensitivity,
  portalUrl: string | null,
) {
  const body =
    sensitivity === "detailed"
      ? notification.message ||
        "A ShadowNode update is available."
      : briefText(notification.type)

  return [
    `ShadowNode: ${notification.title}`,
    body,
    portalUrl
      ? `Open secure portal: ${portalUrl}`
      : "Sign in to your ShadowNode portal.",
    "Sensitive case information is only available after sign-in.",
  ]
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
}

async function recipientContext(
  notification: PortalNotification,
) {
  const metadata = notification.metadata || {}
  const requestId =
    safeUuid(resourceValue(metadata, "request_id")) ||
    (resourceValue(metadata, "resource_type") === "request"
      ? safeUuid(resourceValue(metadata, "resource_id"))
      : null)
  const trainingEngagementId =
    safeUuid(
      resourceValue(
        metadata,
        "training_engagement_id",
      ),
    ) ||
    (resourceValue(metadata, "resource_type") ===
    "training"
      ? safeUuid(resourceValue(metadata, "resource_id"))
      : null)

  const result =
    await query<RecipientDeliveryContext>(
      `
        SELECT
          au.id AS user_id,
          au.email,
          au.email_verified_at,
          r.communication_method,
          r.communication_email,
          r.communication_whatsapp
        FROM app_users au
        LEFT JOIN user_profiles up
          ON up.user_id = au.id
        LEFT JOIN cases c
          ON c.client_profile_id = up.id
          AND c.id = $2
        LEFT JOIN training_engagements te
          ON te.client_profile_id = up.id
          AND te.id = $4
        LEFT JOIN requests r
          ON r.id = COALESCE($3::uuid, c.request_id, te.request_id)
        WHERE au.id = $1
        LIMIT 1
      `,
      [
        notification.user_id,
        notification.case_id,
        requestId,
        trainingEngagementId,
      ],
    )

  return result.rows[0] || null
}

async function createAttempt(input: {
  notification: PortalNotification
  channel: "email" | "whatsapp"
  destination: string | null
  status?: "pending" | "sent" | "delivered" | "failed" | "skipped"
  provider?: string | null
  preference: DeliveryPreference
  sensitivity: DeliverySensitivity
  errorCode?: string | null
  errorMessage?: string | null
  fallbackOf?: string | null
}) {
  const metadata = input.notification.metadata || {}
  const resourceType =
    resourceValue(metadata, "resource_type")
  const resourceId =
    resourceValue(metadata, "resource_id")
  const idempotencyKey = [
    input.notification.id,
    input.channel,
  ].join(":")

  try {
    const inserted = await query<{ id: string }>(
      `
        INSERT INTO notification_delivery_attempts (
          notification_id,
          user_id,
          event_type,
          resource_type,
          resource_id,
          channel,
          destination,
          status,
          provider,
          preference,
          sensitivity,
          fallback_of,
          error_code,
          error_message,
          idempotency_key,
          metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)
        ON CONFLICT (
          notification_id,
          channel
        )
        DO NOTHING
        RETURNING id
      `,
      [
        input.notification.id,
        input.notification.user_id,
        input.notification.type,
        resourceType,
        resourceId,
        input.channel,
        input.destination,
        input.status || "pending",
        input.provider || null,
        input.preference,
        input.sensitivity,
        input.fallbackOf || null,
        input.errorCode || null,
        input.errorMessage || null,
        idempotencyKey,
        JSON.stringify({
          portal_destination:
            resourceValue(metadata, "destination"),
        }),
      ],
    )

    return inserted.rows[0]?.id || null
  } catch (error) {
    console.error(
      "NOTIFICATION DELIVERY ATTEMPT ERROR:",
      error instanceof Error
        ? error.message
        : error,
    )
    return null
  }
}

async function markAttempt(
  id: string | null,
  status: "sent" | "delivered" | "failed" | "skipped",
  errorMessage?: string,
) {
  if (!id) return

  await query(
    `
      UPDATE notification_delivery_attempts
      SET
        status = $2,
        error_message = $3,
        delivered_at = CASE WHEN $2 IN ('sent', 'delivered') THEN now() ELSE delivered_at END
      WHERE id = $1
    `,
    [
      id,
      status,
      errorMessage || null,
    ],
  ).catch((error) => {
    console.error(
      "NOTIFICATION DELIVERY STATUS ERROR:",
      error instanceof Error
        ? error.message
        : error,
    )
  })
}

function whatsappConfigured() {
  return Boolean(
    process.env.WHATSAPP_PROVIDER_APPROVED ===
      "true" &&
      process.env.WHATSAPP_API_URL &&
      process.env.WHATSAPP_API_TOKEN,
  )
}

async function sendWhatsApp(input: {
  to: string
  message: string
}) {
  if (!whatsappConfigured()) {
    return {
      ok: false,
      skipped: true,
      error: "WhatsApp provider is not configured or approved.",
    }
  }

  const response = await fetch(
    String(process.env.WHATSAPP_API_URL),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: input.to,
        message: input.message,
      }),
    },
  )

  if (!response.ok) {
    return {
      ok: false,
      skipped: false,
      error: `WhatsApp provider returned ${response.status}`,
    }
  }

  return { ok: true, skipped: false }
}

async function deliverEmail(input: {
  notification: PortalNotification
  context: RecipientDeliveryContext
  preference: DeliveryPreference
  sensitivity: DeliverySensitivity
  forceBrief?: boolean
  fallbackOf?: string | null
}) {
  const destination =
    normalizeEmail(
      input.context.communication_email ||
        input.context.email,
    )

  if (
    !destination ||
    !input.context.email_verified_at
  ) {
    await createAttempt({
      notification: input.notification,
      channel: "email",
      destination,
      status: "skipped",
      provider: "resend",
      preference: input.preference,
      sensitivity: input.sensitivity,
      errorCode: "email_unverified_or_missing",
      errorMessage:
        "Recipient email is missing or unverified.",
      fallbackOf: input.fallbackOf,
    })
    return
  }

  const portalUrl = absolutePortalUrl(
    asString(
      input.notification.metadata?.destination,
    ),
  )
  const sensitivity = input.forceBrief
    ? "brief"
    : input.sensitivity
  const template = emailTemplate(
    input.notification,
    sensitivity,
    portalUrl,
  )
  const attemptId = await createAttempt({
    notification: input.notification,
    channel: "email",
    destination,
    provider: "resend",
    preference: input.preference,
    sensitivity,
    fallbackOf: input.fallbackOf,
  })

  if (!attemptId) return

  try {
    const sent = await sendEmail({
      to: destination,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    await markAttempt(
      attemptId,
      sent ? "sent" : "skipped",
      sent ? undefined : "Email provider is not configured.",
    )
  } catch (error) {
    await markAttempt(
      attemptId,
      "failed",
      error instanceof Error
        ? error.message
        : "Email delivery failed.",
    )
  }
}

async function deliverWhatsApp(input: {
  notification: PortalNotification
  context: RecipientDeliveryContext
  preference: DeliveryPreference
  sensitivity: DeliverySensitivity
}) {
  const destination = normalizeWhatsAppNumber(
    input.context.communication_whatsapp,
  )

  const attemptId = await createAttempt({
    notification: input.notification,
    channel: "whatsapp",
    destination,
    provider: "configured_whatsapp_provider",
    preference: input.preference,
    sensitivity: input.sensitivity,
    status: destination ? "pending" : "skipped",
    errorCode: destination
      ? null
      : "whatsapp_missing_or_invalid",
    errorMessage: destination
      ? null
      : "Recipient WhatsApp number is missing or invalid.",
  })

  if (!destination) {
    await deliverEmail({
      notification: input.notification,
      context: input.context,
      preference: input.preference,
      sensitivity: "brief",
      forceBrief: true,
      fallbackOf: attemptId,
    })
    return
  }

  const portalUrl = absolutePortalUrl(
    asString(
      input.notification.metadata?.destination,
    ),
  )

  const result = await sendWhatsApp({
    to: destination,
    message: whatsappText(
      input.notification,
      input.sensitivity,
      portalUrl,
    ),
  })

  if (result.ok) {
    await markAttempt(attemptId, "sent")
    return
  }

  await markAttempt(
    attemptId,
    result.skipped ? "skipped" : "failed",
    result.error,
  )

  await deliverEmail({
    notification: input.notification,
    context: input.context,
    preference: input.preference,
    sensitivity: "brief",
    forceBrief: true,
    fallbackOf: attemptId,
  })
}

export async function deliverExternalNotification(
  notification: PortalNotification,
) {
  if (!isExternallyDeliverable(notification)) {
    return
  }

  const sensitivity =
    sensitivityForNotification(notification)

  const context =
    await recipientContext(notification).catch(
      (error) => {
        console.error(
          "NOTIFICATION RECIPIENT CONTEXT ERROR:",
          error,
        )
        return null
      },
    )

  if (!context) return

  const preference = normalizePreference(
    context.communication_method,
  )

  if (
    sensitivity === "secure_email" ||
    preference === "email"
  ) {
    await deliverEmail({
      notification,
      context,
      preference,
      sensitivity,
    })
    return
  }

  if (preference === "whatsapp") {
    await deliverWhatsApp({
      notification,
      context,
      preference,
      sensitivity,
    })
    return
  }

  await deliverEmail({
    notification,
    context,
    preference,
    sensitivity: "brief",
    forceBrief: true,
  })
}

export async function deliverExternalNotificationsForIds(
  notificationIds: string[],
) {
  if (notificationIds.length === 0) return

  const result = await query<{
    id: string
    user_id: string
    case_id: string | null
    type: string
    title: string
    message: string | null
    metadata: Record<string, unknown> | null
  }>(
    `
      SELECT
        id,
        user_id,
        case_id,
        type,
        title,
        message,
        metadata
      FROM notifications
      WHERE id = ANY($1::uuid[])
    `,
    [notificationIds],
  )

  await Promise.all(
    result.rows.map((row) =>
      deliverExternalNotification({
        ...row,
        metadata: row.metadata || {},
      }),
    ),
  )
}
