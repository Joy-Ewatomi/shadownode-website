"use client"

import {
  AlertTriangle,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import {
  useEffect,
  useMemo,
  useState,
} from "react"

type Message = {
  id: string
  sender_id: string
  sender_name: string | null
  sender_username: string | null
  sender_role: string | null
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
  const [conversations, setConversations] =
    useState<Conversation[]>([])

  const [selectedId, setSelectedId] =
    useState("")

  const [draft, setDraft] =
    useState("")

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [sending, setSending] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const [sendError, setSendError] =
    useState<string | null>(null)

  async function load(refresh = false) {
    try {
      if (refresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)

      const response = await fetch(
        "/api/messages",
        {
          credentials: "include",
          cache: "no-store",
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to load conversations",
        )
      }

      const data = Array.isArray(result)
        ? result
        : []

      setConversations(data)

      setSelectedId((current) => {
        if (
          current &&
          data.some(
            (conversation: Conversation) =>
              conversation.id === current,
          )
        ) {
          return current
        }

        return data[0]?.id || ""
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load conversations",
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const selected = useMemo(
    () =>
      conversations.find(
        (item) =>
          item.id === selectedId,
      ) ||
      conversations[0] ||
      null,
    [conversations, selectedId],
  )

  useEffect(() => {
    if (!selected?.id) {
      return
    }

    fetch("/api/messages", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        conversation_id:
          selected.id,
      }),
    })
      .then(() => load(true))
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  async function send() {
    const message =
      draft.trim()

    if (
      !selected ||
      !message ||
      sending
    ) {
      return
    }

    try {
      setSending(true)
      setSendError(null)

      const response = await fetch(
        "/api/messages",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            conversation_id:
              selected.id,
            case_id:
              selected.case_id,
            message,
          }),
        },
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to send message",
        )
      }

      setDraft("")

      await load(true)
    } catch (err) {
      setSendError(
        err instanceof Error
          ? err.message
          : "Failed to send message",
      )
    } finally {
      setSending(false)
    }
  }

  function formatDate(
    value: string | null,
  ) {
    if (!value) {
      return ""
    }

    const date = new Date(value)

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return value
    }

    return date.toLocaleString(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    )
  }

  function senderName(
    message: Message,
  ) {
    return (
      message.sender_name?.trim() ||
      message.sender_username?.trim() ||
      "Operator"
    )
  }

  function senderRole(
    message: Message,
  ) {
    return (
      message.sender_role?.trim() ||
      "Operator"
    )
  }

  return (
    <div className="grid min-h-[calc(100vh-8rem)] gap-5 lg:grid-cols-[22rem_1fr]">
      <aside className="rounded-md border border-[#143b28] bg-[#06110f]">
        <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">
              Secure Communications
            </p>

            <h1 className="mt-1 text-xl font-bold text-white">
              Messages
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              load(true)
            }
            disabled={
              loading ||
              refreshing
            }
            className="rounded-md border border-[#254936] p-2 text-white/45 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            aria-label="Refresh conversations"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />
          </button>
        </div>

        {error ? (
          <div className="m-4 flex items-start gap-2 rounded-md border border-[#5f2828] bg-[#220d0d] p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8989]" />

            <p className="text-xs leading-5 text-[#ff8989]">
              {error}
            </p>
          </div>
        ) : null}

        <div className="divide-y divide-[#143b28]">
          {loading ? (
            <div className="flex items-center gap-2 p-5 text-sm text-white/45">
              <Loader2 className="h-4 w-4 animate-spin text-[#20dc73]" />
              Loading conversations...
            </div>
          ) : null}

          {!loading &&
          !conversations.length ? (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <MessageSquare className="h-7 w-7 text-white/15" />

              <p className="mt-3 text-sm text-white/45">
                No conversations yet.
              </p>

              <p className="mt-1 text-xs text-white/25">
                Case conversations will appear here
                when available.
              </p>
            </div>
          ) : null}

          {conversations.map(
            (conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() =>
                  setSelectedId(
                    conversation.id,
                  )
                }
                className={`block w-full p-4 text-left transition hover:bg-white/5 ${
                  selected?.id ===
                  conversation.id
                    ? "bg-[#20dc73]/10"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all font-medium text-white">
                      {conversation.case_number ||
                        "General Conversation"}
                    </p>

                    <p className="mt-1 break-words text-xs text-white/45">
                      {conversation.case_title ||
                        conversation.last_message ||
                        "No messages yet"}
                    </p>

                    {conversation.last_message_at ? (
                      <p className="mt-2 text-[10px] text-white/20">
                        {formatDate(
                          conversation.last_message_at,
                        )}
                      </p>
                    ) : null}
                  </div>

                  {conversation.unread_count >
                  0 ? (
                    <span className="rounded-full bg-[#20dc73] px-2 py-0.5 text-xs font-bold text-black">
                      {
                        conversation.unread_count
                      }
                    </span>
                  ) : null}
                </div>
              </button>
            ),
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col rounded-md border border-[#143b28] bg-[#06110f]">
        {selected ? (
          <>
            <div className="flex flex-col gap-3 border-b border-[#143b28] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-all font-semibold text-white">
                  {selected.case_number ||
                    "Conversation"}
                </h2>

                <p className="break-words text-sm text-white/45">
                  {selected.case_title ||
                    "Secure bureau channel"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded border border-[#143b28] px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-white/35">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#20dc73]" />
                  Case Secure
                </span>

                {selected.case_id ? (
                  <Link
                    href={`/dashboard/cases/${selected.case_id}`}
                    className="rounded border border-[#20dc73]/40 px-3 py-2 text-sm text-[#20dc73] transition hover:bg-[#20dc73]/10"
                  >
                    Open Case
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {selected.messages.map(
                (message) => (
                  <div
                    key={message.id}
                    className="rounded-md border border-[#143b28] bg-black/30 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#20dc73]">
                          {senderName(
                            message,
                          )}
                        </p>

                        <p className="mt-1 text-[10px] capitalize text-white/25">
                          {senderRole(
                            message,
                          ).replace(
                            /_/g,
                            " ",
                          )}
                        </p>
                      </div>

                      <time className="shrink-0 text-xs text-white/30">
                        {formatDate(
                          message.created_at,
                        )}
                      </time>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-white/80">
                      {
                        message.message
                      }
                    </p>
                  </div>
                ),
              )}

              {!selected.messages.length ? (
                <div className="flex h-full min-h-[20rem] flex-col items-center justify-center text-center">
                  <MessageSquare className="h-8 w-8 text-white/15" />

                  <p className="mt-4 text-sm text-white/45">
                    No messages in this conversation.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="border-t border-[#143b28] p-4">
              {sendError ? (
                <div className="mb-3 rounded-md border border-[#5f2828] bg-[#220d0d] px-4 py-2.5 text-sm text-[#ff8989]">
                  {sendError}
                </div>
              ) : null}

              {selected.case_id ? (
                <>
                  <div className="mb-2 flex items-center gap-2 text-[11px] text-white/30">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#20dc73]" />
                    Case participants only
                  </div>

                  <div className="flex gap-3">
                    <input
                      value={draft}
                      onChange={(event) => {
                        setDraft(
                          event.target.value,
                        )
                        setSendError(null)
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                            "Enter" &&
                          !event.shiftKey
                        ) {
                          event.preventDefault()
                          send()
                        }
                      }}
                      disabled={sending}
                      placeholder="Write a secure case message..."
                      className="h-11 flex-1 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60 disabled:cursor-not-allowed disabled:opacity-50"
                    />

                    <button
                      type="button"
                      onClick={send}
                      disabled={
                        sending ||
                        !draft.trim()
                      }
                      className="inline-flex h-11 items-center gap-2 rounded-md bg-[#20dc73] px-4 font-bold text-black transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-white/30">
                  General conversations are currently
                  view-only from this workspace.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-sm text-white/45">
            <MessageSquare className="h-8 w-8 text-white/15" />

            <p className="mt-4">
              Select a conversation.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}