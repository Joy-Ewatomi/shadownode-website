"use client"

import {
  AlertTriangle,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useClientNotifications } from "@/components/notifications/ClientNotificationProvider"

type Message = {
  id: string
  username?: string | null
  sender_name?: string | null
  sender_email?: string | null
  sender_role?: string | null
  sender_type: string | null
  message: string | null
  created_at: string
  read_at?: string | null
}

type MessagePermissions = {
  can_view: boolean
  can_reply: boolean
  is_assigned: boolean
  is_client: boolean
  is_super_admin: boolean
}

type MessagesResponse = {
  messages: Message[]
  permissions: MessagePermissions
  conversation_id?: string | null
}

type MessagePanelProps = {
  caseId: string
}

export default function MessagePanel({
  caseId,
}: MessagePanelProps) {
  const [messages, setMessages] = useState<Message[]>([])

  const [permissions, setPermissions] =
    useState<MessagePermissions | null>(null)

  const [conversationId, setConversationId] =
    useState<string | null>(null)

  const { markResourceRead } =
    useClientNotifications()

  const readConversationRef =
    useRef<string | null>(null)

  const [text, setText] = useState("")

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

  const loadMessages = useCallback(
    async (refresh = false) => {
      if (!caseId) {
        return
      }

      try {
        if (refresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        setError(null)

        const response = await fetch(
          `/api/cases/${encodeURIComponent(
            caseId,
          )}/messages`,
          {
            credentials: "include",
            cache: "no-store",
          },
        )

        const result =
          (await response.json()) as
            | MessagesResponse
            | {
                error?: string
              }

        if (!response.ok) {
          throw new Error(
            "error" in result &&
            result.error
              ? result.error
              : "Failed to load case messages",
          )
        }

        if (
          !("messages" in result) ||
          !Array.isArray(result.messages)
        ) {
          throw new Error(
            "Invalid message response",
          )
        }

        setMessages(result.messages)

        setPermissions(
          result.permissions ??
            null,
        )

        setConversationId(
          result.conversation_id ??
            null,
        )
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load case messages",
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [caseId],
  )

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!conversationId) return
    if (readConversationRef.current === conversationId) return

    readConversationRef.current = conversationId

    fetch("/api/messages", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_id: conversationId,
      }),
    })
      .then(() =>
        markResourceRead(
          "conversation",
          conversationId,
        ),
      )
      .then(() => loadMessages(true))
      .catch(() => {
        readConversationRef.current = null
      })
  }, [
    conversationId,
    loadMessages,
    markResourceRead,
  ])

  async function sendMessage() {
    const trimmedText =
      text.trim()

    if (
      !trimmedText ||
      sending ||
      !permissions?.can_reply
    ) {
      return
    }

    try {
      setSending(true)
      setSendError(null)

      const response = await fetch(
        `/api/cases/${encodeURIComponent(
          caseId,
        )}/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            message: trimmedText,
          }),
        },
      )

      const result =
        (await response.json()) as {
          error?: string
        }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to send message",
        )
      }

      setText("")

      await loadMessages(true)
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
    value: string,
  ) {
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
      message.username?.trim() ||
      message.sender_email?.trim() ||
      message.sender_type ||
      "Operator"
    )
  }

  function senderRole(
    message: Message,
  ) {
    return (
      message.sender_role?.trim() ||
      message.sender_type?.trim() ||
      "Operator"
    )
  }

  return (
    <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
      <div className="flex items-center justify-between gap-3 border-b border-[#143b28] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#20dc73]/20 bg-[#20dc73]/10">
            <MessageSquare className="h-4 w-4 text-[#20dc73]" />
          </div>

          <div className="min-w-0">
            <h2 className="font-semibold text-white">
              Case Communication
            </h2>

            <p className="mt-1 text-xs text-white/35">
              Secure communication linked to this case.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadMessages(true)
          }
          disabled={
            loading ||
            refreshing
          }
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-[#254936] px-3 py-2 text-xs font-semibold text-white/55 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {permissions ? (
        <div className="border-b border-[#143b28] bg-black/20 px-5 py-2.5">
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <ShieldCheck className="h-3.5 w-3.5 text-[#20dc73]" />

            <span>
              {permissions.can_reply
                ? "You can participate in this conversation."
                : permissions.can_view
                  ? "You have view-only access to this conversation."
                  : "You do not have messaging access to this case."}
            </span>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="m-5 flex items-start gap-3 rounded-md border border-[#5f2828] bg-[#220d0d] px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8989]" />

          <div>
            <p className="text-sm text-[#ff8989]">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                loadMessages()
              }
              className="mt-2 text-xs font-semibold text-[#ffb0b0] underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      <div className="h-[420px] space-y-3 overflow-y-auto p-5">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin text-[#20dc73]" />
            Loading conversation...
          </div>
        ) : !permissions?.can_view ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#5f2828] bg-[#220d0d]">
              <AlertTriangle className="h-5 w-5 text-[#ff8989]" />
            </div>

            <p className="mt-4 text-sm text-white/55">
              Messaging access is unavailable.
            </p>

            <p className="mt-1 max-w-sm text-xs leading-5 text-white/30">
              You are not authorized to view
              communications for this case.
            </p>
          </div>
        ) : !messages.length ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#204f38] bg-black/20">
              <MessageSquare className="h-5 w-5 text-white/20" />
            </div>

            <p className="mt-4 text-sm text-white/45">
              No case messages yet.
            </p>

            <p className="mt-1 text-xs text-white/25">
              {permissions.can_reply
                ? "Start the case conversation below."
                : "Messages will appear here when available."}
            </p>
          </div>
        ) : (
          messages.map(
            (msg) => (
              <article
                key={msg.id}
                className="rounded-lg border border-[#143b28] bg-black/20 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#20dc73]">
                      {senderName(msg)}
                    </p>

                    <p className="mt-1 text-[10px] capitalize text-white/25">
                      {senderRole(
                        msg,
                      ).replace(
                        /_/g,
                        " ",
                      )}
                    </p>
                  </div>

                  <time className="shrink-0 text-xs text-white/30">
                    {formatDate(
                      msg.created_at,
                    )}
                  </time>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/70">
                  {msg.message ||
                    "Message content unavailable."}
                </p>

                {msg.read_at ? (
                  <p className="mt-3 text-[10px] text-white/20">
                    Read
                  </p>
                ) : null}
              </article>
            ),
          )
        )}
      </div>

      {permissions?.can_reply ? (
        <div className="border-t border-[#143b28] p-4">
          {sendError ? (
            <div className="mb-3 rounded-md border border-[#5f2828] bg-[#220d0d] px-4 py-2.5 text-sm text-[#ff8989]">
              {sendError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={text}
              onChange={(event) => {
                setText(
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
                  sendMessage()
                }
              }}
              disabled={sending}
              placeholder="Send message to the case team..."
              className="h-11 flex-1 rounded-md border border-[#143b28] bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60 disabled:cursor-not-allowed disabled:opacity-50"
            />

            <button
              type="button"
              onClick={sendMessage}
              disabled={
                sending ||
                !text.trim()
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#20dc73] px-5 text-sm font-bold text-black transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-[#143b28] px-5 py-4">
          <p className="text-xs text-white/30">
            This conversation is view-only for your
            current role or assignment.
          </p>
        </div>
      )}
    </section>
  )
}
