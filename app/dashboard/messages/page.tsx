"use client"

import { Send } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type Message = {
  id: string
  sender_id: string
  sender_name: string | null
  message: string
  created_at: string
  read_at: string | null
}

type Conversation = {
  id: string
  case_id: string | null
  case_number: string | null
  case_title: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  messages: Message[]
}

export default function DashboardMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch("/api/messages", { credentials: "include" })
    if (res.ok) {
      const data = await res.json()
      setConversations(data)
      setSelectedId((current) => current || data[0]?.id || "")
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const selected = useMemo(() => conversations.find((item) => item.id === selectedId) || conversations[0], [conversations, selectedId])

  useEffect(() => {
    if (selected?.id) {
      fetch("/api/messages", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: selected.id }),
      }).catch(() => undefined)
    }
  }, [selected?.id])

  async function send() {
    if (!selected || !draft.trim()) return
    await fetch("/api/messages", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: selected.id, case_id: selected.case_id, message: draft.trim() }),
    })
    setDraft("")
    await load()
  }

  return (
    <div className="grid min-h-[calc(100vh-8rem)] gap-5 lg:grid-cols-[22rem_1fr]">
      <aside className="rounded-md border border-[#143b28] bg-[#06110f]">
        <div className="border-b border-[#143b28] px-5 py-4">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Team Chat</p>
          <h1 className="mt-1 text-xl font-bold text-white">Messages</h1>
        </div>
        <div className="divide-y divide-[#143b28]">
          {loading ? <p className="p-5 text-sm text-white/45">Loading conversations...</p> : null}
          {!loading && !conversations.length ? <p className="p-5 text-sm text-white/45">No conversations yet.</p> : null}
          {conversations.map((conversation) => (
            <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`block w-full p-4 text-left transition hover:bg-white/5 ${selected?.id === conversation.id ? "bg-[#20dc73]/10" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all font-medium text-white">{conversation.case_number || "General Conversation"}</p>
                  <p className="mt-1 break-words text-xs text-white/45">{conversation.case_title || conversation.last_message || "No messages yet"}</p>
                </div>
                {conversation.unread_count ? <span className="rounded-full bg-[#20dc73] px-2 py-0.5 text-xs font-bold text-black">{conversation.unread_count}</span> : null}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col rounded-md border border-[#143b28] bg-[#06110f]">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4">
              <div className="min-w-0">
                <h2 className="break-all font-semibold text-white">{selected.case_number || "Conversation"}</h2>
                <p className="break-words text-sm text-white/45">{selected.case_title || "Secure bureau channel"}</p>
              </div>
              {selected.case_id ? <Link href={`/cases/${selected.case_id}`} className="rounded border border-[#20dc73]/40 px-3 py-2 text-sm text-[#20dc73]">Open Case</Link> : null}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {selected.messages.map((message) => (
                <div key={message.id} className="rounded-md border border-[#143b28] bg-black/30 p-3">
                  <div className="flex justify-between gap-3 text-xs text-white/40">
                    <span>{message.sender_name || "Operator"}</span>
                    <time>{new Date(message.created_at).toLocaleString()}</time>
                  </div>
                  <p className="mt-2 whitespace-normal break-words text-sm text-white/80">{message.message}</p>
                </div>
              ))}
              {!selected.messages.length ? <p className="text-sm text-white/45">No messages in this conversation.</p> : null}
            </div>
            <div className="flex gap-3 border-t border-[#143b28] p-4">
              <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} placeholder="Write a secure message..." className="h-11 flex-1 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/60" />
              <button onClick={send} className="inline-flex h-11 items-center gap-2 rounded-md bg-[#20dc73] px-4 font-bold text-black">
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-white/45">Select a conversation.</div>
        )}
      </section>
    </div>
  )
}
