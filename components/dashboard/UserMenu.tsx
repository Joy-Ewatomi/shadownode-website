"use client"

import type { AppUser } from "@/lib/auth"
import { LogOut, Shield, UserRound } from "lucide-react"
import { useState } from "react"

export default function UserMenu({ user }: { user: AppUser }) {
  const [open, setOpen] = useState(false)

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    window.location.href = "/login"
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-md border border-[#143b28] bg-[#06110f] text-[#20dc73] hover:border-[#20dc73]/50" aria-label="User menu">
        <UserRound className="h-5 w-5" />
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-64 rounded-md border border-[#143b28] bg-[#06110f] p-2 shadow-2xl">
          <div className="border-b border-[#143b28] p-3">
            <p className="font-semibold text-white">{user.username}</p>
            <p className="truncate text-xs text-white/45">{user.email}</p>
          </div>
          <a href="/security" className="mt-2 flex items-center gap-2 rounded px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
            <Shield className="h-4 w-4" />
            Security Settings
          </a>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  )
}
