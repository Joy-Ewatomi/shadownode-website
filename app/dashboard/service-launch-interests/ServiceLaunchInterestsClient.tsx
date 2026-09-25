"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { BellRing, Search } from "lucide-react"

import { SERVICE_LAUNCH_NAMES, type ServiceLaunchKey } from "@/lib/service-launch-interests"

type RecordItem = {
  id: string
  service_key: ServiceLaunchKey
  service_name: string
  email: string
  consent_at: string
  source: string
  status: "active" | "notified" | "unsubscribed"
  notified_at: string | null
  unsubscribed_at: string | null
  has_account: boolean
}

type ResponseData = {
  records: RecordItem[]
  page: number
  page_size: number
  total: number
  total_pages: number
  summary: {
    active: number
    notified: number
    unsubscribed: number
    represented_services: number
    active_by_service: Array<{ service_key: ServiceLaunchKey; service_name: string; count: number }>
  }
}

const emptySummary: ResponseData["summary"] = {
  active: 0, notified: 0, unsubscribed: 0, represented_services: 0, active_by_service: [],
}

function formatDate(value: string | null) {
  if (!value) return "Not sent"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unavailable"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium", timeStyle: "short",
  }).format(date)
}

function friendlySource(source: string) {
  return source === "public_homepage" ? "Homepage" : "Service interest form"
}

