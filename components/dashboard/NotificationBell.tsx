"use client"

import { Bell, Volume2, VolumeX } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import {
  useClientNotifications,
  type ClientNotification,
} from "@/components/notifications/ClientNotificationProvider"
import { getNotificationDestination } from "@/lib/notification-routing"

function formatNotificationType(type: string | null | undefined) {
  return (type || "system")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function typeClass(type: string) {
  const classes: Record<string, string> = {
    assignment: "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
    case_assignment: "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
    message: "border-sky-400/40 bg-sky-400/10 text-sky-200",
    new_message: "border-sky-400/40 bg-sky-400/10 text-sky-200",
    new_case_message: "border-sky-400/40 bg-sky-400/10 text-sky-200",
    case_update: "border-amber-300/40 bg-amber-300/10 text-amber-200",
    quote_available: "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
    quote_revised: "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
    quote_ready: "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
    request_declined: "border-red-400/40 bg-red-400/10 text-red-200",
    negotiation_response_received:
      "border-yellow-400/40 bg-yellow-400/10 text-yellow-200",
    payment_required:
      "border-yellow-400/40 bg-yellow-400/10 text-yellow-200",
    payment_confirmed:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
    report_available:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
    certificate_issued:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
  }

  return classes[type] || "border-white/25 bg-white/10 text-white/75"
}

function notificationHref(
  notification: ClientNotification,
  fallbackPath: string,
) {
  const base =
    getNotificationDestination(notification) || fallbackPath
  const separator = base.includes("?") ? "&" : "?"

  return `${base}${separator}notificationId=${encodeURIComponent(
    notification.id,
  )}`
}

export default function NotificationBell({
  userRole,
}: {
  userRole?: string
}) {
  const [open, setOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const { notifications, unreadCount, markRead } = useClientNotifications()
  const notificationsPath =
    userRole === "client"
      ? "/dashboard/client/notifications"
      : "/dashboard/notifications"

  const unreadNotifications = useMemo(
    () =>
      notifications
        .filter((item) => !item.read)
        .sort(
          (left, right) =>
            new Date(right.created_at).getTime() -
            new Date(left.created_at).getTime(),
        ),
    [notifications],
  )

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-md border border-[#143b28] bg-[#06110f] text-white/75 transition hover:border-[#20dc73]/50 hover:text-[#20dc73]"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#20dc73] px-1.5 py-0.5 text-[10px] font-bold leading-4 text-black">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[26rem] overflow-hidden rounded-md border border-[#143b28] bg-[#06110f] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#143b28] px-4 py-3">
            <div>
              <p className="font-semibold text-white">Notifications</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-white/35">
                Unread notifications
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled((value) => !value)}
                className="rounded p-1 text-white/45 transition hover:bg-white/5 hover:text-white"
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
              <span className="text-xs text-white/45">
                {unreadCount} unread
              </span>
            </div>
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {unreadNotifications.length > 0 ? (
              unreadNotifications.map((item) => (
                <div
                  key={item.id}
                  className="border-b border-[#143b28] px-4 py-4 transition hover:bg-white/5"
                >
                  <Link
                    href={notificationHref(item, notificationsPath)}
                    onClick={async (event) => {
                      event.preventDefault()
                      setOpen(false)

                      const success = await markRead(item.id)
                      if (success) {
                        window.location.href = notificationHref(
                          item,
                          notificationsPath,
                        )
                      }
                    }}
                    className="block"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-white/55">
                          {item.message || "No message provided."}
                        </p>
                        <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-white/30">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#20dc73]" />
                    </div>

                    <span
                      className={`mt-3 inline-flex rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${typeClass(
                        item.type,
                      )}`}
                    >
                      {formatNotificationType(item.type)}
                    </span>
                  </Link>
                </div>
              ))
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

          <div className="border-t border-[#143b28] px-4 py-3">
            <Link
              href={notificationsPath}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-[#20dc73] transition hover:text-white"
            >
              <span>View all notifications</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
