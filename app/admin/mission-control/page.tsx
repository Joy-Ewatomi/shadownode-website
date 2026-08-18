"use client"

import ActiveCases from "@/components/mission-control/ActiveCases"
import CriticalAlerts from "@/components/mission-control/CriticalAlerts"
import MissionStats from "@/components/mission-control/MissionStats"
import PendingRequests from "@/components/mission-control/PendingRequests"
import QuickActions from "@/components/mission-control/QuickActions"
import RecentActivity from "@/components/mission-control/RecentActivity"
import QuoteReviews from "@/components/mission-control/QuoteReviews"
import TeamStatus from "@/components/mission-control/TeamStatus"
import { useEffect, useState } from "react"

type MissionControlData = {
  user_role?: string

  statistics: {
    active_cases: number
    high_priority_cases: number
    pending_client_requests: number
    published_reports: number
    investigators_online: number
    evidence_uploaded_today: number
  }

  recent_activity: any[]
  active_cases: any[]
  pending_requests: any[]
  pending_reports: any[]
  pending_invoices: any[]
  investigator_workload: any[]
  notifications: any[]
  alerts: any[]
  quote_reviews: any[]
}

const emptyData: MissionControlData = {
  user_role: undefined,

  statistics: {
    active_cases: 0,
    high_priority_cases: 0,
    pending_client_requests: 0,
    published_reports: 0,
    investigators_online: 0,
    evidence_uploaded_today: 0,
  },

  recent_activity: [],
  active_cases: [],
  pending_requests: [],
  pending_reports: [],
  pending_invoices: [],
  investigator_workload: [],
  notifications: [],
  alerts: [],
  quote_reviews: [],
}

export default function MissionControlPage() {
  const [data, setData] = useState<MissionControlData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/admin/mission-control", { credentials: "include" })
      if (response.ok) {
        setData(await response.json())
      } else {
        const payload = await response.json().catch(() => ({}))
        setError(payload.error || "Mission Control unavailable")
      }
      setLoading(false)
    }

    load()
  }, [])

  async function reload() {
    setLoading(true)
    const response = await fetch("/api/admin/mission-control", { credentials: "include" })
    if (response.ok) setData(await response.json())
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#020604] p-6 text-white">
      <header className="mb-6 border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Mission Control</p>
        <h1 className="mt-2 text-3xl font-bold">ShadowNode Operations Bureau</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/55">Bureau-wide operational posture, approvals, case load, alerts, and team workload.</p>
      </header>

      {loading ? <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5 text-sm text-white/45">Loading Mission Control...</div> : null}
      {error ? <div className="rounded-md border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{error}</div> : null}

      {!loading && !error ? (
        <div className="space-y-6">
          <MissionStats statistics={data.statistics} />

          <section className="grid gap-6 xl:grid-cols-[1fr_24rem]">
            <div className="space-y-6">
              <RecentActivity items={data.recent_activity} />
              <QuoteReviews reviews={data.quote_reviews} onUpdated={reload} />
              <ActiveCases cases={data.active_cases} />
              <PendingRequests requests={data.pending_requests} />
            </div>

            <aside className="space-y-6">
              <CriticalAlerts alerts={data.alerts} notifications={data.notifications} pendingInvoices={data.pending_invoices} />
              <QuickActions />
              {data.pending_reports.length ? (
                <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
                  <h2 className="font-semibold text-white">Pending Reports</h2>
                  <p className="mt-3 text-sm text-white/45">{data.pending_reports.length} reports pending review.</p>
                </section>
              ) : null}
            </aside>
          </section>

          <TeamStatus members={data.investigator_workload} />
        </div>
      ) : null}
    </main>
  )
}
