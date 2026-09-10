"use client"

import {
  AlertTriangle,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

type CaseUpdate = {
  id: string
  case_id?: string
  updated_by?: string | null
  updated_by_username?: string | null
  update_type?: string | null
  title: string
  content: string
  created_at: string
}

type CaseUpdatesClientProps = {
  caseId: string
  canCreate: boolean
}

function formatUpdateType(
  value: string | null | undefined,
) {
  if (!value) {
    return "case update"
  }

  return value.replace(/_/g, " ")
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default function CaseUpdatesClient({
  caseId,
  canCreate,
}: CaseUpdatesClientProps) {
  const [updates, setUpdates] = useState<CaseUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] =
    useState<string | null>(null)

  const loadUpdates = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        setError(null)

        const response = await fetch(
          `/api/cases/${encodeURIComponent(caseId)}/updates`,
          {
            credentials: "include",
            cache: "no-store",
          },
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Failed to load case updates",
          )
        }

        setUpdates(
          Array.isArray(result)
            ? result
            : [],
        )
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load case updates",
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [caseId],
  )

  useEffect(() => {
    loadUpdates()
  }, [loadUpdates])

  async function createUpdate() {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedTitle || !trimmedContent) {
      setCreateError(
        "Update title and content are required.",
      )
      return
    }

    if (creating) {
      return
    }

    try {
      setCreating(true)
      setCreateError(null)

      const response = await fetch(
        `/api/cases/${encodeURIComponent(caseId)}/updates`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: trimmedTitle,
            content: trimmedContent,
            update_type: "progress",
          }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to create case update",
        )
      }

      setTitle("")
      setContent("")

      await loadUpdates(true)
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : "Failed to create case update",
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="space-y-6">
      {canCreate ? (
        <section className="rounded-xl border border-[#143b28] bg-[#06110f] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#20dc73]/20 bg-[#20dc73]/10">
              <Plus className="h-4 w-4 text-[#20dc73]" />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Post Case Update
              </h2>

              <p className="mt-1 text-sm text-white/40">
                Add an operational progress update to the case record.
              </p>
            </div>
          </div>

          {createError ? (
            <div className="mt-4 rounded-md border border-[#5f2828] bg-[#220d0d] px-4 py-3 text-sm text-[#ff8989]">
              {createError}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setCreateError(null)
              }}
              placeholder="Update title"
              disabled={creating}
              className="h-11 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60 disabled:opacity-50"
            />

            <textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value)
                setCreateError(null)
              }}
              placeholder="Describe investigation progress..."
              disabled={creating}
              className="min-h-32 w-full resize-y rounded-md border border-[#143b28] bg-black px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60 disabled:opacity-50"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={createUpdate}
                disabled={
                  creating ||
                  !title.trim() ||
                  !content.trim()
                }
                className="inline-flex items-center gap-2 rounded-md bg-[#20dc73] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Update
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold text-white">
              Operational Updates
            </h2>

            <p className="mt-1 text-xs text-white/35">
              {updates.length} recorded update
              {updates.length === 1 ? "" : "s"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadUpdates(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-md border border-[#254936] px-3 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="m-5 flex items-start gap-3 rounded-md border border-[#5f2828] bg-[#220d0d] px-4 py-3 sm:m-6">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8989]" />

            <div>
              <p className="text-sm text-[#ff8989]">
                {error}
              </p>

              <button
                type="button"
                onClick={() => loadUpdates()}
                className="mt-3 text-xs font-semibold text-[#ffb0b0] underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin text-[#20dc73]" />
            Loading updates...
          </div>
        ) : !updates.length ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <p className="text-sm text-white/40">
              No operational updates have been recorded.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#143b28]">
            {updates.map((update) => (
              <article
                key={update.id}
                className="px-5 py-5 sm:px-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">
                        {update.title}
                      </h3>

                      <span className="rounded border border-[#20dc73]/20 bg-[#071b12] px-2 py-0.5 text-[10px] capitalize tracking-wide text-[#62e79c]">
                        {formatUpdateType(
                          update.update_type,
                        )}
                      </span>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/65">
                      {update.content}
                    </p>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-xs text-white/35">
                      {formatDate(update.created_at)}
                    </p>

                    {update.updated_by_username ? (
                      <p className="mt-1 text-[11px] text-white/25">
                        By {update.updated_by_username}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}