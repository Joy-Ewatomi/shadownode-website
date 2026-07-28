"use client"

import { Activity, AlertTriangle, Clock, FileText, MessageSquare, ShieldCheck, Users } from "lucide-react"
import { useEffect, useState } from "react"

type Metric = {
  key: string
  label: string
  value: string
  helper: string
}

type QueueItem = {
  title: string
  detail: string
  status: string
}

const iconMap = [ShieldCheck, Clock, MessageSquare, FileText, Activity, Users, AlertTriangle]

export default function RoleDashboard({
  eyebrow,
  title,
  description,
  metrics,
  queueTitle,
  queueItems,
}: {
  eyebrow: string
  title: string
  description: string
  metrics: Metric[]
  queueTitle: string
  queueItems: QueueItem[]
}) {
  const [data, setData] = useState<Record<string, string | number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/overview", { credentials: "include" })
        if (!res.ok) throw new Error("Dashboard overview unavailable")
        setData(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Dashboard overview unavailable")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-white">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/55">{description}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = iconMap[index % iconMap.length]
          return (
            <div key={metric.label} className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
              <Icon className="h-5 w-5 text-[#20dc73]" />
              <p className="mt-4 text-sm text-white/50">{metric.label}</p>
              <p className="mt-1 text-3xl font-bold text-[#20dc73]">{loading ? "..." : data?.[metric.key] ?? metric.value}</p>
              <p className="mt-2 text-xs text-white/38">{metric.helper}</p>
            </div>
          )
        })}
      </section>

      {error ? <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-md border border-[#143b28] bg-[#06110f]">
          <div className="border-b border-[#143b28] px-5 py-4">
            <h2 className="font-semibold text-white">{queueTitle}</h2>
          </div>
          <div className="divide-y divide-[#143b28]">
            {queueItems.map((item) => (
              <div key={item.title} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-white/45">{item.detail}</p>
                </div>
                <span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs text-[#20dc73]">{item.status}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Operating Notice</p>
          <p className="mt-3 text-sm leading-6 text-white/58">
            This dashboard is prepared for live widgets. Case counts, workload charts, and role-specific queues can now plug into the shared operating system without changing page structure.
          </p>
        </aside>
      </section>
    </div>
  )
}
