"use client"

import type { AppUser } from "@/lib/auth"
import { Menu, Search } from "lucide-react"
import NotificationBell from "./NotificationBell"
import UserMenu from "./UserMenu"

const roleLabels: Record<string, string> = {
  client: "Client",
  staff: "Staff",
  investigator: "Investigator",
  analyst: "Analyst",
  administrator: "Administrator",
  super_administrator: "Super Administrator",
}

export default function Header({
  user,
  onMenuClick,
}: {
  user: AppUser
  onMenuClick: () => void
}) {
  return (
    <header className="z-30 shrink-0 border-b border-[#143b28] bg-[#030806]/92 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onMenuClick} className="rounded-md p-2 text-white/65 hover:bg-white/5 hover:text-white lg:hidden" aria-label="Open sidebar">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden min-w-0 items-center gap-3 rounded-md border border-[#143b28] bg-black/25 px-3 py-2 md:flex">
            <Search className="h-4 w-4 text-[#20dc73]" />
            <span className="text-sm text-white/42">Search operations, cases, reports...</span>
          </div>
          <div className="md:hidden">
            <p className="font-mono text-sm text-[#20dc73]">SHADOWNODE</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded border border-[#20dc73]/25 bg-[#20dc73]/10 px-2 py-1 text-xs text-[#20dc73] sm:inline-flex">
            {roleLabels[user.role] || user.role}
          </span>
          <NotificationBell userRole={user.role} />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}
