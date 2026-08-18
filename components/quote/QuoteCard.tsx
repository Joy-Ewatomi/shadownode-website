import QuoteDecisionButtons from "@/components/quote/QuoteDecisionButtons"
import QuoteSummary from "@/components/quote/QuoteSummary"
import RequestStatusBadge from "@/components/quote/RequestStatusBadge"

type QuoteCardProps = {
  request: {
    id: string
    case_number: string | null
    title: string | null
    service_type?: string | null
    priority?: string | null
    timeline?: string | null
    description: string | null
    status: string
    created_at: string

    /*
     * Client-facing final quote only.
     */
    approved_quote_amount?: string | number | null
    approved_quote_currency?: string | null
    approved_quote_notes?: string | null
    approved_estimated_completion?: string | null

    /*
     * Cybersecurity training
     */
    training_preferred_start_date?: string | null
    training_preferred_completion_date?: string | null
    training_timeline_flexible?: boolean | null
  }

  onAccept: () => Promise<void>

  onReview: (payload: {
    requested_budget: string
    reason: string
    notes: string
  }) => Promise<void>

  onDecline: () => Promise<void>
}

const CLIENT_QUOTE_STATUSES = [
  "quote_sent",
  "revised_quote_sent",
  "awaiting_client_acceptance",
]

export default function QuoteCard({
  request,
  onAccept,
  onReview,
  onDecline,
}: QuoteCardProps) {
  const hasFinalQuote =
    request.approved_quote_amount !== null &&
    request.approved_quote_amount !== undefined &&
    request.approved_quote_amount !== ""

  const canDecide =
    hasFinalQuote &&
    CLIENT_QUOTE_STATUSES.includes(
      request.status,
    )

  return (
  <article className="min-w-0 w-full overflow-hidden p-5 sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 overflow-hidden">
          <h3 className="min-w-0 break-words [overflow-wrap:anywhere] text-base font-semibold text-white sm:text-lg">
            {request.title || "Service Request"}
          </h3>

        <p className="mt-1 min-w-0 break-words [overflow-wrap:anywhere] text-xs text-white/40">
            {request.case_number ||
              "No reference"}{" "}
            ·{" "}
            {request.service_type ||
              "service"}{" "}
            ·{" "}
            {new Date(
              request.created_at,
            ).toLocaleDateString()}
          </p>
        </div>
<div className="shrink-0">
  <RequestStatusBadge
    status={
      request.status ||
      "pending_review"
    }
  />
</div>
      </div>

      {request.description ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/35">
            Request
          </p>

          <p className="mt-1 min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-white/60">
            {request.description}
          </p>
        </div>
      ) : null}

      {/*
       * IMPORTANT:
       *
       * The quote summary is shown only when the
       * bureau has actually issued a final quote.
       *
       * Therefore pending_super_admin_review,
       * pending_admin_review, etc. will not display
       * any pricing.
       */}
      {hasFinalQuote &&
      CLIENT_QUOTE_STATUSES.includes(
        request.status,
      ) ? (
        <div className="mt-5">
          <QuoteSummary
            quoteAmount={
              request.approved_quote_amount
            }
            currency={
              request.approved_quote_currency ||
              "NGN"
            }
            notes={
              request.approved_quote_notes
            }
            estimatedCompletion={
              request.approved_estimated_completion
            }
            trainingStartDate={
              request.training_preferred_start_date
            }
            trainingCompletionDate={
              request.training_preferred_completion_date
            }
            trainingFlexible={
              request.training_timeline_flexible
            }
          />
        </div>
      ) : null}

      {/*
       * Before a quote is officially sent,
       * the client sees status only.
       */}
      {!canDecide &&
      !hasFinalQuote ? (
        <div className="mt-4 rounded border border-[#143b28] bg-black/20 px-4 py-3">
          <p className="text-sm text-white/50">
            Your request is currently under
            bureau review. The final quote will
            appear here once it has been approved
            and sent to you.
          </p>
        </div>
      ) : null}

      {/*
       * Even if an internal approved amount somehow
       * exists while the workflow is not yet client-facing,
       * do NOT expose it.
       */}
      {!canDecide &&
      hasFinalQuote &&
      !CLIENT_QUOTE_STATUSES.includes(
        request.status,
      ) ? (
        <div className="mt-4 rounded border border-[#143b28] bg-black/20 px-4 py-3">
          <p className="text-sm text-white/50">
            Your request is being finalized by
            ShadowNode. You will be notified when
            the final quote is available.
          </p>
        </div>
      ) : null}

      <QuoteDecisionButtons
        canDecide={canDecide}
        onAccept={onAccept}
        onReview={onReview}
        onDecline={onDecline}
      />
    </article>
  )
}