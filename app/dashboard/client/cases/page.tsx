"use client"

import { BriefcaseBusiness, RefreshCcw, Shield } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useClientNotifications } from "@/components/notifications/ClientNotificationProvider"

type ClientCase = {
  id: string
  case_number: string
  title: string
  status: string | null
  priority: string | null
  progress: number | null
  estimated_completion: string | null
  created_at: string
}

export default function ClientCasesPage() {
  const [cases, setCases] = useState<ClientCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { getUnreadForResource } = useClientNotifications()

  async function load() {
    setLoading(true)
    const res = await fetch("/api/client/dashboard", { credentials: "include" })
    if (res.ok) {
      const data = await res.json()
      setCases(data.cases || [])
      setError("")
    } else {
      setError("Failed to load cases")
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const statusColor: Record<string, string> = {
    active: "border-green-500/40 bg-green-500/10 text-green-300",
    pending: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
    completed: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    archived: "border-white/20 bg-white/5 text-white/45",
    review: "border-purple-500/40 bg-purple-500/10 text-purple-300",
  }

  const priorityLabel: Record<string, string> = {
    critical: "Critical",
    high: "High",
    normal: "Normal",
    low: "Low",
  }

  const priorityColor: Record<string, string> = {
    critical: "border-red-500/30 bg-red-500/10 text-red-200",
    high: "border-orange-500/30 bg-orange-500/10 text-orange-200",
    normal: "border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]",
    low: "border-white/20 bg-white/5 text-white/45",
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Client Operations</p>
          <h1 className="mt-2 text-3xl font-bold text-white">My Cases</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/55">
            Review all active, pending, and completed investigation cases linked to your account.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex h-10 items-center gap-2 rounded border border-[#20dc73]/40 px-3 text-sm text-[#20dc73]"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </header>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-8 text-sm text-white/45">
          Loading cases...
        </div>
      ) : null}

      {!loading && !cases.length && !error ? (
        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-8 text-center">
          <BriefcaseBusiness className="mx-auto h-8 w-8 text-[#20dc73]" />
          <p className="mt-3 text-sm text-white/45">No active cases yet.</p>
          <p className="mt-1 text-xs text-white/30">Cases are created when a request is approved and investigation begins.</p>
        </div>
      ) : null}

      {!loading && cases.length ? (
        <section className="grid gap-4 md:grid-cols-2">
          {cases.map((c) => {
            const unread = getUnreadForResource("case", c.id)

            return (
            <Link
              key={c.id}
              href={`/dashboard/client/cases/${c.id}`}
              className={`group rounded-md border bg-[#06110f] p-5 transition hover:border-[#20dc73]/30 hover:bg-[#20dc73]/5 ${
                unread > 0
                  ? "border-[#20dc73]/40 bg-[#20dc73]/5"
                  : "border-[#143b28]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 text-[#20dc73]" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white group-hover:text-[#20dc73]">{c.title}</p>
                      {unread > 0 && (
                        <span className="inline-flex items-center gap-1 rounded border border-[#20dc73]/40 bg-[#20dc73]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#20dc73]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#20dc73]" />
                          NEW{unread > 1 ? ` ${unread}` : ""}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-white/40">{c.case_number}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded border px-2 py-1 text-[11px] uppercase tracking-[0.08em] ${
                    statusColor[c.status || ""] || statusColor.pending
                  }`}
                >
                  {c.status || "pending"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                {c.priority ? (
                  <span
                    className={`inline-flex rounded border px-2 py-0.5 ${
                      priorityColor[c.priority] || priorityColor.normal
                    }`}
                  >
                    {priorityLabel[c.priority] || c.priority}
                  </span>
                ) : null}
                {c.progress !== null ? (
                  <span className="text-[#20dc73]">{c.progress}% complete</span>
                ) : null}
                <span className="text-white/35">
                  Created {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>

              {c.progress !== null ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#143b28]">
                  <div
                    className="h-full rounded-full bg-[#20dc73] transition-all"
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
              ) : null}
            </Link>
          )})}
        </section>
      ) : null}
    </div>
  )
}
