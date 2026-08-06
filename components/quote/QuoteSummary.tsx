type QuoteSummaryProps = {
  aiEstimate?: string | number | null
  aiReasoning?: string | null

  quoteAmount?: string | number | null
  currency?: string | null
  notes?: string | null

  // Investigation
  estimatedCompletion?: string | null

  // Cybersecurity Training
  trainingStartDate?: string | null
  trainingCompletionDate?: string | null
  trainingFlexible?: boolean | null
}


export default function QuoteSummary({
  aiEstimate,
  aiReasoning,
  quoteAmount,
  currency,
  notes,

  estimatedCompletion,

  trainingStartDate,
  trainingCompletionDate,
  trainingFlexible,

}: QuoteSummaryProps) {


  return (
    <div className="rounded-md border border-[#143b28] bg-black/35 p-4 text-sm">


      <div>
        <p className="text-xs uppercase text-white/40">
          Approved Quote
        </p>

        <p className="mt-1 font-semibold text-[#20dc73]">
          {quoteAmount
            ? `${currency || "NGN"} ${Number(quoteAmount).toLocaleString()}`
            : "Not sent"}
        </p>
      </div>



      {/* Investigation completion */}
      {estimatedCompletion ? (

        <p className="mt-3 text-white/55">

          Estimated completion:{" "}

          {new Date(
            estimatedCompletion
          ).toLocaleDateString()}

        </p>

      ) : null}




      {/* Cybersecurity training period */}

      {
        trainingStartDate ||
        trainingCompletionDate
        ?

        (
          <div className="mt-3 text-white/55">

            <p>
              Training period:
            </p>


            <p className="mt-1 text-white">

              {
                trainingStartDate
                ?
                new Date(
                  trainingStartDate
                ).toLocaleDateString()
                :
                "TBD"
              }


              {" → "}


              {
                trainingCompletionDate
                ?
                new Date(
                  trainingCompletionDate
                ).toLocaleDateString()
                :
                "TBD"
              }

            </p>


            {
              trainingFlexible
              &&
              (
                <p className="mt-1 text-[#20dc73]">
                  Timeline flexible
                </p>
              )
            }


          </div>
        )

        :
        null
      }





      {notes ? (

        <p className="mt-3 text-white/65">

          {notes}

        </p>

      ) : null}


    </div>
  )
}