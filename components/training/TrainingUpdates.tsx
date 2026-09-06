"use client"

import React, { useState } from "react"

type TrainingUpdate = {
  id: string
  updated_by?: string | null
  update_type?: string | null
  title?: string | null
  content?: string | null
  created_at?: string | null
}

type TrainingUpdatesProps = {
  initialUpdates: TrainingUpdate[]
  engagementId: string
  canPostUpdate: boolean
}

export default function TrainingUpdates({
  initialUpdates,
  engagementId,
  canPostUpdate,
}: TrainingUpdatesProps) {
  const [updates, setUpdates] =
    useState<TrainingUpdate[]>(initialUpdates || [])

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function createUpdate(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError("")
    setSuccess("")

    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedTitle) {
      setError("Please enter an update title.")
      return
    }

    if (!trimmedContent) {
      setError("Please enter update content.")
      return
    }

    if (trimmedTitle.length > 255) {
      setError(
        "The update title must be 255 characters or less.",
      )
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `/api/training/${engagementId}/updates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: trimmedTitle,
            content: trimmedContent,
            update_type: "note",
          }),
        },
      )

      const payload = await response.json()

      if (!response.ok || !payload?.update) {
        throw new Error(
          payload?.error ||
            "Failed to create training update.",
        )
      }

      setUpdates((current) => [
        payload.update,
        ...current,
      ])

      setTitle("")
      setContent("")

      setSuccess("Training update posted successfully.")

      window.setTimeout(() => {
        setSuccess("")
      }, 3000)
    } catch (err: unknown) {
      console.error(
        "TRAINING UPDATE ERROR:",
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create training update.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#20dc73]">
            Training Activity
          </p>

          <h3 className="mt-1 text-lg font-semibold text-white">
            Updates
          </h3>

          <p className="mt-1 text-sm text-white/40">
            Training activity, announcements, and operational updates.
          </p>
        </div>

        <div className="rounded-full border border-[#143b28] bg-[#06150d] px-3 py-1">
          <span className="text-xs text-white/50">
            {updates.length}{" "}
            {updates.length === 1
              ? "update"
              : "updates"}
          </span>
        </div>
      </div>

      {canPostUpdate && (
        <form
          onSubmit={createUpdate}
          className="mb-6 rounded-xl border border-[#143b28] bg-[#020806]/90 p-5"
        >
          <div className="mb-4">
            <p className="text-sm font-semibold text-white">
              Post Training Update
            </p>

            <p className="mt-1 text-xs text-white/40">
              Share an announcement, training progress note,
              or important information with the engagement.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="training-update-title"
                className="mb-1.5 block text-xs font-medium text-white/70"
              >
                Title
              </label>

              <input
                id="training-update-title"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="e.g. New practical exercise available"
                maxLength={255}
                disabled={loading}
                className="w-full rounded-lg border border-[#143b28] bg-[#06150d] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#20dc73]/50 focus:ring-1 focus:ring-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="training-update-content"
                className="mb-1.5 block text-xs font-medium text-white/70"
              >
                Update
              </label>

              <textarea
                id="training-update-content"
                value={content}
                onChange={(event) =>
                  setContent(event.target.value)
                }
                placeholder="Write the training update..."
                rows={5}
                disabled={loading}
                className="w-full resize-none rounded-lg border border-[#143b28] bg-[#06150d] px-3 py-2.5 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-[#20dc73]/50 focus:ring-1 focus:ring-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-lg border border-[#20dc73]/20 bg-[#20dc73]/5 px-3 py-2.5 text-sm text-[#20dc73]">
              {success}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={
                loading ||
                !title.trim() ||
                !content.trim()
              }
              className="rounded-lg bg-[#20dc73] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#32e982] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? "Posting..."
                : "Post Update"}
            </button>
          </div>
        </form>
      )}

      {!canPostUpdate && (
        <div className="mb-5 rounded-lg border border-[#143b28] bg-[#020806]/70 px-4 py-3">
          <p className="text-xs text-white/40">
            Updates are available for viewing. Only the
            approved training operator can post operational
            updates.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {updates.length === 0 && (
          <div className="rounded-xl border border-[#143b28] bg-[#020806]/70 p-6 text-center">
            <p className="text-sm text-white/40">
              No training updates yet.
            </p>
          </div>
        )}

        {updates.map((update) => (
          <article
            key={update.id}
            className="group rounded-xl border border-[#143b28] bg-[#020806]/90 p-5 transition hover:border-[#20dc73]/20 hover:bg-[#06150d]/95"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-white">
                    {update.title ||
                      "Training Update"}
                  </h4>

                  {update.update_type && (
                    <span className="rounded-full border border-[#20dc73]/15 bg-[#20dc73]/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#20dc73]/70">
                      {String(
                        update.update_type,
                      ).replace(
                        /_/g,
                        " ",
                      )}
                    </span>
                  )}
                </div>

                <div className="mt-3 h-px bg-[#143b28]/80" />

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/55">
                  {update.content ||
                    "No additional details."}
                </p>
              </div>

              <time
                dateTime={
                  update.created_at ||
                  undefined
                }
                className="shrink-0 text-[10px] text-white/30 sm:text-right"
              >
                {update.created_at
                  ? new Date(
                      String(
                        update.created_at,
                      ),
                    ).toLocaleString()
                  : ""}
              </time>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}