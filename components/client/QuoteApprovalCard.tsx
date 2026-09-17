"use client"

import { useState } from "react"
import {
  CheckCircle2,
  CreditCard,
  MessageSquareText,
  XCircle,
} from "lucide-react"

type Props = {
  request: any
}

export default function QuoteApprovalCard({
  request,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [showBargain, setShowBargain] = useState(false)

  const [decisionMade, setDecisionMade] =
    useState(false)

  const [paymentRequired, setPaymentRequired] =
    useState(
      request.status === "awaiting_payment",
    )

  const [requestedBudget, setRequestedBudget] =
    useState("")

  const [reason, setReason] =
    useState("")

  const [notes, setNotes] =
    useState("")

  const [message, setMessage] =
    useState("")

  const [messageType, setMessageType] =
    useState<"success" | "error">(
      "success",
    )

  // ========================================================
  // REQUEST STATE
  // ========================================================

  const quoteAwaitingDecision =
    [
      "quote_sent",
      "revised_quote_sent",
      "awaiting_client_acceptance",
    ].includes(request.status)

  const awaitingPayment =
    paymentRequired ||
    request.status === "awaiting_payment"

  const canDecide =
    !decisionMade &&
    !awaitingPayment &&
    quoteAwaitingDecision

  // ========================================================
  // PAYMENT DESTINATION
  // ========================================================

  function goToPayment() {
    window.location.href =
      `/dashboard/client/payments/${request.id}`
  }

  // ========================================================
  // ACCEPT / DECLINE
  // ========================================================

  async function decide(
    decision: "accept" | "decline",
    extra: Record<string, unknown> = {},
  ) {
    if (loading) return

    setLoading(true)
    setMessage("")

    try {
      const res = await fetch(
        `/api/client/requests/${request.id}/decision`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: decision,
            ...extra,
          }),
        },
      )

      const data = await res.json()

      if (!res.ok) {
        setMessageType("error")
        setMessage(
          data.error ||
            "Action failed.",
        )
        return
      }

      // ====================================================
      // ACCEPTED
      // ====================================================

      if (decision === "accept") {
        setPaymentRequired(true)
        setDecisionMade(true)

        setMessageType("success")

        setMessage(
          "Quote accepted. Payment is now required before the investigation can begin.",
        )

        return
      }

      // ====================================================
      // DECLINED
      // ====================================================

      setMessageType("success")
      setMessage("Quote declined.")
      setDecisionMade(true)
    } catch (error) {
      console.error(
        "QUOTE DECISION ERROR:",
        error,
      )

      setMessageType("error")

      setMessage(
        "Something went wrong. Please try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  // ========================================================
  // NEGOTIATION
  // ========================================================

  async function submitBargain() {
    const budget =
      Number(requestedBudget)

    if (
      !Number.isFinite(budget) ||
      budget <= 0
    ) {
      setMessageType("error")

      setMessage(
        "Please enter a valid proposed budget.",
      )

      return
    }

    if (
      reason.trim().length < 10
    ) {
      setMessageType("error")

      setMessage(
        "Please explain why you are requesting a different quote.",
      )

      return
    }

    setLoading(true)
    setMessage("")

    try {
      const res = await fetch(
        `/api/client/requests/${request.id}/decision`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "review",
            requested_budget:
              requestedBudget,
            reason:
              reason.trim(),
            notes:
              notes.trim(),
          }),
        },
      )

      const data =
        await res.json()

      if (!res.ok) {
        setMessageType("error")

        setMessage(
          data.error ||
            "Unable to submit negotiation.",
        )

        return
      }

      setMessageType("success")

      setMessage(
        "Your proposed budget has been submitted for review. The final decision will be sent back to you.",
      )

      setShowBargain(false)
      setRequestedBudget("")
      setReason("")
      setNotes("")
      setDecisionMade(true)
    } catch (error) {
      console.error(
        "QUOTE NEGOTIATION ERROR:",
        error,
      )

      setMessageType("error")

      setMessage(
        "Something went wrong while submitting your proposal.",
      )
    } finally {
      setLoading(false)
    }
  }

  // ========================================================
  // PAYMENT STATE
  // ========================================================

  if (awaitingPayment) {
    return (
      <div className="mt-6 rounded-md border border-[#20dc73]/30 bg-[#20dc73]/5 p-5">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#20dc73]/30 bg-[#20dc73]/10">
            <CreditCard className="h-5 w-5 text-[#20dc73]" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Payment Required
            </p>

            <h3 className="mt-2 text-lg font-semibold text-white">
              Your quote has been accepted
            </h3>

            <p className="mt-2 text-sm leading-6 text-white/55">
              Your investigation case is waiting for
              payment. Complete payment before the
              investigation can begin.
            </p>

            {message && (
              <p
                className={`mt-3 text-sm ${
                  messageType === "error"
                    ? "text-red-300"
                    : "text-[#20dc73]"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={goToPayment}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#20dc73] px-5 py-3 font-semibold text-black transition hover:bg-[#20dc73]/80"
            >
              <CreditCard className="h-4 w-4" />
              Make Payment
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ========================================================
  // NO LONGER ACTIONABLE
  // ========================================================

  if (!canDecide) {
    return (
      <div className="mt-6 rounded-md border border-[#143b28] bg-black/20 p-4">
        <p className="text-sm text-white/50">
          This quote is no longer awaiting a
          client decision.
        </p>

        {message && (
          <p
            className={`mt-3 text-sm ${
              messageType === "error"
                ? "text-red-300"
                : "text-[#20dc73]"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    )
  }

  // ========================================================
  // QUOTE DECISION UI
  // ========================================================

  return (
    <div className="mt-6 rounded-md border border-[#143b28] bg-black/20 p-5">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/35">
          Your decision
        </p>

        <p className="mt-2 text-sm leading-6 text-white/55">
          You may accept the quote, propose a different
          budget with a reason, or decline the quote.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* ACCEPT */}

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            decide("accept")
          }
          className="inline-flex items-center gap-2 rounded-md bg-[#20dc73] px-5 py-3 font-semibold text-black transition hover:bg-[#20dc73]/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />

          {loading
            ? "Processing..."
            : "Accept Quote"}
        </button>

        {/* NEGOTIATE */}

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            setShowBargain(
              (value) => !value,
            )
          }
          className="inline-flex items-center gap-2 rounded-md border border-[#20dc73]/40 px-5 py-3 font-semibold text-[#20dc73] transition hover:border-[#20dc73] disabled:opacity-50"
        >
          <MessageSquareText className="h-4 w-4" />

          {showBargain
            ? "Cancel Proposal"
            : "Propose Different Budget"}
        </button>

        {/* DECLINE */}

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            decide("decline")
          }
          className="inline-flex items-center gap-2 rounded-md border border-red-500/40 px-5 py-3 font-semibold text-red-300 transition hover:border-red-400 disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />

          Decline Quote
        </button>
      </div>

      {/* ====================================================
          BARGAIN FORM
          ==================================================== */}

      {showBargain && (
        <div className="mt-5 rounded-md border border-[#143b28] bg-black/30 p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-white">
              Propose a different budget
            </p>

            <p className="mt-1 text-xs leading-5 text-white/45">
              Explain your proposed budget and the reason
              for your request. Your proposal will be
              reviewed before a final quote is issued.
            </p>
          </div>

          <div className="space-y-4">
            {/* BUDGET */}

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/45">
                Proposed Budget
              </label>

              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-[#143b28] bg-[#06110f] px-3 text-sm text-white/50">
                  {request.approved_quote_currency ||
                    "NGN"}
                </span>

                <input
                  type="number"
                  min="1"
                  value={requestedBudget}
                  onChange={(event) =>
                    setRequestedBudget(
                      event.target.value,
                    )
                  }
                  placeholder="Enter your proposed amount"
                  className="h-11 w-full rounded-r-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]"
                />
              </div>
            </div>

            {/* REASON */}

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/45">
                Reason
              </label>

              <textarea
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value,
                  )
                }
                rows={4}
                placeholder="Explain why you are requesting a different quote..."
                className="w-full rounded-md border border-[#143b28] bg-black p-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]"
              />
            </div>

            {/* NOTES */}

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/45">
                Additional Information
              </label>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value,
                  )
                }
                rows={3}
                placeholder="Optional additional information..."
                className="w-full rounded-md border border-[#143b28] bg-black p-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]"
              />
            </div>

            {/* SUBMIT */}

            <button
              type="button"
              disabled={loading}
              onClick={submitBargain}
              className="w-full rounded-md bg-[#20dc73] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#20dc73]/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Submitting Proposal..."
                : "Submit Budget Proposal"}
            </button>
          </div>
        </div>
      )}

      {/* MESSAGE */}

      {message && (
        <p
          className={`mt-4 text-sm ${
            messageType === "error"
              ? "text-red-300"
              : "text-[#20dc73]"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
