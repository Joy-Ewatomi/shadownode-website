"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function CustomRequestAdditionalInformation({
  requestId,
  explanation,
}: {
  requestId: string
  explanation?: string | null
}) {
  const router = useRouter()
  const [information, setInformation] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/client/requests/${encodeURIComponent(requestId)}/additional-information`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ information }),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.error || "Unable to submit the information.")
        return
      }
      setInformation("")
      setMessage("Additional information submitted.")
      router.refresh()
    } catch {
      setMessage("Unable to submit the information.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 rounded-md border border-amber-400/30 bg-amber-400/5 p-4 sm:p-5">
      <h2 className="font-semibold text-amber-200">More information required</h2>
      {explanation && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">{explanation}</p>}
      <label className="mt-4 block text-sm text-white/70">Your response<textarea maxLength={5000} value={information} onChange={(event) => setInformation(event.target.value)} className="mt-2 min-h-28 w-full rounded-md border border-[#24563d] bg-black/50 px-3 py-2 text-white outline-none focus:border-[#20dc73]" /></label>
      {message && <p role="status" className="mt-3 text-sm text-white/70">{message}</p>}
      <button type="button" disabled={busy || !information.trim()} onClick={submit} className="mt-4 min-h-11 rounded-md bg-[#20dc73] px-5 font-semibold text-black disabled:opacity-50">{busy ? "Submitting..." : "Submit additional information"}</button>
    </section>
  )
}
