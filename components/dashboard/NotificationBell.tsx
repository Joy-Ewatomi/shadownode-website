"use client"

import { Bell, Search, Volume2, VolumeX, X } from "lucide-react"
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
  role: string
}

type StatusFilter = "all" | "unread" | "read"
type CategoryFilter = "all" | "requests" | "quotes" | "payments" | "cases" | "system"
type RoleFilter = "all" | "clients" | "administrators" | "super_administrators"

function formatNotificationType(type: string | null | undefined) {
  const normalized = (type || "system").replace(/_/g, " ")
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatRole(value: string | null | undefined) {
  if (!value) return "Unknown"
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getCaseNumber(notification: Notification) {
  const metadata = (notification.metadata || {}) as Record<string, unknown>
  const candidates = [metadata.case_number, metadata.caseNumber, metadata.case_id, metadata.caseId, notification.case_id]
  const found = candidates.find((value) => typeof value === "string" && value.trim())
  return found ? String(found) : "—"
}

function getCategoryFilter(type: string | null | undefined): CategoryFilter {
  const normalized = (type || "").toLowerCase()

  if (["request_created", "request_updated", "request_review", "client_request", "negotiation_requested"].includes(normalized)) {
    return "requests"
  }

  if (["quote_ready", "quote_adjusted", "quote_review"].includes(normalized)) {
    return "quotes"
  }

  if (["payment_required", "payment_received", "payment_failed"].includes(normalized)) {
    return "payments"
  }

  if (["case_completed", "case_update", "case_assignment", "new_message"].includes(normalized)) {
    return "cases"
  }

  return "system"
}

export default function NotificationBell() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")

  const notificationsRef = useRef<Notification[]>([])
  const soundEnabledRef = useRef(false)

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        })

        if (!res.ok) {
          return
        }

        const data = await res.json()
        setUser(data.user)
      } catch (error) {
        console.error("USER LOAD ERROR", error)
      }
    }

    void loadUser()
  }, [])

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications", {
        credentials: "include",
        cache: "no-store",
      })

      if (!res.ok) {
        return
      }

      const next: Notification[] = await res.json()
      const previousUnread = notificationsRef.current.filter((item) => !item.read).length
      const nextUnread = next.filter((item) => !item.read).length

      if (soundEnabledRef.current && nextUnread > previousUnread) {
        new Audio(
          "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="
        )
          .play()
          .catch(() => undefined)
      }

      notificationsRef.current = next
      setNotifications(next)
    } catch (error) {
      console.error("NOTIFICATION LOAD ERROR", error)
    }
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    })

    setNotifications((items) => {
      const next = items.map((item) => (item.id === id ? { ...item, read: true } : item))
      notificationsRef.current = next
      return next
    })
  }

  async function deleteNotification(id: string) {
    const res = await fetch(`/api/notifications/${id}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!res.ok) {
      return
    }

    setNotifications((items) => {
      const next = items.filter((item) => item.id !== id)
      notificationsRef.current = next
      return next
    })
  }

  useEffect(() => {
    void loadNotifications()

    const timer = window.setInterval(() => {
      void loadNotifications()
    }, 5000)

    return () => window.clearInterval(timer)
  }, [])

  const unread = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])

  const visibleNotifications = useMemo(() => {
    const sorted = [...notifications].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    const searchValue = searchTerm.trim().toLowerCase()

    return sorted.filter((item) => {
      const matchesSearch = !searchValue
        || [
            item.title,
            item.message,
            item.type,
            item.recipient_name,
            item.recipient_email,
            item.recipient_role,
            getCaseNumber(item),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(searchValue)

      const matchesStatus = statusFilter === "all" || (statusFilter === "unread" ? !item.read : item.read)
      const matchesCategory = categoryFilter === "all" || getCategoryFilter(item.type) === categoryFilter
      const matchesRole = !user || user.role !== "super_administrator" || roleFilter === "all"
        || (roleFilter === "clients" && (item.recipient_role || "").toLowerCase() === "client")
        || (roleFilter === "administrators" && (item.recipient_role || "").toLowerCase() === "administrator")
        || (roleFilter === "super_administrators" && (item.recipient_role || "").toLowerCase() === "super_administrator")

      return matchesSearch && matchesStatus && matchesCategory && matchesRole
    })
  }, [categoryFilter, notifications, roleFilter, searchTerm, statusFilter, user])

  const typeClass: Record<string, string> = {
    assignment: "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
    case_assignment: "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
    message: "border-sky-400/40 bg-sky-400/10 text-sky-200",
    case_update: "border-amber-300/40 bg-amber-300/10 text-amber-200",
    security: "border-red-400/40 bg-red-400/10 text-red-200",
    quote_ready: "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
    request_created: "border-blue-400/40 bg-blue-400/10 text-blue-200",
    quote_review: "border-yellow-400/40 bg-yellow-400/10 text-yellow-200",
    system: "border-white/25 bg-white/10 text-white/75",
  }

  const isSuperAdministrator = user?.role === "super_administrator"

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-md border border-[#143b28] bg-[#06110f] text-white/75 hover:border-[#20dc73]/50 hover:text-[#20dc73]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#20dc73] px-1.5 py-0.5 text-[10px] font-bold text-black">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[26rem] overflow-hidden rounded-md border border-[#143b28] bg-[#06110f] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#143b28] px-4 py-3">
            <p className="font-semibold text-white">Notifications</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSoundEnabled((value) => {
                    const next = !value
                    soundEnabledRef.current = next
                    return next
                  })
                }}
                className="rounded p-1 text-white/45 hover:bg-white/5 hover:text-white"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <span className="text-xs text-white/45">{unread} unread</span>
            </div>
          </div>

          <div className="border-b border-[#143b28] px-4 py-3">
            <div className="flex items-center gap-2 rounded-md border border-[#143b28] bg-black/20 px-3 py-2">
              <Search className="h-4 w-4 text-white/45" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search case, recipient, email, title, message"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
              {searchTerm ? (
                <button onClick={() => setSearchTerm("")} className="text-white/45 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(["all", "unread", "read"] as StatusFilter[]).map((value) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${statusFilter === value ? "border-[#20dc73]/40 bg-[#20dc73]/15 text-[#20dc73]" : "border-[#143b28] text-white/55 hover:border-[#20dc73]/30 hover:text-white"}`}
                >
                  {value === "all" ? "All" : value === "unread" ? "Unread" : "Read"}
                </button>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {(["all", "requests", "quotes", "payments", "cases", "system"] as CategoryFilter[]).map((value) => (
                <button
                  key={value}
                  onClick={() => setCategoryFilter(value)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${categoryFilter === value ? "border-[#20dc73]/40 bg-[#20dc73]/15 text-[#20dc73]" : "border-[#143b28] text-white/55 hover:border-[#20dc73]/30 hover:text-white"}`}
                >
                  {value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>

            {isSuperAdministrator ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {(["all", "clients", "administrators", "super_administrators"] as RoleFilter[]).map((value) => (
                  <button
                    key={value}
                    onClick={() => setRoleFilter(value)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${roleFilter === value ? "border-[#20dc73]/40 bg-[#20dc73]/15 text-[#20dc73]" : "border-[#143b28] text-white/55 hover:border-[#20dc73]/30 hover:text-white"}`}
                  >
                    {value === "all" ? "All" : value === "clients" ? "Clients" : value === "administrators" ? "Administrators" : "Super Administrators"}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {visibleNotifications.length ? (
              visibleNotifications.map((item) => {
                const notificationHref = `${getNotificationDestination(item)}${item.id ? `?notificationId=${item.id}` : ""}`
                const recipientLabel = item.recipient_name || item.recipient_email || formatRole(item.recipient_role)

                return (
                  <div key={item.id} className={`border-b border-[#143b28] px-4 py-3 transition hover:bg-white/5 ${item.read ? "opacity-65" : ""}`}>
                    <div className="flex items-start gap-3">
                      <Link href={notificationHref} onClick={() => { setOpen(false); if (!item.read) { void markRead(item.id) } }} className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white">{item.title}</p>
                            <p className="mt-1 text-[11px] text-white/55">Recipient: {recipientLabel}</p>
                            <p className="mt-1 text-[11px] text-white/55">Type: {formatNotificationType(item.type)}</p>
                            <p className="mt-1 text-[11px] text-white/55">Message: {item.message || "No message provided."}</p>
                            <p className="mt-1 text-[11px] text-white/55">Case: {getCaseNumber(item)}</p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-white/35">{new Date(item.created_at).toLocaleString()}</p>
                            <p className="mt-1 text-[11px] text-white/45">Status: {item.read ? "Read" : "Unread"}</p>
                          </div>
                          {!item.read ? <span className="mt-1 h-2 w-2 rounded-full bg-[#20dc73]" /> : null}
                        </div>
                        <span className={`mt-2 inline-flex rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${typeClass[item.type] || typeClass.system}`}>
                          {formatNotificationType(item.type)}
                        </span>
                      </Link>
                      {isSuperAdministrator ? (
                        <button
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            void deleteNotification(item.id)
                          }}
                          className="rounded border border-[#143b28] px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-white/60 hover:border-[#20dc73]/40 hover:text-white"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-4 py-8 text-center text-sm text-white/45">
                No notifications match the current filters.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
