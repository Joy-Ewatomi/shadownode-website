"use client"

import { useEffect, useState } from "react"

type Notification = {
  id: string
  title: string
  message: string | null
  type: string
  read: boolean
  created_at: string
  case_id: string | null
  metadata: Record<string, unknown> | null
  recipient_id?: string
  recipient_name?: string | null
  recipient_email?: string | null
  recipient_role?: string | null
}

export default function Page() {
  const [notifications, setNotifications] = useState<
    Notification[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load notifications",
          )
        }

        setNotifications(
          Array.isArray(data) ? data : [],
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

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}

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

          {/* VIEW ONLY */}

          <div className="rounded-md border border-[#20dc73]/30 bg-[#06110f] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#20dc73]">
              Access Level
            </p>

            <p className="mt-1 text-sm font-semibold text-white">
              View Only
            </p>

            <p className="mt-1 text-xs text-white/40">
              Notifications cannot be modified.
            </p>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6 text-sm text-white/50">
            Loading notifications...
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          notifications.length === 0 && (
            <div className="rounded-md border border-[#143b28] bg-[#06110f] p-8 text-center">
              <p className="text-sm text-white/50">
                No notifications available.
              </p>
            </div>
          )}

        {/* NOTIFICATIONS */}

        {!loading &&
          notifications.length > 0 && (
            <div className="space-y-3">
              {notifications.map(
                (notification) => (
                  <div
                    key={notification.id}
                    className="rounded-md border border-[#143b28] bg-[#06110f] p-5"
                  >
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
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[10px] uppercase tracking-wider text-white/30">
                          {notification.type}
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

                    {/* SUPER ADMIN READ-ONLY NOTICE */}

                    <div className="mt-4 border-t border-[#143b28] pt-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">
                        Read-only record
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
      </div>
    </main>
  )
}