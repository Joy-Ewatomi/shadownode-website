"use client"

import { useState } from "react"

export default function NegotiationForm({ onSubmit }: { onSubmit: (payload: { requested_budget: string; reason: string; notes: string }) => Promise<void> }) {
  const [form, setForm] = useState({ requested_budget: "", reason: "", notes: "" })
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    await onSubmit(form)
    setForm({ requested_budget: "", reason: "", notes: "" })
    setBusy(false)
  }

  return (
    <div className="mt-3 grid gap-3">
      <input value={form.requested_budget} onChange={(event) => setForm({ ...form, requested_budget: event.target.value })} placeholder="Desired budget" className="h-10 rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
      <textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Reason for quote review" className="min-h-20 rounded border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none" />
      <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Additional notes" className="min-h-16 rounded border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none" />
      <button disabled={busy} onClick={submit} className="h-10 rounded border border-[#20dc73]/40 text-sm font-semibold text-[#20dc73] disabled:opacity-50">Submit Review Request</button>
    </div>
  )
}
