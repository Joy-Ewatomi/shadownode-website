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

    approved_quote_amount?: string | number | null
    approved_quote_currency?: string | null
    quote_notes?: string | null
    approved_quote_notes?: string | null
 approved_estimated_completion?: string | null

// Cybersecurity Training
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

export default function QuoteCard({
  request,
  onAccept,
  onReview,
  onDecline,
}: QuoteCardProps) {

  const quoteAmount = request.approved_quote_amount

  return (
    <article className="px-5 py-4">

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">
            {request.title || "Investigation Request"}
          </p>

          <p className="mt-1 text-xs text-white/40">
            {request.case_number} · {request.service_type} ·{" "}
            {new Date(request.created_at).toLocaleDateString()}
          </p>
        </div>

        <RequestStatusBadge 
          status={request.status || "pending_review"} 
        />
      </div>


      <p className="mt-3 text-sm text-white/60">
        {request.description}
      </p>


      <div className="mt-4">
     <QuoteSummary
  quoteAmount={quoteAmount}
  currency={request.approved_quote_currency || "NGN"}
  notes={
    request.approved_quote_notes ||
    request.quote_notes
  }

  estimatedCompletion={
    request.approved_estimated_completion
  }
/>
      </div>


      <QuoteDecisionButtons
        canDecide={
          Boolean(
            quoteAmount &&
            ["quote_sent", "revised_quote_sent", "awaiting_client_acceptance"]
            .includes(request.status)
          )
        }
        onAccept={onAccept}
        onReview={onReview}
        onDecline={onDecline}
      />

    </article>
  )
}