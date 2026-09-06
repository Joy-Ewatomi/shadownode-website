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
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function isOwnNotification(
  notification: Notification,
  user: User | null,
) {
  if (!user) return false

  /*
   * Normal users receive only their own
   * notifications from /api/notifications.
   */
  if (!isSuperAdminRole(user.role)) {
    return true
  }

  /*
   * Super Administrator receives the
   * bureau-wide notification stream.
   */
  if (!user.id) {
    return false
  }

  return (
    notification.recipient_id ===
    user.id
  )
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

  /*
   * ---------------------------------------------------------
   * REFS
   * ---------------------------------------------------------
   */

  const userRef =
    useRef<User | null>(null)

  const notificationsRef =
    useRef<Notification[]>([])

  const soundEnabledRef =
    useRef(false)

  const inFlightRef =
    useRef<AbortController | null>(null)

  const hasLoadedNotificationsRef =
    useRef(false)

  const mountedRef =
    useRef(true)

  /*
   * ---------------------------------------------------------
   * CURRENT USER
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      try {
        const controller =
          new AbortController()

        const timeout =
          window.setTimeout(
            () => controller.abort(),
            10000,
          )

        const res = await fetch(
          "/api/auth/me",
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          },
        )

        window.clearTimeout(timeout)

        if (!res.ok) {
          return
        }

        const data =
          await res.json()

        if (
          !cancelled &&
          data?.user
        ) {
          userRef.current =
            data.user

          setUser(data.user)
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return
        }

        console.error(
          "NOTIFICATION USER LOAD ERROR:",
          error,
        )
      }
    }

    void loadUser()

    return () => {
      cancelled = true
    }
  }, [])

  /*
   * ---------------------------------------------------------
   * LOAD NOTIFICATIONS
   * ---------------------------------------------------------
   *
   * Important performance behavior:
   *
   * 1. Only one request may run at a time.
   * 2. Requests have a timeout.
   * 3. The caller's latest user is read from userRef.
   * 4. Initial load never plays a sound.
   */

  const loadNotifications =
    useCallback(async () => {
      /*
       * Do not allow overlapping requests.
       */
      if (inFlightRef.current) {
        return
      }

      /*
       * Do not poll hidden browser tabs.
       */
      if (
        typeof document !== "undefined" &&
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
          () => controller.abort(),
          10000,
        )

      try {
        const res = await fetch(
          "/api/notifications",
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          },
        )

        if (!res.ok) {
          if (
            res.status !== 401
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

        const next: Notification[] =
          Array.isArray(payload)
            ? payload
            : Array.isArray(
                  payload?.notifications,
                )
              ? payload.notifications
              : []

        const previous =
          notificationsRef.current

        const currentUser =
          userRef.current

        const previousUnread =
          previous.filter(
            (item) =>
              !item.read &&
              isOwnNotification(
                item,
                currentUser,
              ),
          ).length

        const nextUnread =
          next.filter(
            (item) =>
              !item.read &&
              isOwnNotification(
                item,
                currentUser,
              ),
          ).length

        /*
         * Do not play sound on initial
         * notification load.
         */
        const isInitialLoad =
          !hasLoadedNotificationsRef.current

        if (
          !isInitialLoad &&
          soundEnabledRef.current &&
          nextUnread > previousUnread
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
            // Notification sound is optional.
          }
        }

        notificationsRef.current =
          next

        hasLoadedNotificationsRef.current =
          true

        if (mountedRef.current) {
          setNotifications(next)
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return
        }

        console.error(
          "NOTIFICATION LOAD ERROR:",
          error,
        )
      } finally {
        window.clearTimeout(timeout)

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
   * ---------------------------------------------------------
   * POLLING
   * ---------------------------------------------------------
   *
   * Old:
   *   every 5 seconds
   *
   * New:
   *   every 30 seconds
   *
   * Plus immediate refresh when:
   *   - tab becomes visible
   *   - browser window receives focus
   */

  useEffect(() => {
    mountedRef.current = true

    void loadNotifications()

    const refreshIfVisible =
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
        () => {
          refreshIfVisible()
        },
        30000,
      )

    document.addEventListener(
      "visibilitychange",
      refreshIfVisible,
    )

    window.addEventListener(
      "focus",
      refreshIfVisible,
    )

    return () => {
      mountedRef.current = false

      window.clearInterval(timer)

      document.removeEventListener(
        "visibilitychange",
        refreshIfVisible,
      )

      window.removeEventListener(
        "focus",
        refreshIfVisible,
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

  /*
   * ---------------------------------------------------------
   * SUPER ADMIN
   * ---------------------------------------------------------
   */

  const isSuperAdministrator =
    isSuperAdminRole(
      user?.role,
    )

  /*
   * ---------------------------------------------------------
   * UNREAD COUNT
   * ---------------------------------------------------------
   */

  const unread = useMemo(() => {
    return notifications.filter(
      (item) =>
        !item.read &&
        isOwnNotification(
          item,
          user,
        ),
    ).length
  }, [notifications, user])

  /*
   * ---------------------------------------------------------
   * BELL NOTIFICATIONS
   * ---------------------------------------------------------
   */

  const bellNotifications =
    useMemo(() => {
      return notifications
        .filter(
          (item) =>
            !item.read &&
            isOwnNotification(
              item,
              user,
            ),
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

  /*
   * ---------------------------------------------------------
   * MARK READ
   * ---------------------------------------------------------
   */

  async function markRead(
    id: string,
  ) {
    try {
      const res = await fetch(
        `/api/notifications/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
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

  /*
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
        `/api/notifications/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          credentials: "include",
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

  /*
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

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="relative">
      {/* =====================================================
          BELL
      ===================================================== */}

      <button
        type="button"
        onClick={() =>
          setOpen(
            (value) => !value,
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

      {/* =====================================================
          DROPDOWN
      ===================================================== */}

      {open && (
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
              {!isSuperAdministrator && (
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

          {/* =================================================
              NOTIFICATION LIST
          ================================================= */}

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

                  const recipientLabel =
                    item.recipient_name ||
                    item.recipient_email ||
                    formatRole(
                      item.recipient_role,
                    )

                  const category =
                    getCategoryFilter(
                      item.type,
                    )

                  return (
                    <div
                      key={item.id}
                      className="border-b border-[#143b28] px-4 py-4 transition hover:bg-white/5"
                    >
                      {isSuperAdministrator &&
                      !isOwnNotification(
                        item,
                        user,
                      ) ? (
                        <div className="block cursor-default">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white">
                                {item.title}
                              </p>

                              <p className="mt-1 text-[11px] text-white/55">
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

                              <p className="mt-1 text-[10px] text-white/30">
                                Recipient:{" "}
                                {
                                  recipientLabel
                                }
                              </p>

                              <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-white/30">
                                {new Date(
                                  item.created_at,
                                ).toLocaleString()}
                              </p>

                              <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-white/25">
                                Bureau record •
                                Not assigned
                                to you
                              </p>
                            </div>

                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-white/20" />
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
                        </div>
                      ) : (
                        <Link
                          href={
                            notificationHref
                          }
                          onClick={async (
                            event,
                          ) => {
                            event.preventDefault()

                            setOpen(false)

                            const success =
                              await markRead(
                                item.id,
                              )

                            if (success) {
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

                              {isSuperAdministrator && (
                                <p className="mt-1 text-[10px] text-white/30">
                                  Recipient:{" "}
                                  {
                                    recipientLabel
                                  }
                                </p>
                              )}

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
