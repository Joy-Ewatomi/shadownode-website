"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"

export default function CreateInternalCaseControl() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const form = event.currentTarget
    const data = new FormData(form)
    if (!window.confirm("Create this internal case and assign yourself as lead investigator?")) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/admin/cases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.get("title"),
          description: data.get("description"),
          priority: data.get("priority"),
          estimated_completion: data.get("estimated_completion"),
          acknowledged: data.get("acknowledged") === "on",
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        destination?: string
      }
      if (!response.ok || !payload.destination) {
        setError(payload.error || "The case could not be created.")
        return
      }

      router.push(payload.destination)
      router.refresh()
    } catch {
      setError("The case could not be created. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-[#20dc73]/50 bg-[#20dc73]/10 px-4 py-2 text-sm font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73]"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create internal case
      </button>
    )
  }

  return (
    <section className="rounded-md border border-[#20dc73]/30 bg-[#06110f] p-5" aria-labelledby="create-internal-case-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="create-internal-case-heading" className="text-lg font-semibold text-white">
            Create internal case
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-white/60">
            For authorized bureau work that has no client request or payment. You will be assigned as lead investigator.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded border border-white/10 text-white/65 hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73]"
          aria-label="Close internal case form"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm text-white/75">
          Case title
          <input name="title" required minLength={3} maxLength={160} className="min-h-11 rounded border border-[#1d5138] bg-[#020908] px-3 text-white outline-none focus:border-[#20dc73]" />
        </label>
        <label className="grid gap-2 text-sm text-white/75">
          Priority
          <select name="priority" defaultValue="normal" className="min-h-11 rounded border border-[#1d5138] bg-[#020908] px-3 text-white outline-none focus:border-[#20dc73]">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-white/75 lg:col-span-2">
          Objective and authorization basis
          <textarea name="description" required minLength={10} maxLength={5000} rows={5} className="rounded border border-[#1d5138] bg-[#020908] px-3 py-3 text-white outline-none focus:border-[#20dc73]" />
        </label>
        <label className="grid gap-2 text-sm text-white/75">
          Target completion date (optional)
          <input type="date" name="estimated_completion" className="min-h-11 rounded border border-[#1d5138] bg-[#020908] px-3 text-white outline-none focus:border-[#20dc73]" />
        </label>
        <label className="flex min-h-11 items-start gap-3 rounded border border-white/10 p-3 text-sm leading-5 text-white/70 lg:col-span-2">
          <input type="checkbox" name="acknowledged" required className="mt-1 h-4 w-4 accent-[#20dc73]" />
          I confirm this is authorized internal bureau work. No client request, quotation, payment, or client ownership record will be created.
        </label>
        {error ? <p role="alert" className="text-sm text-red-300 lg:col-span-2">{error}</p> : null}
        <div className="lg:col-span-2">
          <button disabled={submitting} className="inline-flex min-h-11 items-center justify-center rounded bg-[#20dc73] px-5 py-2 font-semibold text-[#021008] transition hover:bg-[#36e884] disabled:cursor-wait disabled:opacity-60">
            {submitting ? "Creating case..." : "Create and open case"}
          </button>
        </div>
      </form>
    </section>
  )
}
