import { createClient } from "@supabase/supabase-js"

export const caseWorkspaceEventTypes = [
  "entity.created",
  "entity.updated",
  "entity.deleted",
  "relationship.created",
  "relationship.deleted",
  "observation.created",
  "observation.updated",
  "evidence.uploaded",
  "evidence.deleted",
  "timeline.created",
  "report.created",
  "report.published",
  "case.updated",
] as const

export type CaseWorkspaceEventType = (typeof caseWorkspaceEventTypes)[number]

export type CaseWorkspaceEventPayload<T extends CaseWorkspaceEventType = CaseWorkspaceEventType> = {
  type: T
  case_id: string
  actor_id: string | null
  record_id?: string | null
  occurred_at: string
  data?: Record<string, unknown>
}

let realtimeClient: ReturnType<typeof createClient> | null | undefined

function getRealtimeClient() {
  if (realtimeClient !== undefined) return realtimeClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    realtimeClient = null
    return realtimeClient
  }

  realtimeClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return realtimeClient
}

export async function emitCaseWorkspaceEvent<T extends CaseWorkspaceEventType>(
  event: Omit<CaseWorkspaceEventPayload<T>, "occurred_at"> & { occurred_at?: string },
) {
  const payload: CaseWorkspaceEventPayload<T> = {
    ...event,
    occurred_at: event.occurred_at ?? new Date().toISOString(),
  }

  const client = getRealtimeClient()
  if (!client) return { delivered: false, payload }

  const channel = client.channel(`case-workspace:${payload.case_id}`, {
    config: { broadcast: { self: false }, presence: { key: "server" } },
  })

  await new Promise<void>((resolve) => {
    channel.subscribe(() => resolve())
    setTimeout(resolve, 800)
  })

  await channel.send({
    type: "broadcast",
    event: "workspace.event",
    payload,
  })
  await client.removeChannel(channel)

  return { delivered: true, payload }
}
