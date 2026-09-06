"use client"

import { useEffect, useState } from "react"

type CalendarStatus = {
  connected: boolean
  provider: string | null
  email: string | null
  calendarId: string | null
}

const EMPTY_STATUS: CalendarStatus = {
  connected: false,
  provider: null,
  email: null,
  calendarId: null,
}

export default function GoogleCalendarConnection() {
  const [status, setStatus] =
    useState<CalendarStatus>(EMPTY_STATUS)

  const [loading, setLoading] =
    useState(true)

  const [disconnecting, setDisconnecting] =
    useState(false)

  const [error, setError] =
    useState("")

  async function loadStatus() {
    try {
      setLoading(true)
      setError("")

      const response = await fetch(
        "/api/calendar/status",
        {
          credentials: "include",
          cache: "no-store",
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load calendar status",
        )
      }

      setStatus({
        connected: Boolean(data.connected),
        provider: data.provider || null,
        email: data.email || null,
        calendarId: data.calendarId || null,
      })
    } catch (err) {
      console.error(
        "CALENDAR STATUS ERROR:",
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load calendar status",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [])

  async function disconnect() {
    const confirmed = window.confirm(
      "Disconnect your Google Calendar from ShadowNode?",
    )

    if (!confirmed) {
      return
    }

    try {
      setDisconnecting(true)
      setError("")

      const response = await fetch(
        "/api/calendar/google/disconnect",
        {
          method: "POST",
          credentials: "include",
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to disconnect Google Calendar",
        )
      }

      setStatus(EMPTY_STATUS)
    } catch (err) {
      console.error(
        "CALENDAR DISCONNECT ERROR:",
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : "Failed to disconnect Google Calendar",
      )
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-5">
        <div className="animate-pulse">
          <div className="h-4 w-40 rounded bg-white/10" />

          <div className="mt-3 h-3 w-64 rounded bg-white/5" />
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">
            Google Calendar
          </h3>

          <p className="mt-1 text-sm text-white/50">
            Automatically add your ShadowNode
            training sessions to your Google Calendar.
          </p>
        </div>

        <div
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            status.connected
              ? "border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"
              : "border-white/10 bg-white/5 text-white/50"
          }`}
        >
          {status.connected
            ? "Connected"
            : "Not connected"}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {status.connected ? (
        <div className="mt-5">
          <div className="rounded-lg border border-[#143b28] bg-[#06150d]/80 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#20dc73]/10 text-[#20dc73]">
                ✓
              </div>

              <div>
                <p className="text-sm font-medium text-white">
                  Google Calendar connected
                </p>

                {status.email && (
                  <p className="mt-0.5 text-xs text-white/45">
                    {status.email}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 h-px bg-[#143b28]/80" />

            <p className="mt-4 text-xs leading-5 text-white/45">
              New training sessions will be synchronized
              automatically. Rescheduled sessions will be
              updated and cancelled sessions will be removed
              from your Google Calendar.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={disconnecting}
            className="mt-4 rounded-lg border border-red-500/20 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {disconnecting
              ? "Disconnecting..."
              : "Disconnect Google Calendar"}
          </button>
        </div>
      ) : (
        <div className="mt-5">
          <div className="rounded-lg border border-[#143b28] bg-[#06150d]/70 p-4">
            <p className="text-sm text-white/70">
              Connect your Google Calendar so scheduled
              cybersecurity training sessions appear
              automatically.
            </p>

            <ul className="mt-3 space-y-2 text-xs text-white/45">
              <li>
                ✓ Sessions are added automatically
              </li>

              <li>
                ✓ Reschedules update the calendar event
              </li>

              <li>
                ✓ Cancellations remove the event
              </li>

              <li>
                ✓ Your Google tokens are encrypted
                before storage
              </li>
            </ul>
          </div>

          <a
            href="/api/calendar/google/connect"
            className="mt-4 inline-flex items-center rounded-lg bg-[#20dc73] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#20dc73]/90"
          >
            Connect Google Calendar
          </a>
        </div>
      )}
    </section>
  )
}