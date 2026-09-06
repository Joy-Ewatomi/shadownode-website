"use client"

import React, { useState } from "react"

type ProgressRecord = {
  id: string
  module_id: string
  client_profile_id: string
  status?: string | null
  completion_percentage?: number | null
  trainer_notes?: string | null
  started_at?: string | null
  completed_at?: string | null
}

type ProgressManagerProps = {
  initialProgress?: ProgressRecord[]
  engagementId: string
  canManageProgress?: boolean
}

export default function ProgressManager({
  initialProgress = [],
  engagementId,
  canManageProgress = false,
}: ProgressManagerProps) {
  const [progress, setProgress] =
    useState<ProgressRecord[]>(initialProgress)

  const [completion, setCompletion] = useState(100)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function updateProgress(
    moduleId: string,
    clientProfileId: string,
  ) {
    setError("")
    setSuccess("")

    const normalizedCompletion = Math.max(
      0,
      Math.min(100, Number(completion) || 0),
    )

    setLoadingId(moduleId)

    try {
      const res = await fetch(
        `/api/training/${engagementId}/progress`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            moduleId,
            clientProfileId,
            completion_percentage:
              normalizedCompletion,
          }),
        },
      )

      const payload = await res.json()

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            "Failed to update progress",
        )
      }

      if (payload?.progress) {
        setProgress((current) => {
          const exists = current.some(
            (item) =>
              item.id === payload.progress.id,
          )

          if (exists) {
            return current.map((item) =>
              item.id === payload.progress.id
                ? payload.progress
                : item,
            )
          }

          return [
            payload.progress,
            ...current,
          ]
        })

        setSuccess(
          "Module progress updated successfully.",
        )

        setCompletion(normalizedCompletion)
      } else {
        throw new Error(
          "The server did not return a progress record.",
        )
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update progress",
      )
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-white">
          Module Progress
        </h3>

        <p className="mt-1 text-sm text-white/50">
          Track completion for each training module.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-[#20dc73]/20 bg-[#20dc73]/5 px-4 py-3 text-sm text-[#20dc73]">
          {success}
        </div>
      )}

      <div className="space-y-3">
        {progress.length === 0 && (
          <div className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-5">
            <p className="text-sm text-white/50">
              No progress records have been created yet.
            </p>
          </div>
        )}

        {progress.map((item) => {
          const percentage = Math.max(
            0,
            Math.min(
              100,
              Number(
                item.completion_percentage ?? 0,
              ),
            ),
          )

          const isUpdating =
            loadingId === item.module_id

          return (
            <div
              key={item.id}
              className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-5 transition hover:border-[#20dc73]/30"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-[#20dc73]/70">
                    Module
                  </div>

                  <div className="mt-1 break-all font-medium text-white">
                    {item.module_id}
                  </div>

                  <div className="mt-1 text-xs text-white/40">
                    Client profile:{" "}
                    {item.client_profile_id}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-2xl font-semibold text-[#20dc73]">
                    {percentage}%
                  </div>

                  <div className="text-xs text-white/40">
                    {item.status ||
                      (percentage >= 100
                        ? "completed"
                        : percentage > 0
                          ? "in_progress"
                          : "not_started")}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-black/60">
                  <div
                    className="h-full rounded-full bg-[#20dc73] transition-all"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>

              {item.trainer_notes && (
                <div className="mt-4 rounded-lg border border-white/5 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-wider text-white/40">
                    Trainer Notes
                  </div>

                  <p className="mt-1 text-sm text-white/70">
                    {item.trainer_notes}
                  </p>
                </div>
              )}

              {canManageProgress && (
                <div className="mt-5 border-t border-[#143b28]/80 pt-4">
                  <div className="text-xs uppercase tracking-wider text-white/40">
                    Update Completion
                  </div>

                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={completion}
                      onChange={(event) => {
                        const value =
                          Number(
                            event.target.value,
                          )

                        setCompletion(
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number.isFinite(
                                value,
                              )
                                ? value
                                : 0,
                            ),
                          ),
                        )
                      }}
                      className="w-full rounded-lg border border-[#143b28] bg-[#020806] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#20dc73]/50 sm:w-32"
                    />

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() =>
                        updateProgress(
                          item.module_id,
                          item.client_profile_id,
                        )
                      }
                      className="rounded-lg bg-[#20dc73] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#20dc73]/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdating
                        ? "Updating..."
                        : "Update Progress"}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-white/40">
                    Enter a completion percentage
                    between 0 and 100.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}