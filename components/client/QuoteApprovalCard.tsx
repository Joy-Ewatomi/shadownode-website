"use client"

import { useState } from "react"

export default function QuoteApprovalCard({
  request,
}: {
  request: any
}) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function decide(decision: "accept" | "decline") {
    if (loading) return

    setLoading(true)
    setMessage("")

    try {
      const res = await fetch(
        `/api/client/requests/${request.id}/decision`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: decision,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || "Action failed.")
        return
      }

      setMessage(
        decision === "accept"
          ? "Quote accepted. Case created successfully."
          : "Quote declined."
      )
    } catch (error) {
      console.error(error)
      setMessage("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="
        rounded-md
        border
        border-[#143b28]
        bg-[#06110f]
        p-6
        space-y-5
      "
    >
      <h2 className="text-xl font-bold text-white">
        Investigation Quote
      </h2>

      <div className="space-y-2 text-white/60">
        <p>
          Service:
          <span className="text-white">
            {" "}
            {request.service_type}
          </span>
        </p>

        <p>
          Amount:
          <span className="text-[#20dc73]">
            {" "}
            {request.approved_quote_currency}
            {" "}
            {request.approved_quote_amount?.toLocaleString()}
          </span>
        </p>

        <p>
          Completion:
          <span className="text-white">
            {" "}
            {request.approved_estimated_completion || "Pending"}
          </span>
        </p>
      </div>

      <p className="text-sm text-white/50">
        {request.approved_quote_notes}
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={loading}
          onClick={() => decide("accept")}
          className="
            rounded-md
            bg-[#20dc73]
            px-5
            py-3
            font-semibold
            text-black
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {loading ? "Processing..." : "Accept Quote"}
        </button>

        <button
          disabled={loading}
          onClick={() => decide("decline")}
          className="
            rounded-md
            border
            border-red-500/40
            px-5
            py-3
            text-red-300
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {loading ? "Processing..." : "Decline"}
        </button>
      </div>

      {message && (
        <p className="text-sm text-[#20dc73]">
          {message}
        </p>
      )}
    </div>
  )
}