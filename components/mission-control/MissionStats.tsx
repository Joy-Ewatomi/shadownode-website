"use client"

import { AlertTriangle, FileText, ShieldCheck, Upload, UserCheck, Workflow } from "lucide-react"

type Statistics = {
  active_cases: number
  high_priority_cases: number
  pending_client_requests: number
  published_reports: number
  investigators_online: number
  evidence_uploaded_today: number
}

const items = [
  { key: "active_cases", label: "Active Cases", icon: ShieldCheck },
  { key: "high_priority_cases", label: "High Priority Cases", icon: AlertTriangle },
  { key: "pending_client_requests", label: "Pending Client Requests", icon: Workflow },
  { key: "published_reports", label: "Published Reports", icon: FileText },
  { key: "investigators_online", label: "Investigators Online", icon: UserCheck },
  { key: "evidence_uploaded_today", label: "Evidence Uploaded Today", icon: Upload },
] as const

export default function MissionStats({ statistics }: { statistics: Statistics }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.key} className="rounded-md border border-[#143b28] bg-[#06110f] p-4">
            <Icon className="h-5 w-5 text-[#20dc73]" />
            <p className="mt-4 text-xs text-white/45">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-[#20dc73]">{statistics[item.key] ?? 0}</p>
          </div>
        )
      })}
    </section>
  )
}
