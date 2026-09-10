"use client"

import {
  AlertTriangle,
  Loader2,
  MessageSquare,
  RefreshCw,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useState,
} from "react"

type Message = {
  id: string
  username?: string | null
  sender_email?: string | null
  sender_type: string | null
  message: string | null
  created_at: string
  read_at?: string | null
}

type MessagePanelProps = {
  caseId: string
}

export default function MessagePanel({
  caseId,
}: MessagePanelProps) {
  const [messages, setMessages] = useState<
    Message[]
  >([])

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

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Failed to load case messages",
          )
        }

        setMessages(
          Array.isArray(result)
            ? result
            : [],
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

  async function sendMessage() {
    const trimmedText =
      text.trim()

    if (
      !trimmedText ||
      sending
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

      const result = await response.json()

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
      message.username?.trim() ||
      message.sender_email?.trim() ||
      message.sender_type ||
      "Operator"
    )
  }

  return (
    <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
      <div className="flex items-center justify-between gap-3 border-b border-[#143b28] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#20dc73]/20 bg-[#20dc73]/10">
            <MessageSquare className="h-4 w-4 text-[#20dc73]" />
          </div>

          <div>
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
          className="inline-flex items-center gap-2 rounded-md border border-[#254936] px-3 py-2 text-xs font-semibold text-white/55 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
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
        ) : !messages.length ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#204f38] bg-black/20">
              <MessageSquare className="h-5 w-5 text-white/20" />
            </div>

            <p className="mt-4 text-sm text-white/45">
              No case messages yet.
            </p>

            <p className="mt-1 text-xs text-white/25">
              Start the case conversation below.
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

                    {msg.sender_type ? (
                      <p className="mt-1 text-[10px] capitalize text-white/25">
                        {msg.sender_type.replace(
                          /_/g,
                          " ",
                        )}
                      </p>
                    ) : null}
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
              </article>
            ),
          )
        )}
      </div>

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
    </section>
  )
}