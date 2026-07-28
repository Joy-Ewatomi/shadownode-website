"use client"

import { BarChart3, ClipboardList, FileText, Plus, UserPlus } from "lucide-react"
import Link from "next/link"

const actions = [
  { label: "New Case", href: "/admin/cases", icon: Plus },
  { label: "Review Requests", href: "/admin/requests", icon: ClipboardList },
  { label: "Assign Investigator", href: "/admin/cases", icon: UserPlus },
  { label: "Generate Report", href: "/dashboard/reports", icon: FileText },
  { label: "Mission Analytics", href: "/admin/mission-control", icon: BarChart3 },
]

export default function QuickActions() {
  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
      <h2 className="font-semibold text-white">Quick Actions</h2>
      <div className="mt-4 grid gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.label} href={action.href} className="inline-flex h-10 items-center gap-2 rounded border border-[#20dc73]/30 px-3 text-sm text-[#20dc73] hover:bg-[#20dc73]/10">
              <Icon className="h-4 w-4" />
              {action.label}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
