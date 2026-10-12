"use client"

import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function DeleteInternalCaseControl({
  caseId,
  caseNumber,
}: {
  caseId: string
  caseNumber: string
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  async function deleteInternalCase() {
    const confirmation = window.prompt(
      `Permanently delete ${caseNumber}? This is only available for an empty internal case. Type the case number to continue.`,
    )
    if (confirmation === null) return

    setDeleting(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/internal`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_number: confirmation }),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(payload.error || "The internal case could not be deleted.")
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The internal case could not be deleted.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center justify-end gap-3" aria-live="polite">
      {error ? <p className="max-w-xl text-right text-xs leading-5 text-red-300">{error}</p> : null}
      <button
        type="button"
        onClick={() => void deleteInternalCase()}
        disabled={deleting}
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded border border-red-400/35 bg-red-400/[0.06] px-3 text-xs font-semibold text-red-300 transition hover:bg-red-400/[0.12] disabled:cursor-wait disabled:opacity-50"
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        Delete internal case
      </button>
    </div>
  )
}
