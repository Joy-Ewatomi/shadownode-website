"use client"

import ClientCaseHeader from "@/components/client/ClientCaseHeader"
import ClientReports from "@/components/client/ClientReports"
import ClientTimeline from "@/components/client/ClientTimeline"
import { Send } from "lucide-react"
import { useEffect, useState } from "react"

type Message = {
  id: string
  sender_id: string
  sender_name: string | null
  message: string
  created_at: string
  read_at: string | null
}

type ClientCasePayload = {
  case: {
    id: string
    case_number: string
    title: string
    description: string | null
    status: string | null
    priority: string | null
    created_at: string
    progress: number
  }
  timeline: {
    id: string
    update_type: string | null
    title: string | null
    content: string | null
    created_at: string
  }[]
  reports: {
    id: string
    title: string | null
    report_type: string | null
    status: string
    updated_at: string
  }[]
  message_summary: {
    id: string
    case_id: string
    unread_count: number
    messages: Message[]
  } | null
}

export default function ClientCasePortal({ caseId }: { caseId: string }) {
  const [data, setData] = useState<ClientCasePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [draft, setDraft] = useState("")

  async function load() {
    const res = await fetch(`/api/client/cases/${caseId}`, { credentials: "include" })
    if (res.ok) {
      setData(await res.json())
      setError("")
    } else {
      const payload = await res.json().catch(() => ({}))
      setError(payload.error || "Case unavailable")
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [caseId])

  useEffect(() => {
    if (data?.message_summary?.id) {
      fetch("/api/messages", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: data.message_summary.id }),
      }).catch(() => undefined)
    }
  }, [data?.message_summary?.id])

  async function sendMessage() {
    if (!data?.case.id || !draft.trim()) return

    await fetch("/api/messages", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: data.message_summary?.id,
        case_id: data.case.id,
        message: draft.trim(),
      }),
    })
    setDraft("")
    await load()
  }

  if (loading) {
    return <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5 text-sm text-white/45">Loading client case portal...</div>
  }

  if (error || !data) {
    return <div className="rounded-md border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{error || "Case unavailable"}</div>
  }

  return (
    <main className="space-y-6">
      <ClientCaseHeader caseInfo={data.case} />

      <section className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <ClientTimeline updates={data.timeline} />
          <ClientReports reports={data.reports} />
        </div>

        <aside className="flex min-h-[32rem] flex-col rounded-md border border-[#143b28] bg-[#06110f]">
          <div className="border-b border-[#143b28] px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Messages</p>
            <h2 className="mt-1 font-semibold text-white">Secure Case Channel</h2>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {data.message_summary?.messages?.length ? data.message_summary.messages.map((message) => (
              <article key={message.id} className="rounded-md border border-[#143b28] bg-black/25 p-3">
                <div className="flex justify-between gap-3 text-xs text-white/40">
                  <span>{message.sender_name || "Bureau"}</span>
                  <time>{new Date(message.created_at).toLocaleString()}</time>
                </div>
                <p className="mt-2 text-sm text-white/75">{message.message}</p>
              </article>
            )) : <p className="text-sm text-white/45">No messages have been sent for this case yet.</p>}
          </div>
          <div className="flex gap-3 border-t border-[#143b28] p-4">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && sendMessage()}
              placeholder="Write a secure message..."
              className="h-11 min-w-0 flex-1 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/60"
            />
            <button onClick={sendMessage} className="inline-flex h-11 items-center gap-2 rounded-md bg-[#20dc73] px-4 font-bold text-black">
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </aside>
      </section>
    </main>
  )
}
