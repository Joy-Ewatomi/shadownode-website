type QuoteSummaryProps = {
  quoteAmount?: string | number | null
  currency?: string | null
  notes?: string | null

  estimatedCompletion?: string | null

  trainingStartDate?: string | null
  trainingCompletionDate?: string | null
  trainingFlexible?: boolean | null
}

export default function QuoteSummary({
  quoteAmount,
  currency,
  notes,
  estimatedCompletion,
  trainingStartDate,
  trainingCompletionDate,
  trainingFlexible,
}: QuoteSummaryProps) {
  const hasQuote =
    quoteAmount !== null &&
    quoteAmount !== undefined &&
    quoteAmount !== ""

  const formattedAmount = hasQuote
    ? Number(quoteAmount).toLocaleString()
    : null

  return (
    <div className="rounded-md border border-[#143b28] bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.15em] text-white/40">
        Final Approved Quote
      </p>

      <p className="mt-1 text-xl font-bold text-[#20dc73]">
        {formattedAmount
          ? `${currency || "NGN"} ${formattedAmount}`
          : "Not yet available"}
      </p>

      {/* Investigation completion */}
      {estimatedCompletion ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/40">
            Estimated Completion
          </p>

          <p className="mt-1 text-sm text-white/70">
            {new Date(
              estimatedCompletion,
            ).toLocaleDateString()}
          </p>
        </div>
      ) : null}

      {/* Cybersecurity training period */}
      {trainingStartDate ||
      trainingCompletionDate ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/40">
            Training Period
          </p>

          <p className="mt-1 text-sm text-white/70">
            {trainingStartDate
              ? new Date(
                  trainingStartDate,
                ).toLocaleDateString()
              : "TBD"}

            {" → "}

            {trainingCompletionDate
              ? new Date(
                  trainingCompletionDate,
                ).toLocaleDateString()
              : "TBD"}
          </p>

          {trainingFlexible ? (
            <p className="mt-1 text-xs text-[#20dc73]">
              Timeline flexible
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Official quote notes only */}
      {notes ? (
        <div className="mt-4 border-t border-[#143b28] pt-3">
          <p className="text-xs uppercase tracking-[0.12em] text-white/40">
            Bureau Notes
          </p>

          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/65">
            {notes}
          </p>
        </div>
      ) : null}
    </div>
  )
}