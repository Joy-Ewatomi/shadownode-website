"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getNotificationDestination } from "@/lib/notification-routing"

type Notification = {
  id: string
  title: string
  message: string | null
  type: string
  read: boolean
  created_at: string
  case_id: string | null
  metadata: Record<string, unknown> | null
  recipient_id?: string | null
  recipient_name?: string | null
  recipient_email?: string | null
  recipient_role?: string | null
}

type User = {
  id?: string
  role: string
}

function formatNotificationType(
  type: string | null | undefined,
) {
  return (type || "system")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatRole(
  value: string | null | undefined,
) {
  if (!value) return "Unknown"

  return value
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ")
}

function getCaseNumber(
  notification: Notification,
) {
  const metadata =
    notification.metadata || {}

  const candidates = [
    metadata.case_number,
    metadata.caseNumber,
    metadata.case_id,
    metadata.caseId,
    notification.case_id,
  ]

  const found = candidates.find(
    (value) =>
      typeof value === "string" &&
      value.trim(),
  )

  return found ? String(found) : "—"
}

export default function Page() {
  const [user, setUser] =
    useState<User | null>(null)

  const [notifications, setNotifications] =
    useState<Notification[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")

  /**
   * ---------------------------------------------------------
   * LOAD CURRENT USER
   * ---------------------------------------------------------
   */

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch(
          "/api/auth/me",
          {
            credentials: "include",
            cache: "no-store",
          },
        )

        if (!response.ok) return

        const data =
          await response.json()

        setUser(data.user)
      } catch (error) {
        console.error(
          "USER LOAD ERROR",
          error,
        )
      }
    }

    void loadUser()
  }, [])

  /**
   * ---------------------------------------------------------
   * LOAD NOTIFICATIONS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    async function loadNotifications() {
      try {
        setLoading(true)
        setError("")

        const response = await fetch(
          "/api/notifications",
          {
            credentials: "include",
            cache: "no-store",
          },
        )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load notifications",
          )
        }

        setNotifications(
          Array.isArray(data)
            ? data
            : [],
        )
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load notifications",
        )
      } finally {
        setLoading(false)
      }
    }

    void loadNotifications()
  }, [])

  const isSuperAdministrator =
    user?.role ===
      "super_administrator" ||
    user?.role ===
      "super-administrator"

async function openNotification(
  notification: Notification,
) {
  if (notification.read) {
    return true
  }

  try {
    const response = await fetch(
      `/api/notifications/${notification.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      console.error(
        "FAILED TO MARK NOTIFICATION AS READ",
        await response.text(),
      )

      return false
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              read: true,
            }
          : item,
      ),
    )

    return true
  } catch (error) {
    console.error(
      "FAILED TO MARK NOTIFICATION AS READ",
      error,
    )

    return false
  }
}

const router = useRouter()

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Bureau Communications
            </p>

            <h1 className="mt-2 text-2xl font-semibold text-white">
              Notifications
            </h1>

            <p className="mt-2 text-sm text-white/50">
              Operational notifications across the
              bureau network.
            </p>
          </div>

          {/* =================================================
              ACCESS LEVEL
          ================================================= */}

          <div className="rounded-md border border-[#20dc73]/30 bg-[#06110f] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#20dc73]">
              Access Level
            </p>

            <p className="mt-1 text-sm font-semibold text-white">
              View Only
            </p>

            <p className="mt-1 text-xs text-white/40">
              You can open notifications assigned
              to your account. Other bureau
              notifications are read-only.
            </p>
          </div>
        </div>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* =====================================================
            LOADING
        ===================================================== */}

        {loading && (
          <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6 text-sm text-white/50">
            Loading notifications...
          </div>
        )}

        {/* =====================================================
            EMPTY
        ===================================================== */}

        {!loading &&
          !error &&
          notifications.length === 0 && (
            <div className="rounded-md border border-[#143b28] bg-[#06110f] p-8 text-center">
              <p className="text-sm text-white/50">
                No notifications available.
              </p>
            </div>
          )}

        {/* =====================================================
            NOTIFICATIONS
        ===================================================== */}

        {!loading &&
          notifications.length > 0 && (
            <div className="space-y-3">

              {notifications.map(
                (notification) => {

                  /**
                   * For normal users, the API is expected
                   * to return their own notifications.
                   *
                   * For Super Administrator, the API
                   * returns the bureau-wide stream.
                   *
                   * Therefore only notifications whose
                   * recipient_id matches the Super Admin's
                   * user ID are actionable.
                   */

                  const isOwnNotification =
                    !isSuperAdministrator ||
                    notification.recipient_id ===
                      user?.id

                  const notificationHref =
                    `${getNotificationDestination(
                      notification,
                    )}${
                      notification.id
                        ? `?notificationId=${notification.id}`
                        : ""
                    }`

                  const recipientLabel =
                    notification.recipient_name ||
                    notification.recipient_email ||
                    formatRole(
                      notification.recipient_role,
                    )

                  const notificationContent = (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">

                            <h2 className="text-sm font-semibold text-white">
                              {notification.title}
                            </h2>

                            {!notification.read && (
                              <span className="rounded-full border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#20dc73]">
                                Unread
                              </span>
                            )}

                          </div>

                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/60">
                            {notification.message ||
                              "No message provided."}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] uppercase tracking-wider text-white/30">

                            <span>
                              Type:{" "}
                              {formatNotificationType(
                                notification.type,
                              )}
                            </span>

                            <span>
                              Case:{" "}
                              {getCaseNumber(
                                notification,
                              )}
                            </span>

                          </div>

                          {isSuperAdministrator && (
                            <p className="mt-2 text-[10px] text-white/30">
                              Recipient:{" "}
                              {recipientLabel}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[10px] uppercase tracking-wider text-white/30">
                            {formatNotificationType(
                              notification.type,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-white/30">
                            {notification.created_at
                              ? new Date(
                                  notification.created_at,
                                ).toLocaleString()
                              : ""}
                          </p>
                        </div>
                      </div>

                      {/* =================================================
                          ACCESS STATUS
                      ================================================= */}

                      <div className="mt-4 border-t border-[#143b28] pt-3">

                        {isOwnNotification ? (
                          <p className="text-[10px] uppercase tracking-[0.15em] text-[#20dc73]/70">
                            Assigned to you • Open notification
                          </p>
                        ) : (
                          <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">
                            Bureau record • Read-only
                          </p>
                        )}

                      </div>
                    </>
                  )

                  /**
                   * ---------------------------------------------------
                   * OWN NOTIFICATION
                   * ---------------------------------------------------
                   *
                   * Super Admin's own notification is clickable.
                   */

                  if (isOwnNotification) {
                    return (
<button
  type="button"
  key={notification.id}
  onClick={async () => {
    const success = await openNotification(notification)

    if (success) {
      router.push(notificationHref)
    }
  }}
  className="block w-full rounded-md border border-[#143b28] bg-[#06110f] p-5 text-left transition hover:border-[#20dc73]/40 hover:bg-white/5"
>
  {notificationContent}
</button>
                    )
                  }

                  /**
                   * ---------------------------------------------------
                   * OTHER USER'S NOTIFICATION
                   * ---------------------------------------------------
                   *
                   * Super Admin can see it, but cannot open
                   * it from this page.
                   */

                  return (
                    <div
                      key={notification.id}
                      className="rounded-md border border-[#143b28] bg-[#06110f] p-5"
                    >
                      {notificationContent}
                    </div>
                  )
                },
              )}

            </div>
          )}

      </div>
    </main>
  )
}