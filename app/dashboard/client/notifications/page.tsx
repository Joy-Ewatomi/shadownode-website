"use client"

import { Bell, CheckCheck, RefreshCcw } from "lucide-react"
import Link from "next/link"

import { useClientNotifications } from "@/components/notifications/ClientNotificationProvider"
import { getNotificationDestination } from "@/lib/notification-routing"

const typeIcon: Record<string, string> = {
  case_update: "🔒",
  report_available: "📋",
  report_updated: "📋",
  final_report_available: "📋",
  new_case_message: "💬",
  alert: "⚠️",
  system: "⚙️",
  quote_available: "💰",
  quote_revised: "💰",
  payment_required: "💳",
  payment_confirmed: "✅",
  certificate_issued: "🎓",
}

export default function ClientNotificationsPage() {
  const {
    notifications,
    loading,
    unreadCount,
    refreshNotifications,
    markRead,
  } = useClientNotifications()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
            Client Operations
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            Notifications
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-white/55">
            Stay informed on case updates, report availability, and bureau communications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount ? (
            <span className="inline-flex items-center gap-1 rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-3 py-1.5 text-xs text-[#20dc73]">
              <Bell className="h-3.5 w-3.5" />
              {unreadCount} unread
            </span>
          ) : null}
          <button
            onClick={() => refreshNotifications()}
            className="inline-flex h-10 items-center gap-2 rounded border border-[#20dc73]/40 px-3 text-sm text-[#20dc73]"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      {loading ? (
        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-8 text-sm text-white/45">
          Loading notifications...
        </div>
      ) : null}

      {!loading && notifications.length ? (
        <section className="space-y-2">
          {notifications.map((notification) => {
            const destination = getNotificationDestination(notification)

            const content = (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold text-white">
                    {notification.title}
                  </p>

                  {!notification.read ? (
                    <span className="h-2 w-2 rounded-full bg-[#20dc73]" />
                  ) : null}
                </div>

                <p className="mt-1 text-sm leading-6 text-white/55">
                  {notification.message}
                </p>

                <p className="mt-2 text-xs text-white/35">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </>
            )

            return (
              <div
                key={notification.id}
                className={`group flex items-start gap-4 rounded-md border p-5 transition ${
                  notification.read
                    ? "border-[#143b28] bg-[#06110f]"
                    : "border-[#20dc73]/20 bg-[#20dc73]/5"
                }`}
              >
                <span
                  className="mt-0.5 text-lg"
                  role="img"
                  aria-label={notification.type}
                >
                  {typeIcon[notification.type] || "🔔"}
                </span>

                {destination ? (
                  <Link
                    href={`${destination}${
                      destination.includes("?") ? "&" : "?"
                    }notificationId=${encodeURIComponent(notification.id)}`}
                    className="min-w-0 flex-1"
                    onClick={() => {
                      if (!notification.read) {
                        void markRead(notification.id)
                      }
                    }}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="min-w-0 flex-1">{content}</div>
                )}

                {!notification.read ? (
                  <button
                    onClick={() => markRead(notification.id)}
                    className="shrink-0 rounded border border-[#143b28] bg-black/30 p-2 text-white/35 opacity-0 transition hover:border-[#20dc73]/30 hover:text-[#20dc73] group-hover:opacity-100"
                    title="Mark as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            )
          })}
        </section>
      ) : null}
    </div>
  )
}
