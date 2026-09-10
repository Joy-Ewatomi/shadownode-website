"use client"

import {
  Bell,
  Volume2,
  VolumeX,
} from "lucide-react"
import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

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

function formatNotificationType(
  type: string | null | undefined,
) {
  const normalized = (
    type || "system"
  ).replace(/_/g, " ")

  return normalized.replace(
    /\b\w/g,
    (char) => char.toUpperCase(),
  )
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

  const found =
    candidates.find(
      (value) =>
        typeof value === "string" &&
        value.trim(),
    )

  return found
    ? String(found)
    : "—"
}

function getCategoryFilter(
  type: string | null | undefined,
) {
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
      "payment_confirmed",
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

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role ===
      "super_administrator" ||
    role ===
      "super-administrator"
  )
}

export default function NotificationBell() {
  const [user, setUser] =
    useState<User | null>(null)

  const [open, setOpen] =
    useState(false)

  const [
    notifications,
    setNotifications,
  ] = useState<Notification[]>([])

  const [
    soundEnabled,
    setSoundEnabled,
  ] = useState(false)

  const notificationsRef =
    useRef<Notification[]>([])

  const soundEnabledRef =
    useRef(false)

  const inFlightRef =
    useRef<AbortController | null>(null)

  const hasLoadedRef =
    useRef(false)

  const mountedRef =
    useRef(true)

  const loadNotifications =
    useCallback(async () => {
      /*
       * Never allow overlapping requests.
       */
      if (
        inFlightRef.current
      ) {
        return
      }

      /*
       * Do not poll hidden tabs.
       */
      if (
        typeof document !==
          "undefined" &&
        document.visibilityState !==
          "visible"
      ) {
        return
      }

      const controller =
        new AbortController()

      inFlightRef.current =
        controller

      const timeout =
        window.setTimeout(
          () =>
            controller.abort(),
          10000,
        )

      try {
        const res =
          await fetch(
            "/api/notifications?scope=bell",
            {
              credentials: "include",
              cache: "no-store",
              signal:
                controller.signal,
            },
          )

        if (!res.ok) {
          if (
            res.status !==
            401
          ) {
            console.warn(
              "NOTIFICATION FETCH FAILED:",
              res.status,
            )
          }

          return
        }

        const payload =
          await res.json()

        /*
         * The bell endpoint returns:
         *
         * {
         *   notifications: [],
         *   user: { id, role }
         * }
         */
        const next: Notification[] =
          Array.isArray(
            payload?.notifications,
          )
            ? payload.notifications
            : []

        const currentUser: User | null =
          payload?.user &&
          typeof payload.user ===
            "object"
            ? {
                id:
                  typeof payload.user
                    .id ===
                    "string"
                    ? payload.user.id
                    : undefined,
                role:
                  typeof payload.user
                    .role ===
                    "string"
                    ? payload.user.role
                    : "",
              }
            : null

        const previous =
          notificationsRef.current

        const previousUnread =
          previous.filter(
            (item) =>
              !item.read,
          ).length

        const nextUnread =
          next.filter(
            (item) =>
              !item.read,
          ).length

        const initialLoad =
          !hasLoadedRef.current

        /*
         * Sound only plays when a later refresh
         * detects an increase in unread count.
         */
        if (
          !initialLoad &&
          soundEnabledRef.current &&
          nextUnread >
            previousUnread
        ) {
          try {
            const audio =
              new Audio(
                "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
              )

            void audio
              .play()
              .catch(
                () => undefined,
              )
          } catch {
            // Sound is optional.
          }
        }

        notificationsRef.current =
          next

        hasLoadedRef.current =
          true

        if (
          mountedRef.current
        ) {
          setUser(
            currentUser,
          )

          setNotifications(
            next,
          )
        }
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return
        }

        console.error(
          "NOTIFICATION LOAD ERROR:",
          error,
        )
      } finally {
        window.clearTimeout(
          timeout,
        )

        if (
          inFlightRef.current ===
          controller
        ) {
          inFlightRef.current =
            null
        }
      }
    }, [])

  /*
   * Initial load + controlled polling.
   */
  useEffect(() => {
    mountedRef.current =
      true

    void loadNotifications()

    const refresh =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadNotifications()
        }
      }

    const timer =
      window.setInterval(
        refresh,
        30000,
      )

    document.addEventListener(
      "visibilitychange",
      refresh,
    )

    window.addEventListener(
      "focus",
      refresh,
    )

    return () => {
      mountedRef.current =
        false

      window.clearInterval(
        timer,
      )

      document.removeEventListener(
        "visibilitychange",
        refresh,
      )

      window.removeEventListener(
        "focus",
        refresh,
      )

      if (
        inFlightRef.current
      ) {
        inFlightRef.current.abort()
        inFlightRef.current =
          null
      }
    }
  }, [loadNotifications])

  const unread = useMemo(
    () =>
      notifications.filter(
        (item) =>
          !item.read,
      ).length,
    [notifications],
  )

  const bellNotifications =
    useMemo(
      () =>
        notifications
          .filter(
            (item) =>
              !item.read,
          )
          .sort(
            (left, right) =>
              new Date(
                right.created_at,
              ).getTime() -
              new Date(
                left.created_at,
              ).getTime(),
          ),
      [notifications],
    )

  async function markRead(
    id: string,
  ) {
    try {
      const res =
        await fetch(
          `/api/notifications/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            cache:
              "no-store",
            body: JSON.stringify({
              id,
            }),
          },
        )

      if (!res.ok) {
        console.error(
          "NOTIFICATION MARK READ FAILED:",
          await res.text(),
        )

        return false
      }

      setNotifications(
        (items) => {
          const next =
            items.map(
              (item) =>
                item.id === id
                  ? {
                      ...item,
                      read: true,
                    }
                  : item,
            )

          notificationsRef.current =
            next

          return next
        },
      )

      return true
    } catch (error) {
      console.error(
        "NOTIFICATION MARK READ ERROR:",
        error,
      )

      return false
    }
  }

  async function deleteNotification(
    id: string,
  ) {
    try {
      const res =
        await fetch(
          `/api/notifications/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            credentials:
              "include",
          },
        )

      if (!res.ok) {
        return
      }

      setNotifications(
        (items) => {
          const next =
            items.filter(
              (item) =>
                item.id !== id,
            )

          notificationsRef.current =
            next

          return next
        },
      )
    } catch (error) {
      console.error(
        "NOTIFICATION DELETE ERROR:",
        error,
      )
    }
  }

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

    new_message:
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

    payment_required:
      "border-yellow-400/40 bg-yellow-400/10 text-yellow-200",

    payment_confirmed:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",

    payment_received:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",

    training_session_scheduled:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",

    training_session_updated:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",

    training_material_uploaded:
      "border-sky-400/40 bg-sky-400/10 text-sky-200",

    training_progress_updated:
      "border-amber-300/40 bg-amber-300/10 text-amber-200",

    training_update:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",

    certificate_issued:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",

    system:
      "border-white/25 bg-white/10 text-white/75",
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() =>
          setOpen(
            (value) =>
              !value,
          )
        }
        className="relative flex h-10 w-10 items-center justify-center rounded-md border border-[#143b28] bg-[#06110f] text-white/75 transition hover:border-[#20dc73]/50 hover:text-[#20dc73]"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />

        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#20dc73] px-1.5 py-0.5 text-[10px] font-bold leading-4 text-black">
            {unread > 99
              ? "99+"
              : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[26rem] overflow-hidden rounded-md border border-[#143b28] bg-[#06110f] shadow-2xl">
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
              {!isSuperAdminRole(
                user?.role,
              ) && (
                <button
                  type="button"
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
              )}

              <span className="text-xs text-white/45">
                {unread} unread
              </span>
            </div>
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {bellNotifications.length >
            0 ? (
              bellNotifications.map(
                (item) => {
                  const baseDestination =
                    getNotificationDestination(
                      item,
                    ) ||
                    "/dashboard/notifications"

                  const separator =
                    baseDestination.includes(
                      "?",
                    )
                      ? "&"
                      : "?"

                  const notificationHref =
                    `${baseDestination}${separator}notificationId=${encodeURIComponent(item.id)}`

                  const category =
                    getCategoryFilter(
                      item.type,
                    )

                  return (
                    <div
                      key={item.id}
                      className="border-b border-[#143b28] px-4 py-4 transition hover:bg-white/5"
                    >
                      <Link
                        href={
                          notificationHref
                        }
                        onClick={async (
                          event,
                        ) => {
                          event.preventDefault()

                          setOpen(
                            false,
                          )

                          const success =
                            await markRead(
                              item.id,
                            )

                          if (
                            success
                          ) {
                            window.location.href =
                              notificationHref
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
                              {item.message ||
                                "No message provided."}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/35">
                              <span>
                                Type:{" "}
                                {formatNotificationType(
                                  item.type,
                                )}
                              </span>

                              <span>
                                Category:{" "}
                                {category}
                              </span>

                              <span>
                                Case:{" "}
                                {getCaseNumber(
                                  item,
                                )}
                              </span>
                            </div>

                            <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-white/30">
                              {new Date(
                                item.created_at,
                              ).toLocaleString()}
                            </p>
                          </div>

                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#20dc73]" />
                        </div>

                        <span
                          className={`mt-3 inline-flex rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
                            typeClass[
                              item.type
                            ] ||
                            typeClass.system
                          }`}
                        >
                          {formatNotificationType(
                            item.type,
                          )}
                        </span>
                      </Link>
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

          <div className="border-t border-[#143b28] px-4 py-3">
            <Link
              href="/dashboard/notifications"
              onClick={() =>
                setOpen(false)
              }
              className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-[#20dc73] transition hover:text-white"
            >
              <span>
                View all notifications
              </span>

              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}