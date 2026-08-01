type QuoteSummaryProps = {
  aiEstimate?: string | number | null
  aiReasoning?: string | null
  quoteAmount?: string | number | null
  currency?: string | null
  notes?: string | null
  estimatedCompletion?: string | null
}


export default function QuoteSummary({
  aiEstimate,
  aiReasoning,
  quoteAmount,
  currency,
  notes,
  estimatedCompletion,
}: QuoteSummaryProps) {
  
  return (
    <div className="rounded-md border border-[#143b28] bg-black/35 p-4 text-sm">
      <div>
        <p className="text-xs uppercase text-white/40">
          Approved Quote
        </p>

        <p className="mt-1 font-semibold text-[#20dc73]">
          {quoteAmount
            ? `${currency || "NGN"} ${quoteAmount}`
            : "Not sent"}
        </p>
      </div>

      {estimatedCompletion ? (
        <p className="mt-3 text-white/55">
          Estimated completion:{" "}
          {new Date(estimatedCompletion).toLocaleDateString()}
        </p>
      ) : null}

      {notes ? (
        <p className="mt-3 text-white/65">
          {notes}
        </p>
      ) : null}
    </div>
  )
}