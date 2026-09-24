"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Props = {
  request: {
    id: string
    status: string
    description?: string | null
    custom_details?: Record<string, unknown> | null
    supporting_links?: unknown
    admin_recommendation?: Record<string, unknown> | null
    ai_analysis?: string | Record<string, unknown> | null
  }
  role: string
}

const inputClass = "mt-2 w-full rounded-md border border-[#24563d] bg-black/50 px-3 py-2 text-white outline-none focus:border-[#20dc73]"

function readable(value: unknown) {
  if (typeof value === "number") return String(value)
  if (typeof value !== "string") return null
  return value.trim() || null
}

export default function CustomRequestReviewPanel({ request, role }: Props) {
  const router = useRouter()
  const superAdmin = role === "super_administrator" || role === "super-administrator"
  const [action, setAction] = useState(superAdmin ? "approve_for_quote" : "recommend_approval")
  const [notes, setNotes] = useState("")
  const [clientMessage, setClientMessage] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const details = request.custom_details || {}
  const entries = Object.entries(details).filter(([, item]) => readable(item) !== null)
  const links = Array.isArray(request.supporting_links) ? request.supporting_links.filter((item): item is string => typeof item === "string") : []
  const triage = typeof request.ai_analysis === "string"
    ? (() => { try { return JSON.parse(request.ai_analysis) as Record<string, unknown> } catch { return null } })()
    : request.ai_analysis
  const canAct = superAdmin ? request.status === "pending_super_admin_review" : ["pending_admin_review", "returned_for_revision"].includes(request.status)

  async function submit() {
    setBusy(true)
    setMessage(null)
    try {
      const endpoint = superAdmin ? "custom-decision" : "custom-recommendation"
      const response = await fetch(`/api/admin/requests/${encodeURIComponent(request.id)}/${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(superAdmin
          ? { action, internalReason: notes, clientMessage, confirmed }
          : { action, notes, clientMessage }),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.error || "Unable to save this review.")
        return
      }
      setMessage("Review saved.")
      router.refresh()
    } catch {
      setMessage("Unable to save this review.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-base font-semibold">Client request</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/70">{request.description}</p>
        {entries.length > 0 && <dl className="mt-5 grid gap-4 sm:grid-cols-2">{entries.map(([key, item]) => <div key={key} className="border-l-2 border-[#24563d] pl-3"><dt className="text-xs uppercase text-white/40">{key.replaceAll(/([A-Z])/g, " $1")}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-white/70">{readable(item)}</dd></div>)}</dl>}
        {links.length > 0 && <div className="mt-5"><h4 className="text-xs uppercase text-white/40">Supporting links</h4><ul className="mt-2 space-y-2">{links.map((link) => <li key={link}><a className="break-all text-sm text-[#20dc73] underline" href={link} target="_blank" rel="noreferrer">{link}</a></li>)}</ul></div>}
      </section>

      {triage && (
        <section className="rounded-md border border-blue-400/25 bg-blue-400/5 p-4">
          <h3 className="text-sm font-semibold text-blue-200">Internal triage recommendation</h3>
          <p className="mt-1 text-xs text-white/45">Advisory only. This does not approve, decline, price or classify the request.</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><dt className="text-xs uppercase text-white/35">Suggested category</dt><dd className="mt-1 text-sm text-white/70">{readable(triage.suggestedCategory)}</dd></div>
            <div><dt className="text-xs uppercase text-white/35">Complexity</dt><dd className="mt-1 text-sm text-white/70">{readable(triage.complexity)}</dd></div>
            <div><dt className="text-xs uppercase text-white/35">Recommended action</dt><dd className="mt-1 text-sm text-white/70">{readable(triage.recommendedAction)?.replaceAll("_", " ")}</dd></div>
          </dl>
        </section>
      )}

      {superAdmin && request.admin_recommendation && (
        <section className="rounded-md border border-[#24563d] bg-black/20 p-4">
          <h3 className="text-sm font-semibold">Administrator recommendation</h3>
          <p className="mt-2 text-sm text-white/60">{readable(request.admin_recommendation.action)?.replaceAll("_", " ")}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">{readable(request.admin_recommendation.notes)}</p>
        </section>
      )}

      {!canAct ? (
        <p className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50">No review action is available at the current status.</p>
      ) : (
        <section className="border-t border-white/10 pt-5">
          <h3 className="text-base font-semibold">{superAdmin ? "Final decision" : "Administrator recommendation"}</h3>
          <label className="mt-4 block text-sm text-white/70">Action<select className={inputClass} value={action} onChange={(event) => setAction(event.target.value)}>
            {superAdmin ? <>
              <option value="approve_for_quote">Approve for quote preparation</option>
              <option value="return_for_revision">Return for administrator revision</option>
              <option value="request_more_information">Request more information</option>
              <option value="currently_unavailable">Currently unavailable</option>
              <option value="outside_scope">Outside scope</option>
              <option value="decline">Decline</option>
            </> : <>
              <option value="recommend_approval">Recommend approval</option>
              <option value="request_more_information">Request more information</option>
              <option value="recommend_unavailable">Recommend unavailable</option>
              <option value="recommend_outside_scope">Recommend outside scope</option>
              <option value="recommend_decline">Recommend decline</option>
            </>}
          </select></label>
          <label className="mt-4 block text-sm text-white/70">{superAdmin ? "Internal decision reason" : "Internal recommendation notes"}<textarea required className={`${inputClass} min-h-28`} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          {(action === "request_more_information" || (superAdmin && action !== "approve_for_quote")) && <label className="mt-4 block text-sm text-white/70">Client-facing explanation<textarea required className={`${inputClass} min-h-24`} value={clientMessage} onChange={(event) => setClientMessage(event.target.value)} /></label>}
          {superAdmin && <label className="mt-4 flex items-start gap-3 text-sm text-white/65"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 accent-[#20dc73]" />I confirm this is the final bureau decision and that the client-facing explanation contains no internal material.</label>}
          {message && <p role="status" className="mt-4 text-sm text-white/70">{message}</p>}
          <button type="button" disabled={busy || !notes.trim() || (superAdmin && !confirmed)} onClick={submit} className="mt-5 min-h-11 rounded-md bg-[#20dc73] px-5 font-semibold text-black disabled:opacity-50">{busy ? "Saving..." : superAdmin ? "Record final decision" : "Submit recommendation"}</button>
        </section>
      )}
    </div>
  )
}
