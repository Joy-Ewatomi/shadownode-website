type HistoryItem = {
  id: string
  round_number: number
  status: string
  requested_budget: string | number | null
  client_reason: string | null
  revised_quote_amount: string | number | null
  owner_decision: string | null
  created_at: string
}

export default function NegotiationHistory({ items }: { items: HistoryItem[] }) {
  if (!items.length) return <p className="text-sm text-white/45">No negotiation history.</p>
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-md border border-[#143b28] bg-black/30 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white">Round {item.round_number}</p>
            <p className="text-xs capitalize text-white/40">{item.status.replaceAll("_", " ")}</p>
          </div>
          <p className="mt-2 text-white/60">Budget: {item.requested_budget || "not set"}</p>
          {item.client_reason ? <p className="mt-1 text-white/55">{item.client_reason}</p> : null}
          {item.revised_quote_amount ? <p className="mt-1 text-[#20dc73]">Revised quote: {item.revised_quote_amount}</p> : null}
          {item.owner_decision ? <p className="mt-1 text-white/45">Decision: {item.owner_decision}</p> : null}
        </div>
      ))}
    </div>
  )
}
