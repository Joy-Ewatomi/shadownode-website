"use client"

import { Bell, Volume2, VolumeX } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type Notification = {
  id: string
  title: string
  message: string | null
  type: string
  read: boolean
  created_at: string
  case_id: string | null
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [soundEnabled, setSoundEnabled] = useState(false)

  async function load() {
    const previousUnread = notifications.filter((item) => !item.read).length
    const res = await fetch("/api/notifications", { credentials: "include" })
    if (res.ok) {
      const next = await res.json()
      const nextUnread = next.filter((item: Notification) => !item.read).length
      if (soundEnabled && nextUnread > previousUnread) {
        new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=").play().catch(() => undefined)
      }
      setNotifications(next)
    }
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)))
  }

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 15000)
    return () => window.clearInterval(timer)
  }, [])

  const unread = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])
  const typeClass: Record<string, string> = {
    assignment: "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
    case_assignment: "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
    message: "border-sky-400/40 bg-sky-400/10 text-sky-200",
    case_update: "border-amber-300/40 bg-amber-300/10 text-amber-200",
    security: "border-red-400/40 bg-red-400/10 text-red-200",
    system: "border-white/25 bg-white/10 text-white/75",
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((value) => !value)} className="relative flex h-10 w-10 items-center justify-center rounded-md border border-[#143b28] bg-[#06110f] text-white/75 hover:border-[#20dc73]/50 hover:text-[#20dc73]" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unread ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#20dc73] px-1.5 py-0.5 text-[10px] font-bold text-black">{unread}</span> : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-md border border-[#143b28] bg-[#06110f] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#143b28] px-4 py-3">
            <p className="font-semibold text-white">Notifications</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setSoundEnabled((value) => !value)} className="rounded p-1 text-white/45 hover:bg-white/5 hover:text-white" aria-label="Toggle notification sound">
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <span className="text-xs text-white/45">{unread} unread</span>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length ? (
              notifications.map((item) => {
                const content = (
                  <div className={`border-b border-[#143b28] px-4 py-3 transition hover:bg-white/5 ${item.read ? "opacity-65" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      {!item.read ? <span className="mt-1 h-2 w-2 rounded-full bg-[#20dc73]" /> : null}
                    </div>
                    <span className={`mt-2 inline-flex rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${typeClass[item.type] || typeClass.system}`}>{item.type}</span>
                    {item.message ? <p className="mt-1 text-xs text-white/55">{item.message}</p> : null}
                    <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-white/35">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                )

                return item.case_id ? (
                  <Link key={item.id} href={`/cases/${item.case_id}`} onClick={() => markRead(item.id)}>
                    {content}
                  </Link>
                ) : (
                  <button key={item.id} onClick={() => markRead(item.id)} className="block w-full text-left">
                    {content}
                  </button>
                )
              })
            ) : (
              <div className="px-4 py-8 text-center text-sm text-white/45">No notifications yet.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
