"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function PaymentWaiverControl({
  requestId,
  status,
  hasCase,
  hasTraining,
}: {
  requestId: string
  status: string
  hasCase: boolean
  hasTraining: boolean
}) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [acknowledged, setAcknowledged] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const eligible = status === "awaiting_payment" && hasCase !== hasTraining
  if (!eligible) return null

  async function waivePayment() {
    if (!acknowledged || reason.trim().length < 10) {
      setMessage("Provide a clear reason and acknowledge the no-charge authorization.")
      return
    }
    if (!window.confirm("Authorize this engagement without collecting payment? This decision is audited.")) return
    setLoading(true)
    setMessage("")
    try {
      const response = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}/waive-payment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Payment waiver could not be completed")
      setMessage("Payment requirement waived successfully.")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment waiver could not be completed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-md border border-amber-400/30 bg-amber-400/[0.06] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Super Administrator Financial Control</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Waive payment</h2>
      <p className="mt-2 text-sm leading-6 text-white/60">
        Authorize this {hasTraining ? "training engagement" : "case"} without collecting payment. No paid transaction will be created.
      </p>
      <label className="mt-4 block text-sm text-white/70">
        <span className="mb-2 block">Reason for waiver</span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          minLength={10}
          maxLength={500}
          rows={3}
          className="w-full rounded-md border border-[#31533f] bg-black/35 px-3 py-2 text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
          placeholder="Explain why this engagement is authorized without payment."
        />
      </label>
      <label className="mt-3 flex min-h-11 items-start gap-3 text-sm text-white/70">
        <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 size-4 accent-amber-300" />
        <span>I authorize a no-charge engagement and understand this action is recorded in the permanent request audit.</span>
      </label>
      {message ? <p role="status" className="mt-3 text-sm text-amber-100">{message}</p> : null}
      <button
        type="button"
        onClick={waivePayment}
        disabled={loading || !acknowledged || reason.trim().length < 10}
        className="mt-4 min-h-11 rounded-md bg-amber-300 px-4 py-2 font-semibold text-black hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Authorizing..." : "Waive payment and continue"}
      </button>
    </section>
  )
}
