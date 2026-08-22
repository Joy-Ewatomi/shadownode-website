"use client"

import { Bell, Volume2, VolumeX, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { getNotificationDestination } from "@/lib/notification-routing"

type Notification = {
  id: string
  title: string
  message: string | null
  type: string
  read: boolean
  created_at: string
  case_id: string | null
  metadata?: Record<string, unknown> | null

  recipient_id?: string | null
  recipient_name?: string | null
  recipient_email?: string | null
  recipient_role?: string | null
}

type User = {
  id?: string
  role: string
}

type StatusFilter = "all" | "unread" | "read"

type CategoryFilter =
  | "all"
  | "requests"
  | "quotes"
  | "payments"
  | "cases"
  | "system"

type RoleFilter =
  | "all"
  | "clients"
  | "administrators"
  | "super_administrators"

function formatNotificationType(
  type: string | null | undefined,
) {
  const normalized = (type || "system").replace(/_/g, " ")

  return normalized.replace(/\b\w/g, (char) =>
    char.toUpperCase(),
  )
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
    (notification.metadata || {}) as Record<
      string,
      unknown
    >

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

function getCategoryFilter(
  type: string | null | undefined,
): CategoryFilter {
  const normalized = (
    type || ""
  ).toLowerCase()

  if (
    [
      "request_created",
      "request_updated",
      "request_review",
      "client_request",
      "negotiation_requested",
    ].includes(normalized)
  ) {
    return "requests"
  }

  if (
    [
      "quote_ready",
      "quote_adjusted",
      "quote_review",
      "quote_rejected",
    ].includes(normalized)
  ) {
    return "quotes"
  }

  if (
    [
      "payment_required",
      "payment_received",
      "payment_failed",
    ].includes(normalized)
  ) {
    return "payments"
  }

  if (
    [
      "case_completed",
      "case_update",
      "case_assignment",
      "new_message",
    ].includes(normalized)
  ) {
    return "cases"
  }

  return "system"
}

/**
 * Determines whether a notification belongs to the
 * currently authenticated user.
 *
 * For normal users, the API already returns only their
 * notifications.
 *
 * For Super Administrator, the API returns the bureau-wide
 * notification stream, so we must distinguish their own
 * notifications from everyone else's.
 */
function isOwnNotification(
  notification: Notification,
  user: User | null,
) {
  if (!user?.id) return false

  return notification.recipient_id === user.id
}

export default function NotificationBell() {
  const [user, setUser] =
    useState<User | null>(null)

  const [open, setOpen] =
    useState(false)

  const [notifications, setNotifications] =
    useState<Notification[]>([])

  const [soundEnabled, setSoundEnabled] =
    useState(false)

  const notificationsRef =
    useRef<Notification[]>([])

  const soundEnabledRef =
    useRef(false)

  /**
   * ---------------------------------------------------------
   * LOAD CURRENT USER
   * ---------------------------------------------------------
   */

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch(
          "/api/auth/me",
          {
            credentials: "include",
            cache: "no-store",
          },
        )

        if (!res.ok) return

        const data = await res.json()

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

  async function loadNotifications() {
    try {
      const res = await fetch(
        "/api/notifications",
        {
          credentials: "include",
          cache: "no-store",
        },
      )

      if (!res.ok) return

      const next: Notification[] =
        await res.json()

      const previous =
        notificationsRef.current

      const previousUnread =
        previous.filter(
          (item) =>
            !item.read &&
            isOwnNotification(item, user),
        ).length

      const nextUnread =
        next.filter(
          (item) =>
            !item.read &&
            isOwnNotification(item, user),
        ).length

      /**
       * Only play the sound when a new unread
       * notification belonging to the current
       * user appears.
       */
      if (
        soundEnabledRef.current &&
        nextUnread > previousUnread
      ) {
        new Audio(
          "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
        )
          .play()
          .catch(() => undefined)
      }

      notificationsRef.current = next

      setNotifications(next)
    } catch (error) {
      console.error(
        "NOTIFICATION LOAD ERROR",
        error,
      )
    }
  }

  /**
   * ---------------------------------------------------------
   * POLLING
   * ---------------------------------------------------------
   */

  useEffect(() => {
    void loadNotifications()

    const timer =
      window.setInterval(() => {
        void loadNotifications()
      }, 5000)

    return () =>
      window.clearInterval(timer)
  }, [user])

  const isSuperAdministrator =
    user?.role === "super_administrator" ||
    user?.role === "super-administrator"

  /**
   * ---------------------------------------------------------
   * UNREAD COUNT
   * ---------------------------------------------------------
   *
   * This is what appears on the bell badge.
   *
   * Only unread notifications belonging to the
   * current user count.
   */

  const unread = useMemo(() => {
    return notifications.filter(
      (item) =>
        !item.read &&
        isOwnNotification(item, user),
    ).length
  }, [notifications, user])

  /**
   * ---------------------------------------------------------
   * BELL NOTIFICATIONS
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   *
   * The bell ONLY displays unread notifications.
   *
   * Read notifications remain available through
   * the full Notifications page/sidebar.
   */

  const bellNotifications = useMemo(() => {
    return notifications
      .filter(
        (item) =>
          !item.read &&
          isOwnNotification(item, user),
      )
      .sort(
        (left, right) =>
          new Date(
            right.created_at,
          ).getTime() -
          new Date(
            left.created_at,
          ).getTime(),
      )
  }, [notifications, user])

  /**
   * ---------------------------------------------------------
   * MARK READ
   * ---------------------------------------------------------
   */

async function markRead(id: string) {
  try {
    const res = await fetch(
      `/api/notifications/${id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!res.ok) {
      console.error(
        "NOTIFICATION MARK READ FAILED",
        await res.text(),
      )
      return false
    }

    setNotifications((items) => {
      const next = items.map((item) =>
        item.id === id
          ? {
              ...item,
              read: true,
            }
          : item,
      )

      notificationsRef.current = next

      return next
    })

    return true
  } catch (error) {
    console.error(
      "NOTIFICATION MARK READ ERROR",
      error,
    )

    return false
  }
}

  /**
   * ---------------------------------------------------------
   * DELETE
   * ---------------------------------------------------------
   */

  async function deleteNotification(
    id: string,
  ) {
    if (isSuperAdministrator) {
      return
    }

    try {
      const res = await fetch(
        `/api/notifications/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      )

      if (!res.ok) return

      setNotifications((items) => {
        const next = items.filter(
          (item) => item.id !== id,
        )

        notificationsRef.current =
          next

        return next
      })
    } catch (error) {
      console.error(
        "NOTIFICATION DELETE ERROR",
        error,
      )
    }
  }

  /**
   * ---------------------------------------------------------
   * TYPE STYLING
   * ---------------------------------------------------------
   */

  const typeClass: Record<
    string,
    string
  > = {
    assignment:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",

    case_assignment:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",

    message:
      "border-sky-400/40 bg-sky-400/10 text-sky-200",

    case_update:
      "border-amber-300/40 bg-amber-300/10 text-amber-200",

    security:
      "border-red-400/40 bg-red-400/10 text-red-200",

    quote_ready:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",

    request_created:
      "border-blue-400/40 bg-blue-400/10 text-blue-200",

    quote_review:
      "border-yellow-400/40 bg-yellow-400/10 text-yellow-200",

    quote_adjusted:
      "border-yellow-400/40 bg-yellow-400/10 text-yellow-200",

    quote_rejected:
      "border-red-400/40 bg-red-400/10 text-red-200",

    system:
      "border-white/25 bg-white/10 text-white/75",
  }

  return (
    <div className="relative">
      {/* =====================================================
          BELL
      ===================================================== */}

      <button
        onClick={() =>
          setOpen((value) => !value)
        }
        className="relative flex h-10 w-10 items-center justify-center rounded-md border border-[#143b28] bg-[#06110f] text-white/75 hover:border-[#20dc73]/50 hover:text-[#20dc73]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />

        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#20dc73] px-1.5 py-0.5 text-[10px] font-bold text-black">
            {unread}
          </span>
        ) : null}
      </button>

      {/* =====================================================
          BELL DROPDOWN
      ===================================================== */}

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[26rem] overflow-hidden rounded-md border border-[#143b28] bg-[#06110f] shadow-2xl">

          {/* HEADER */}

          <div className="flex items-center justify-between border-b border-[#143b28] px-4 py-3">
            <div>
              <p className="font-semibold text-white">
                Notifications
              </p>

              <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-white/35">
                Unread notifications
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isSuperAdministrator ? (
                <button
                  onClick={() => {
                    setSoundEnabled(
                      (value) => {
                        const next =
                          !value

                        soundEnabledRef.current =
                          next

                        return next
                      },
                    )
                  }}
                  className="rounded p-1 text-white/45 hover:bg-white/5 hover:text-white"
                  aria-label={
                    soundEnabled
                      ? "Disable notification sound"
                      : "Enable notification sound"
                  }
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </button>
              ) : null}

              <span className="text-xs text-white/45">
                {unread} unread
              </span>
            </div>
          </div>

          {/* =================================================
              UNREAD NOTIFICATIONS ONLY
          ================================================= */}

          <div className="max-h-[28rem] overflow-y-auto">
            {bellNotifications.length ? (
              bellNotifications.map(
                (item) => {
                  const notificationHref =
                    `${getNotificationDestination(
                      item,
                    )}${
                      item.id
                        ? `?notificationId=${item.id}`
                        : ""
                    }`

                  const recipientLabel =
                    item.recipient_name ||
                    item.recipient_email ||
                    formatRole(
                      item.recipient_role,
                    )

                  return (
                    <div
                      key={item.id}
                      className="border-b border-[#143b28] px-4 py-4 transition hover:bg-white/5"
                    >
                  {isSuperAdministrator && !isOwnNotification(item, user) ? (
  <div className="block cursor-default">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">
          {item.title}
        </p>

        <p className="mt-1 text-[11px] text-white/55">
          {item.message || "No message provided."}
        </p>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/35">
          <span>
            Type: {formatNotificationType(item.type)}
          </span>

          <span>
            Case: {getCaseNumber(item)}
          </span>
        </div>

        <p className="mt-1 text-[10px] text-white/30">
          Recipient: {recipientLabel}
        </p>

        <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-white/30">
          {new Date(item.created_at).toLocaleString()}
        </p>

        <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-white/25">
          Bureau record • Not assigned to you
        </p>
      </div>

      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-white/20" />
    </div>

    <span
      className={`mt-3 inline-flex rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
        typeClass[item.type] || typeClass.system
      }`}
    >
      {formatNotificationType(item.type)}
    </span>
  </div>
) : (
  <Link
    href={notificationHref}
  onClick={async (event) => {
  event.preventDefault()

  setOpen(false)

  const success = await markRead(item.id)

  if (success) {
    window.location.href = notificationHref
  }
}}
    className="block"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">
          {item.title}
        </p>

        <p className="mt-1 text-[11px] text-white/55">
          {item.message || "No message provided."}
        </p>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/35">
          <span>
            Type: {formatNotificationType(item.type)}
          </span>

          <span>
            Case: {getCaseNumber(item)}
          </span>
        </div>

        {isSuperAdministrator ? (
          <p className="mt-1 text-[10px] text-white/30">
            Recipient: {recipientLabel}
          </p>
        ) : null}

        <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-white/30">
          {new Date(item.created_at).toLocaleString()}
        </p>
      </div>

      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#20dc73]" />
    </div>

    <span
      className={`mt-3 inline-flex rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
        typeClass[item.type] || typeClass.system
      }`}
    >
      {formatNotificationType(item.type)}
    </span>
  </Link>
)}
                    </div>
                  )
                },
              )
            ) : (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto h-7 w-7 text-white/20" />

                <p className="mt-3 text-sm text-white/45">
                  No unread notifications
                </p>

                <p className="mt-1 text-xs text-white/25">
                  You&apos;re all caught up.
                </p>
              </div>
            )}
          </div>

          {/* =================================================
              VIEW ALL
          ================================================= */}

          <div className="border-t border-[#143b28] px-4 py-3">
            <Link
              href="/dashboard/notifications"
              onClick={() =>
                setOpen(false)
              }
              className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-[#20dc73] hover:text-white"
            >
              <span>
                View all notifications
              </span>

              <span>→</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}