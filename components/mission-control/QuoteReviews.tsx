"use client"

import { Send } from "lucide-react"
import { useState } from "react"
import NegotiationHistory from "@/components/quote/NegotiationHistory"

export default function QuoteReviews({ reviews, onUpdated }: { reviews: any[]; onUpdated: () => Promise<void> }) {
  const [drafts, setDrafts] = useState<Record<string, { recommendation: string; amount: string; notes: string }>>({})

  async function update(id: string, action: string) {
    const draft = drafts[id] || { recommendation: "", amount: "", notes: "" }
    const response = await fetch("/api/admin/quote-negotiations", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        action,
        administrator_recommendation: draft.recommendation,
        revised_quote_amount: draft.amount,
        owner_decision_notes: draft.notes,
      }),
    })
    if (response.ok) await onUpdated()
  }

  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f]">
      <div className="border-b border-[#143b28] px-5 py-4">
        <h2 className="font-semibold text-white">Quote Reviews</h2>
      </div>
      <div className="divide-y divide-[#143b28]">
        {!reviews.length ? <p className="p-5 text-sm text-white/45">No quote reviews pending.</p> : null}
        {reviews.map((review) => {
          const draft = drafts[review.id] || { recommendation: "", amount: "", notes: "" }
          return (
            <article key={review.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{review.request_title}</p>
                  <p className="mt-1 text-xs text-white/40">{review.case_number} · {review.client_email || "client"} · round {review.round_number}</p>
                </div>
                <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs capitalize text-[#20dc73]">{String(review.status).replaceAll("_", " ")}</span>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-white/60 sm:grid-cols-3">
                <p>AI: {review.ai_price_estimate || review.original_ai_estimate || "n/a"}</p>
                <p>Original quote: {review.original_quote_amount || review.approved_quote_amount || "n/a"}</p>
                <p>Client budget: {review.requested_budget || "n/a"}</p>
              </div>
              <p className="mt-3 text-sm text-white/65">{review.client_reason}</p>
              <div className="mt-4">
                <NegotiationHistory items={review.history || []} />
              </div>
              <div className="mt-4 grid gap-3">
                <textarea value={draft.recommendation} onChange={(event) => setDrafts({ ...drafts, [review.id]: { ...draft, recommendation: event.target.value } })} placeholder="Administrator recommendation" className="min-h-20 rounded border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none" />
                <input value={draft.amount} onChange={(event) => setDrafts({ ...drafts, [review.id]: { ...draft, amount: event.target.value } })} placeholder="Modified quote amount" className="h-10 rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
                <textarea value={draft.notes} onChange={(event) => setDrafts({ ...drafts, [review.id]: { ...draft, notes: event.target.value } })} placeholder="Owner decision notes" className="min-h-16 rounded border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => update(review.id, "approve")} className="h-9 rounded border border-[#20dc73]/40 px-3 text-sm text-[#20dc73]">Approve</button>
                  <button onClick={() => update(review.id, "reject")} className="h-9 rounded border border-red-400/40 px-3 text-sm text-red-200">Reject</button>
                  <button onClick={() => update(review.id, "send_revised_quote")} className="inline-flex h-9 items-center gap-2 rounded bg-[#20dc73] px-3 text-sm font-bold text-black"><Send className="h-4 w-4" />Send Revised Quote</button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
