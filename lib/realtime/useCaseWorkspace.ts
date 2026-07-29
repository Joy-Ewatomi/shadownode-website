"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { CaseWorkspaceEventPayload, CaseWorkspaceEventType } from "./workspace-events"

export type CaseWorkspacePresenceUser = {
  user_id: string
  username: string
  role: string
  online_at: string
}

export type CaseWorkspaceCallbacks = Partial<{
  [Type in CaseWorkspaceEventType]: (event: CaseWorkspaceEventPayload<Type>) => void
}> & {
  onEvent?: (event: CaseWorkspaceEventPayload) => void
}

type AuthMeResponse = {
  user?: {
    id?: string
    username?: string
    role?: string
  } | null
}

async function currentPresenceUser(): Promise<CaseWorkspacePresenceUser> {
  const res = await fetch("/api/auth/me", { credentials: "include" }).catch(() => null)
  const data = res?.ok ? ((await res.json().catch(() => ({}))) as AuthMeResponse) : {}
  const user = data.user

  return {
    user_id: user?.id ?? "anonymous",
    username: user?.username ?? "Operator",
    role: user?.role ?? "workspace",
    online_at: new Date().toISOString(),
  }
}

export function useCaseWorkspace(caseId: string, callbacks: CaseWorkspaceCallbacks = {}) {
  const [events, setEvents] = useState<CaseWorkspaceEventPayload[]>([])
  const [presence, setPresence] = useState<CaseWorkspacePresenceUser[]>([])
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "unavailable" | "closed">("idle")

  useEffect(() => {
    if (!caseId || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setStatus("unavailable")
      return
    }

    let active = true
    setStatus("connecting")

    const supabase = createClient()
    const channel = supabase.channel(`case-workspace:${caseId}`, {
      config: { broadcast: { self: false }, presence: { key: crypto.randomUUID() } },
    })

    function syncPresence() {
      const state = channel.presenceState<CaseWorkspacePresenceUser>()
      const users = Object.values(state).flat().filter((user) => user.user_id)
      const unique = new Map<string, CaseWorkspacePresenceUser>()
      users.forEach((user) => unique.set(user.user_id, user))
      setPresence(Array.from(unique.values()).sort((a, b) => a.username.localeCompare(b.username)))
    }

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .on("broadcast", { event: "workspace.event" }, ({ payload }) => {
        const event = payload as CaseWorkspaceEventPayload
        setEvents((current) => [event, ...current].slice(0, 50))
        callbacks.onEvent?.(event)
        const typedCallback = callbacks[event.type] as ((event: CaseWorkspaceEventPayload) => void) | undefined
        typedCallback?.(event)
      })
      .subscribe(async (nextStatus) => {
        if (!active) return
        if (nextStatus === "SUBSCRIBED") {
          setStatus("connected")
          await channel.track(await currentPresenceUser())
        } else if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") {
          setStatus("unavailable")
        }
      })

    return () => {
      active = false
      setStatus("closed")
      supabase.removeChannel(channel)
    }
  }, [callbacks, caseId])

  return { events, presence, status }
}
