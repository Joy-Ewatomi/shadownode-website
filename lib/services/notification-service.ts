import { query } from "@/lib/db"

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

  await query(
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
        $6,
        false
      )
    `,
    [
      userId,
      event.caseId || null,
      normalizedType,
      event.title,
      event.message || null,
      JSON.stringify(event.metadata || {}),
    ],
  ).catch((err) => {
    console.error(
      "NOTIFICATION INSERT ERROR:",
      err,
    )
  })
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
      }>(
        `
          SELECT
            au.id AS user_id
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
        type: event.type,
        title: event.title,
        message:
          event.message ||
          "There is a new update on your training engagement.",
        metadata: {
          ...(event.metadata || {}),
          training_engagement_id:
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