function StatusBadge({ status }: { status: RecordItem["status"] }) {
  const style = status === "active"
    ? "border-[#20dc73]/35 bg-[#20dc73]/10 text-[#20dc73]"
    : status === "notified"
      ? "border-sky-400/35 bg-sky-400/10 text-sky-200"
      : "border-white/15 bg-white/5 text-white/55"
  return <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold capitalize ${style}`}>{status}</span>
}

export default function ServiceLaunchInterestsClient() {
  const [data, setData] = useState<ResponseData>({ records: [], page: 1, page_size: 25, total: 0, total_pages: 1, summary: emptySummary })
  const [service, setService] = useState("")
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [migrationUnavailable, setMigrationUnavailable] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/admin/service-launch-interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ page, service: service || null, status: status || null, search: appliedSearch }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        if (result?.code === "MIGRATION_UNAVAILABLE") setMigrationUnavailable(true)
        throw new Error(result?.error || "Service launch interests could not be loaded.")
      }
      setMigrationUnavailable(false)
      setData(result)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Service launch interests could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [appliedSearch, page, service, status])

  useEffect(() => { void load() }, [load])

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setAppliedSearch(search.trim())
  }

  function resetFilters() {
    setService("")
    setStatus("")
    setSearch("")
    setAppliedSearch("")
    setPage(1)
  }

  const filtered = Boolean(service || status || appliedSearch)

  return (
    <div className="min-w-0 space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase text-[#20dc73]">Operations review</p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Service Launch Interests</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">Review people who requested an email when an upcoming ShadowNode service becomes available.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Active", data.summary.active], ["Notified", data.summary.notified],
          ["Unsubscribed", data.summary.unsubscribed], ["Services", data.summary.represented_services],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-md border border-[#143b28] bg-[#06110f] p-4">
            <p className="text-xs uppercase text-white/40">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-amber-400/25 bg-amber-400/[0.06] p-4 text-sm text-amber-100">
        Launch notifications are not sent automatically. A separate reviewed workflow will be required before contacting subscribers.
      </div>

      <form onSubmit={applyFilters} className="grid gap-4 rounded-md border border-[#143b28] bg-[#06110f] p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.3fr_auto]">
        <label className="space-y-2 text-sm text-white/65">Service
          <select value={service} onChange={(event) => setService(event.target.value)} className="h-11 w-full rounded border border-[#143b28] bg-black/30 px-3 text-white focus:border-[#20dc73] focus:outline-none">
            <option value="">All services</option>
            {Object.entries(SERVICE_LAUNCH_NAMES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm text-white/65">Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 w-full rounded border border-[#143b28] bg-black/30 px-3 text-white focus:border-[#20dc73] focus:outline-none">
            <option value="">All statuses</option><option value="active">Active</option><option value="notified">Notified</option><option value="unsubscribed">Unsubscribed</option>
          </select>
        </label>
        <label className="space-y-2 text-sm text-white/65">Email search
          <span className="flex h-11 items-center gap-2 rounded border border-[#143b28] bg-black/30 px-3 focus-within:border-[#20dc73]">
            <Search className="h-4 w-4 text-white/35" aria-hidden="true" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} autoComplete="off" className="min-w-0 flex-1 bg-transparent text-white outline-none" />
          </span>
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
          <button type="submit" className="h-11 rounded bg-[#20dc73] px-4 text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-white">Search</button>
          <button type="button" onClick={resetFilters} className="h-11 rounded border border-[#143b28] px-4 text-sm text-white/65 focus:outline-none focus:ring-2 focus:ring-[#20dc73]">Reset</button>
        </div>
      </form>

      <div aria-live="polite" className="sr-only">{loading ? "Loading service launch interests" : `${data.total} results loaded`}</div>

      {error ? (
        <div role="alert" className="rounded-md border border-red-400/25 bg-red-400/[0.06] p-6 text-sm text-red-200">
          <p className="font-semibold">{migrationUnavailable ? "Launch-interest storage is not available" : "Unable to load subscriptions"}</p>
          <p className="mt-2">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-4 rounded border border-red-300/30 px-4 py-2">Try again</button>
        </div>
      ) : loading && data.records.length === 0 ? (
        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-12 text-center text-white/50">Loading launch interests...</div>
      ) : data.records.length === 0 ? (
        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-12 text-center">
          <BellRing className="mx-auto h-9 w-9 text-white/25" aria-hidden="true" />
          <p className="mt-4 text-white/65">{filtered ? "No subscriptions match the selected filters." : "No launch-notification requests have been received yet."}</p>
        </div>
      ) : (
        <section aria-labelledby="results-heading" className={`rounded-md border border-[#143b28] bg-[#06110f] ${loading ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between border-b border-[#143b28] p-4">
            <h2 id="results-heading" className="font-semibold text-white">Subscriptions</h2>
            <span className="text-sm text-white/45">{data.total} total</span>
          </div>

          <div className="hidden md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="text-xs uppercase text-white/40"><tr>{["Service", "Email", "Consent date", "Source", "Account", "Status", "Notification status"].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#143b28]">{data.records.map((item) => (
                <tr key={item.id} className="align-top text-white/70">
                  <td className="break-words px-4 py-4 font-medium text-white">{item.service_name}</td>
                  <td className="break-all px-4 py-4">{item.email}</td>
                  <td className="px-4 py-4"><time dateTime={item.consent_at}>{formatDate(item.consent_at)}</time></td>
                  <td className="px-4 py-4">{friendlySource(item.source)}</td>
                  <td className="px-4 py-4">{item.has_account ? "Linked account" : "Guest"}</td>
                  <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-4">{item.notified_at ? <time dateTime={item.notified_at}>{formatDate(item.notified_at)}</time> : "Not sent"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          <div className="divide-y divide-[#143b28] md:hidden">{data.records.map((item) => (
            <article key={item.id} className="min-w-0 space-y-3 p-4">
              <div><h3 className="font-semibold text-white">{item.service_name}</h3><p className="mt-1 break-all text-sm text-white/65">{item.email}</p></div>
              <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2 text-sm">
                <dt className="text-white/40">Status</dt><dd><StatusBadge status={item.status} /></dd>
                <dt className="text-white/40">Requested</dt><dd><time dateTime={item.consent_at}>{formatDate(item.consent_at)}</time></dd>
                <dt className="text-white/40">Source</dt><dd>{friendlySource(item.source)}</dd>
                <dt className="text-white/40">Account</dt><dd>{item.has_account ? "Linked account" : "Guest"}</dd>
                <dt className="text-white/40">Notification</dt><dd>{item.notified_at ? formatDate(item.notified_at) : "Not sent"}</dd>
              </dl>
            </article>
          ))}</div>
        </section>
      )}

      {!error && data.total > 0 && (
        <nav aria-label="Service launch interest pages" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/45">Page {data.page} of {data.total_pages}. Showing {(data.page - 1) * data.page_size + 1}–{Math.min(data.page * data.page_size, data.total)} of {data.total}.</p>
          <div className="flex gap-2">
            <button type="button" aria-label="Previous page" disabled={data.page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="min-h-11 rounded border border-[#143b28] px-4 text-sm text-white disabled:opacity-40">Previous</button>
            <button type="button" aria-label="Next page" disabled={data.page >= data.total_pages || loading} onClick={() => setPage((value) => Math.min(data.total_pages, value + 1))} className="min-h-11 rounded border border-[#143b28] px-4 text-sm text-white disabled:opacity-40">Next</button>
          </div>
        </nav>
      )}
    </div>
  )
}
