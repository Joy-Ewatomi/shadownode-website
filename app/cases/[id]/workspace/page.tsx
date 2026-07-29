"use client"

import Timeline from "@/components/cases/Timeline"
import EvidencePanel from "@/components/evidence/EvidencePanel"
import InvestigationWorkspaceFoundation from "@/components/investigation/InvestigationWorkspaceFoundation"
import ReportBuilder from "@/components/reports/ReportBuilder"
import { FileText, MessageSquare, ShieldCheck, Upload } from "lucide-react"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

type DashboardData = {
  case_id: string
  statistics?: {
    entities: number
    relationships: number
    evidence: number
    updates: number
    notes: number
    assigned_investigators: number
  }
}

export default function InvestigatorCaseWorkspace() {
  const params = useParams()
  const caseId = String(params.id)
  const [data, setData] = useState<DashboardData | null>(null)
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/cases/${caseId}/dashboard`, { credentials: "include" })
      if (res.ok) setData(await res.json())
    }
    if (caseId) load()
  }, [caseId])

  async function sendMessage() {
    if (!message.trim()) return
    const res = await fetch("/api/messages", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId, message: message.trim() }),
    })
    if (res.ok) {
      setMessage("")
      setSent(true)
    }
  }

  const stats = data?.statistics

  return (
    <main className="space-y-6">
      <header className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Investigator Workspace</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Case Operations Workspace</h1>
        <p className="mt-1 text-sm text-white/50">Case ID: {caseId}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <WorkspaceCard icon={ShieldCheck} label="Assignments" value={stats?.assigned_investigators ?? 0} />
        <WorkspaceCard icon={Upload} label="Evidence" value={stats?.evidence ?? 0} />
        <WorkspaceCard icon={FileText} label="Updates" value={stats?.updates ?? 0} />
        <WorkspaceCard icon={MessageSquare} label="Notes" value={stats?.notes ?? 0} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Timeline caseId={caseId} />

        <aside className="space-y-4">
          <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
            <h2 className="font-semibold text-white">Assignment Information</h2>
            <p className="mt-2 text-sm text-white/55">Normalized role assignments, acceptance state, notes, and deadlines are tracked by Mission Control and surfaced in operator dashboards.</p>
          </div>

          <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
            <h2 className="font-semibold text-white">Evidence Section</h2>
            <p className="mt-2 text-sm text-white/55">{stats?.evidence ?? 0} evidence files currently linked to this case.</p>
          </div>

          <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
            <h2 className="font-semibold text-white">Reports Section</h2>
            <p className="mt-2 text-sm text-white/55">Draft, review, and final report modules attach to the investigation timeline when published.</p>
          </div>
        </aside>
      </section>

      <EvidencePanel caseId={caseId} />
      <InvestigationWorkspaceFoundation caseId={caseId} />
      <ReportBuilder caseId={caseId} />

      <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
        <h2 className="font-semibold text-white">Team Chat</h2>
        <p className="mt-1 text-sm text-white/45">Start or continue a secure case-linked conversation.</p>
        <div className="mt-4 flex gap-3">
          <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message the case team..." className="h-11 flex-1 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/60" />
          <button onClick={sendMessage} className="rounded-md bg-[#20dc73] px-4 font-bold text-black">Send</button>
        </div>
        {sent ? <p className="mt-3 text-sm text-[#20dc73]">Message sent to the case conversation.</p> : null}
      </section>
    </main>
  )
}

function WorkspaceCard({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
      <Icon className="h-5 w-5 text-[#20dc73]" />
      <p className="mt-4 text-sm text-white/50">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[#20dc73]">{value}</p>
    </div>
  )
}
