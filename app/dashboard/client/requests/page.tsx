"use client"

import { RefreshCcw, Search } from "lucide-react"
import { useEffect, useState } from "react"
import MarkNotificationRead from "@/components/notifications/MarkNotificationRead"

import RequestServiceSelector from "@/components/client/requests/RequestServiceSelector"

type ClientRequest = {
  id: string
  case_number: string | null
  title: string | null
  service_type: string | null
  description: string | null
  status: string
  priority?: string | null
  timeline?: string | null
  price_notes?: string | null

  quote_notes?: string | null

  approved_quote_amount?: string | number | null
  approved_quote_currency?: string | null
  approved_quote_notes?: string | null
  approved_estimated_completion?: string | null

  created_at: string
}

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState<ClientRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [showSelector, setShowSelector] = useState(false)

  async function load() {
    try {
      setLoading(true)

      const res = await fetch("/api/client/requests", {
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error("Failed to load requests")
      }

      const data = await res.json()

      setRequests(data)
    } catch (error) {
      console.error("REQUEST LOAD ERROR:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  /*
   * ==========================================================
   * SERVICE SELECTOR
   * ==========================================================
   */

  if (showSelector) {
    return (
      <div className="w-full space-y-6">
        <header className="border-b border-[#143b28] pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
                ShadowNode Operations
              </p>

              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Make a Request
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-white/55">
                Select the service you require.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSelector(false)}
              className="inline-flex shrink-0 items-center justify-center rounded border border-[#143b28] px-4 py-2 text-sm text-white/60 transition hover:border-[#20dc73] hover:text-[#20dc73]"
            >
              ← Back to Requests
            </button>
          </div>
        </header>

        <section className="w-full rounded-md border border-[#143b28] bg-[#06110f] p-5 sm:p-6 lg:p-8">
          <RequestServiceSelector
            onSelect={(service) => {
              if (service === "osint") {
                window.location.href =
                  "/dashboard/client/requests/osint"
              }

              if (service === "cybersecurity") {
                window.location.href =
                  "/dashboard/client/requests/cybersecurity"
              }
            }}
          />
        </section>
      </div>
    )
  }

  /*
   * ==========================================================
   * REQUEST DASHBOARD
   * ==========================================================
   */

  return (
    <div className="w-full space-y-6">
      <MarkNotificationRead />
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
          ShadowNode Operations
        </p>

        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          Client Requests
        </h1>

     <p className="mt-2 max-w-3xl text-sm text-white/55">
  Submit new requests and access your investigation
  workflow.
</p>
      </header>

      <section className="w-full rounded-md border border-[#143b28] bg-[#06110f]">
        <div className="flex flex-col gap-3 border-b border-[#143b28] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-white">
            Requests
          </h2>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowSelector(true)}
              className="inline-flex items-center justify-center gap-2 rounded bg-[#20dc73] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#20dc73]/80"
            >
              + Make a new request
            </button>
<button
  type="button"
  onClick={load}
  disabled={loading === true}
  className="inline-flex items-center justify-center gap-2 rounded border border-[#20dc73]/40 px-3 py-2 text-sm text-[#20dc73] transition hover:bg-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-50"
>
  <RefreshCcw
    className={`h-4 w-4 ${
      loading ? "animate-spin" : ""
    }`}
  />
  {loading ? "Refreshing..." : "Refresh"}
</button>
          </div>
        </div>

        <div className="divide-y divide-[#143b28]">
          {loading && (
            <p className="p-5 text-sm text-white/45">
              Loading requests...
            </p>
          )}

          {!loading && requests.length === 0 && (
            <div className="flex flex-col items-center px-5 py-16 text-center">
              <Search className="mb-4 h-12 w-12 text-white/20" />

              <p className="text-lg font-semibold text-white/70">
                No active request yet
              </p>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/45">
                Make a request and ShadowNode officials
                will review your requirements.
              </p>

              <button
                type="button"
                onClick={() => setShowSelector(true)}
                className="mt-6 inline-flex h-10 items-center gap-2 rounded bg-[#20dc73] px-5 text-sm font-bold text-black transition hover:bg-[#20dc73]/80"
              >
                Make a request
              </button>
            </div>
          )}
{requests.map((request) => (
  <a
    key={request.id}
    href={`/dashboard/client/requests/${request.id}`}
    className="group block px-5 py-5 transition hover:bg-[#20dc73]/5"
  >
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h3 className="break-words text-sm font-semibold text-white transition group-hover:text-[#20dc73]">
          {request.title || "Investigation request"}
        </h3>

        <p className="mt-1 text-xs text-white/40">
          {request.case_number || "No reference"}
          {" · "}
          {request.service_type || "service"}
        </p>
      </div>

      <span className="shrink-0 text-white/30 transition group-hover:text-[#20dc73]">
        →
      </span>
    </div>
  </a>
))}
        </div>
      </section>
    </div>
  )
}