import { query } from "@/lib/db"

// lib/services/notification-service.ts

export async function notifyUser(
  userId: string | null | undefined,
  event: {
    caseId?: string | null
    type: string
    title: string
    message?: string
    metadata?: Record<string, unknown>
  }
) {
  if (!userId) return

  const normalizedType = String(event.type || "system").toLowerCase().replace(/\s+/g, "_")

  await query(
    `
    INSERT INTO notifications
    (
      user_id,
      case_id,
      type,
      title,
      message,
      metadata,
      is_read
    )
    VALUES ($1,$2,$3,$4,$5,$6,false)
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
    console.error("NOTIFICATION INSERT ERROR", err)
  })
}

export async function notifyAdmins(event: {
  type: string
  title: string
  message?: string
  metadata?: Record<string, unknown>
}) {

  await query<{ id: string }>(
    `
    SELECT id
    FROM app_users
    WHERE role='administrator'
    AND status='active'
    `
  )
  .then(async (users) => {

    await Promise.all(
      users.rows.map((user) =>
        notifyUser(user.id, event)
      )
    )

  })
  .catch((err) => {
    console.error(
      "ADMIN NOTIFICATION ERROR",
      err
    )
  })

}




export async function notifySuperAdmins(event: {
  type: string
  title: string
  message?: string
  metadata?: Record<string, unknown>
}) {

  await query<{ id: string }>(
    `
    SELECT id
    FROM app_users
    WHERE role='super_administrator'
    AND status='active'
    `
  )
  .then(async (users) => {

    await Promise.all(
      users.rows.map((user) =>
        notifyUser(user.id, event)
      )
    )

  })
  .catch((err) => {
    console.error(
      "SUPER ADMIN NOTIFICATION ERROR",
      err
    )
  })

}