"use client"

import { useState } from "react"

type TrainerApprovalActionsProps = {
  engagementId: string
  pendingTrainerName: string
}

export default function TrainerApprovalActions({
  engagementId,
  pendingTrainerName,
}: TrainerApprovalActionsProps) {
  const [loading, setLoading] =
    useState<"approve" | "reject" | null>(null)

  const [showRejectModal, setShowRejectModal] =
    useState(false)

  const [rejectionReason, setRejectionReason] =
    useState("")

  const [error, setError] =
    useState<string | null>(null)

  async function readResponse(
    response: Response,
  ): Promise<Record<string, unknown>> {
    const text = await response.text()

    if (!text.trim()) {
      return {}
    }

    try {
      const parsed = JSON.parse(text)

      return parsed &&
        typeof parsed === "object"
        ? parsed
        : {}
    } catch {
      return {
        error:
          `Server returned an invalid response (${response.status}).`,
      }
    }
  }

  async function approveAssignment() {
    setError(null)
    setLoading("approve")

    try {
      const response = await fetch(
        `/api/training/${engagementId}/assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "approve",
          }),
        },
      )

      const data =
        await readResponse(response)

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Failed to approve trainer assignment.",
        )
      }

      window.location.reload()
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to approve trainer assignment.",
      )
    } finally {
      setLoading(null)
    }
  }

  async function rejectAssignment() {
    const reason =
      rejectionReason.trim()

    if (reason.length < 10) {
      setError(
        "Please provide a rejection reason of at least 10 characters.",
      )
      return
    }

    if (reason.length > 2000) {
      setError(
        "The rejection reason must be 2000 characters or less.",
      )
      return
    }

    setError(null)
    setLoading("reject")

    try {
      const response = await fetch(
        `/api/training/${engagementId}/assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "reject",
            reason,
          }),
        },
      )

      const data =
        await readResponse(response)

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Failed to reject trainer assignment.",
        )
      }

      setShowRejectModal(false)
      window.location.reload()
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reject trainer assignment.",
      )
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className="mt-5 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.03] p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-yellow-300/60">
              Action Required
            </p>

            <h4 className="mt-1 text-sm font-semibold text-white">
              Review Trainer Assignment
            </h4>

            <p className="mt-2 text-xs leading-5 text-white/45">
              The Administrator has proposed{" "}
              <span className="font-medium text-white/75">
                {pendingTrainerName}
              </span>{" "}
              as the trainer for this engagement.
              Review the proposal before activating
              trainer access.
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={approveAssignment}
              disabled={loading !== null}
              className="rounded-lg border border-[#20dc73]/30 bg-[#20dc73]/10 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#20dc73] transition hover:border-[#20dc73]/60 hover:bg-[#20dc73]/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading === "approve"
                ? "Approving..."
                : "Approve Assignment"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null)
                setShowRejectModal(true)
              }}
              disabled={loading !== null}
              className="rounded-lg border border-red-400/20 bg-red-400/5 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-red-300 transition hover:border-red-400/40 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reject Assignment
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3">
            <p className="text-xs leading-5 text-red-300">
              {error}
            </p>
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#143b28] bg-[#020806] shadow-2xl">
            <div className="border-b border-white/5 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-300/60">
                    Trainer Assignment
                  </p>

                  <h3 className="mt-1 text-lg font-semibold text-white">
                    Reject Assignment
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowRejectModal(false)
                  }
                  className="rounded-lg px-2 py-1 text-xl text-white/30 transition hover:bg-white/5 hover:text-white"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">
                  Proposed Trainer
                </p>

                <p className="mt-1 text-sm font-medium text-white">
                  {pendingTrainerName}
                </p>
              </div>

              <div>
                <label
                  htmlFor="rejection-reason"
                  className="text-[10px] uppercase tracking-[0.12em] text-white/40"
                >
                  Rejection Reason
                </label>

                <textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(event) =>
                    setRejectionReason(
                      event.target.value,
                    )
                  }
                  rows={5}
                  placeholder="Explain why this trainer assignment cannot be approved..."
                  className="mt-2 w-full resize-none rounded-lg border border-[#143b28] bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-[#20dc73]/40"
                />

                <p className="mt-2 text-[10px] text-white/25">
                  {rejectionReason.length}/2000
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3">
                  <p className="text-xs leading-5 text-red-300">
                    {error}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-white/5 px-6 py-5">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false)
                  setError(null)
                }}
                disabled={loading !== null}
                className="rounded-lg border border-white/10 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/50 transition hover:border-white/20 hover:text-white disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={rejectAssignment}
                disabled={
                  loading !== null ||
                  rejectionReason.trim()
                    .length < 10
                }
                className="rounded-lg border border-red-400/30 bg-red-400/10 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-red-300 transition hover:border-red-400/50 hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading === "reject"
                  ? "Rejecting..."
                  : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}