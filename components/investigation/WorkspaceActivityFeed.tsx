"use client"

import { Activity } from "lucide-react"
import type { CaseWorkspaceEventPayload } from "@/lib/realtime/workspace-events"

function eventLabel(event: CaseWorkspaceEventPayload) {
  const title = typeof event.data?.title === "string" ? event.data.title : null
  const name = typeof event.data?.name === "string" ? event.data.name : null
  const fileName = typeof event.data?.file_name === "string" ? event.data.file_name : null
  return title || name || fileName || event.record_id || "Workspace event"
}

export default function WorkspaceActivityFeed({ events }: { events: CaseWorkspaceEventPayload[] }) {
  return (
    <div className="rounded-md border border-[#143b28] bg-black/20 p-4">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#20dc73]">
        <Activity className="h-4 w-4" />
        Live Activity
      </p>
      <div className="mt-3 space-y-2">
        {events.length ? events.slice(0, 8).map((event) => (
          <div key={`${event.type}-${event.record_id || "event"}-${event.occurred_at}`} className="rounded border border-[#143b28] bg-[#06110f] p-3">
            <p className="text-xs font-semibold text-white">{event.type}</p>
            <p className="mt-1 text-xs text-white/50">{eventLabel(event)}</p>
            <time className="mt-1 block text-xs text-[#20dc73]/75">{new Date(event.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
          </div>
        )) : <p className="text-xs text-white/40">Live workspace events will appear here.</p>}
      </div>
    </div>
  )
}
