"use client"

import { Bell, BriefcaseBusiness, FileText, RefreshCcw } from "lucide-react"
import { useEffect, useState } from "react"
import RequestStatusBadge from "@/components/quote/RequestStatusBadge"

export default function ClientDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    const response = await fetch("/api/client/dashboard", { credentials: "include" })
    if (response.ok) {
      setData(await response.json())
      setError("")
    } else {
      setError("Client dashboard unavailable")
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const stats = data?.stats || {}

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Client Operations</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Client Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/55">Track active investigations, quote decisions, reports, and bureau notifications.</p>
        </div>
        <button onClick={load} className="inline-flex h-10 items-center gap-2 rounded border border-[#20dc73]/40 px-3 text-sm text-[#20dc73]"><RefreshCcw className="h-4 w-4" />Refresh</button>
      </header>

      {error ? <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Active Cases", stats.active_cases || 0, BriefcaseBusiness],
          ["Open Requests", stats.open_requests || 0, FileText],
          ["Reports", stats.reports_available || 0, FileText],
          ["Notifications", stats.unread_notifications || 0, Bell],
        ].map(([label, value, Icon]: any) => (
          <div key={label} className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
            <Icon className="h-5 w-5 text-[#20dc73]" />
            <p className="mt-4 text-sm text-white/50">{label}</p>
            <p className="mt-1 text-3xl font-bold text-[#20dc73]">{loading ? "..." : value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Requests" items={data?.requests || []} empty="No requests yet." />
        <Panel title="Cases" items={data?.cases || []} empty="No active cases yet." />
        <Panel title="Reports" items={data?.reports || []} empty="No reports published yet." />
        <Panel title="Notifications" items={data?.notifications || []} empty="No notifications yet." />
      </section>
    </div>
  )
}

function Panel({ title, items, empty }: { title: string; items: any[]; empty: string }) {
  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f]">
      <div className="border-b border-[#143b28] px-5 py-4">
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      <div className="divide-y divide-[#143b28]">
        {!items.length ? <p className="p-5 text-sm text-white/45">{empty}</p> : null}
        {items.map((item) => (
          <article key={item.id} className="px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">{item.title || item.case_number || item.type}</p>
                <p className="mt-1 text-sm text-white/45">{item.message || item.summary || item.case_number || item.priority || ""}</p>
              </div>
              {item.status ? <RequestStatusBadge status={item.status} /> : null}
            </div>
            {item.progress !== undefined ? <p className="mt-3 text-xs text-[#20dc73]">Progress: {item.progress || 0}%</p> : null}
            {item.approved_quote_amount ? <p className="mt-3 text-xs text-[#20dc73]">Quote: {item.approved_quote_currency || "NGN"} {item.approved_quote_amount}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}
