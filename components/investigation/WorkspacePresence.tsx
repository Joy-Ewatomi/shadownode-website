"use client"

import { UsersRound } from "lucide-react"
import type { CaseWorkspacePresenceUser } from "@/lib/realtime/useCaseWorkspace"

export default function WorkspacePresence({
  users,
  status,
}: {
  users: CaseWorkspacePresenceUser[]
  status: "idle" | "connecting" | "connected" | "unavailable" | "closed"
}) {
  return (
    <div className="rounded-md border border-[#143b28] bg-black/20 p-4">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#20dc73]">
        <UsersRound className="h-4 w-4" />
        Presence
      </p>
      <p className="mt-2 text-xs text-white/40">{status === "connected" ? `${users.length} connected` : `Realtime ${status}`}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {users.length ? users.map((user) => (
          <span key={user.user_id} className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-white/70">
            {user.username} · {user.role}
          </span>
        )) : <span className="text-xs text-white/40">No active workspace peers detected.</span>}
      </div>
    </div>
  )
}
