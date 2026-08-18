"use client"

import { Loader2, Send } from "lucide-react"
import { FormEvent, useState } from "react"

type NegotiationPayload = {
  requested_budget: string
  reason: string
  notes: string
}

type NegotiationFormProps = {
  onSubmit: (
    payload: NegotiationPayload,
  ) => Promise<void>
}

const INITIAL_FORM: NegotiationPayload = {
  requested_budget: "",
  reason: "",
  notes: "",
}

export default function NegotiationForm({
  onSubmit,
}: NegotiationFormProps) {
  const [form, setForm] =
    useState<NegotiationPayload>(INITIAL_FORM)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  function updateField(
    field: keyof NegotiationPayload,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    if (error) {
      setError("")
    }
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (busy) {
      return
    }

    const requestedBudget =
      form.requested_budget.trim()

    const reason = form.reason.trim()
    const notes = form.notes.trim()

    if (!requestedBudget) {
      setError("Please enter your desired budget.")
      return
    }

    const numericBudget =
      Number(requestedBudget)

    if (
      !Number.isFinite(numericBudget) ||
      numericBudget <= 0
    ) {
      setError(
        "Please enter a valid budget greater than zero.",
      )
      return
    }

    if (reason.length < 10) {
      setError(
        "Please provide at least 10 characters explaining the review request.",
      )
      return
    }

    setBusy(true)
    setError("")

    try {
      await onSubmit({
        requested_budget: requestedBudget,
        reason,
        notes,
      })

      setForm(INITIAL_FORM)
    } catch (submissionError) {
      console.error(
        "NEGOTIATION FORM SUBMIT ERROR:",
        submissionError,
      )

      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to submit review request.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 space-y-4"
    >
      {/* =====================================================
          BUDGET
      ====================================================== */}

      <div>
        <label
          htmlFor="requested-budget"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50"
        >
          Desired Budget
        </label>

        <input
          id="requested-budget"
          type="number"
          min="1"
          step="0.01"
          value={form.requested_budget}
          onChange={(event) =>
            updateField(
              "requested_budget",
              event.target.value,
            )
          }
          placeholder="Enter your proposed budget"
          disabled={busy}
          className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* =====================================================
          REASON
      ====================================================== */}

      <div>
        <label
          htmlFor="review-reason"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50"
        >
          Reason for Review
        </label>

        <textarea
          id="review-reason"
          value={form.reason}
          onChange={(event) =>
            updateField(
              "reason",
              event.target.value,
            )
          }
          placeholder="Explain why you would like the quote reviewed..."
          disabled={busy}
          minLength={10}
          className="min-h-[100px] w-full resize-y rounded border border-[#143b28] bg-black px-3 py-2 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
        />

        <p className="mt-1 text-xs text-white/30">
          Minimum 10 characters.
        </p>
      </div>

      {/* =====================================================
          NOTES
      ====================================================== */}

      <div>
        <label
          htmlFor="review-notes"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50"
        >
          Additional Notes
        </label>

        <textarea
          id="review-notes"
          value={form.notes}
          onChange={(event) =>
            updateField(
              "notes",
              event.target.value,
            )
          }
          placeholder="Add any additional information..."
          disabled={busy}
          className="min-h-[80px] w-full resize-y rounded border border-[#143b28] bg-black px-3 py-2 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error ? (
        <div className="rounded border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {/* =====================================================
          SUBMIT
      ====================================================== */}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-10 items-center justify-center gap-2 rounded border border-[#20dc73]/50 bg-[#20dc73]/10 px-4 text-sm font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Submit Review Request
          </>
        )}
      </button>
    </form>
  )
}