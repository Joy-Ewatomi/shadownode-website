"use client"

import {
  CheckCircle2,
  MessageSquareText,
  XCircle,
} from "lucide-react"

import { useState } from "react"

import NegotiationForm from "@/components/quote/NegotiationForm"

type QuoteDecisionButtonsProps = {
  canDecide: boolean

  onAccept: () => Promise<void>

  onReview: (payload: {
    requested_budget: string
    reason: string
    notes: string
  }) => Promise<void>

  onDecline: () => Promise<void>
}

export default function QuoteDecisionButtons({
  canDecide,
  onAccept,
  onReview,
  onDecline,
}: QuoteDecisionButtonsProps) {
  const [reviewing, setReviewing] =
    useState(false)

  const [busy, setBusy] = useState(false)

  if (!canDecide) {
    return null
  }

  async function handleAccept() {
    if (busy) return

    try {
      setBusy(true)

      await onAccept()
    } finally {
      setBusy(false)
    }
  }

  async function handleDecline() {
    if (busy) return

    try {
      setBusy(true)

      await onDecline()
    } finally {
      setBusy(false)
    }
  }

  async function handleReview(
    payload: {
      requested_budget: string
      reason: string
      notes: string
    },
  ) {
    if (busy) return

    try {
      setBusy(true)

      await onReview(payload)

      setReviewing(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={handleAccept}
          className="inline-flex h-9 items-center gap-2 rounded bg-[#20dc73] px-3 text-sm font-bold text-black transition hover:bg-[#20dc73]/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />

          {busy
            ? "Processing..."
            : "Accept Quote"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            setReviewing(
              (value) => !value,
            )
          }
          className="inline-flex h-9 items-center gap-2 rounded border border-[#20dc73]/40 px-3 text-sm text-[#20dc73] transition hover:bg-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MessageSquareText className="h-4 w-4" />

          Request Review
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={handleDecline}
          className="inline-flex h-9 items-center gap-2 rounded border border-red-400/40 px-3 text-sm text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />

          Decline
        </button>
      </div>

      {reviewing ? (
        <NegotiationForm
          onSubmit={handleReview}
        />
      ) : null}
    </div>
  )
}