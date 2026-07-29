"use client"

import { CheckCircle2, MessageSquareText, XCircle } from "lucide-react"
import { useState } from "react"
import NegotiationForm from "@/components/quote/NegotiationForm"

export default function QuoteDecisionButtons({ canDecide, onAccept, onReview, onDecline }: {
  canDecide: boolean
  onAccept: () => Promise<void>
  onReview: (payload: { requested_budget: string; reason: string; notes: string }) => Promise<void>
  onDecline: () => Promise<void>
}) {
  const [reviewing, setReviewing] = useState(false)
  if (!canDecide) return null
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={onAccept} className="inline-flex h-9 items-center gap-2 rounded bg-[#20dc73] px-3 text-sm font-bold text-black"><CheckCircle2 className="h-4 w-4" />Accept Quote</button>
        <button onClick={() => setReviewing((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded border border-[#20dc73]/40 px-3 text-sm text-[#20dc73]"><MessageSquareText className="h-4 w-4" />Request Review</button>
        <button onClick={onDecline} className="inline-flex h-9 items-center gap-2 rounded border border-red-400/40 px-3 text-sm text-red-200"><XCircle className="h-4 w-4" />Decline</button>
      </div>
      {reviewing ? <NegotiationForm onSubmit={onReview} /> : null}
    </div>
  )
}
