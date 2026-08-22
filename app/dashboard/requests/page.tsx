"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { RefreshCcw, Search } from "lucide-react"

type Request = {
  id: string
  case_number: string | null
  title: string | null
  category: string | null
  service_type: string | null
  status: string
  created_at: string
  client_username?: string | null
  client_email?: string | null
}
const REQUEST_FILTERS: Record<string, string[]> = {
  pending: ["pending_admin_review"],
  review: ["pending_admin_review", "pending_super_admin_review"],
  quoted: [
    "quote_sent",
    "revised_quote_sent",
    "awaiting_client_acceptance",
  ],
  negotiation: [
    "negotiation_requested",
    "negotiating",
    "under_negotiation",
  ],
  approved: ["client_approved", "active"],
  rejected: ["rejected", "declined"],
  archived: ["archived"],
}

export default function RequestList() {
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get("status") || "all"
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)

  async function loadRequests() {
    try {
      setLoading(true)

      const res = await fetch("/api/admin/requests", {
        credentials: "include",
      })

      if (!res.ok) {
        console.error("Failed loading requests")
        return
      }

      const data = await res.json()
      setRequests(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRequests()
  }, [])

  const activeStatuses = REQUEST_FILTERS[statusFilter]
  const visibleRequests = activeStatuses
    ? requests.filter((request) => activeStatuses.includes(request.status))
    : requests

  const title =
    statusFilter === "all"
      ? "All Requests"
      : `${statusFilter.replace(/-/g, " ")} Requests`

  return (
    <main className="min-w-0 max-w-full space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="min-w-0 max-w-full border-b border-[#143b28] pb-6">

        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
          Operations
        </p>

        <h1 className="mt-2 break-words text-3xl font-bold text-white">
          Service Requests
        </h1>

        <p className="mt-2 break-words text-sm text-white/50">
          Review incoming ShadowNode client investigations.
        </p>

      </header>

      {/* =====================================================
          REQUEST LIST
      ===================================================== */}

      <section className="min-w-0 max-w-full overflow-hidden rounded-md border border-[#143b28] bg-[#06110f]">

        {/* ===================================================
            SECTION HEADER
        =================================================== */}

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[#143b28] px-5 py-4">

          <h2 className="min-w-0 break-words font-semibold text-white">
            {title}
          </h2>

          <button
            type="button"
            onClick={() => void loadRequests()}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-2 rounded border border-[#20dc73]/40 px-3 py-2 text-sm text-[#20dc73] transition hover:bg-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw
              className={[
                "h-4 w-4",
                loading ? "animate-spin" : "",
              ].join(" ")}
            />

            Refresh
          </button>

        </div>

        {/* ===================================================
            REQUESTS
        =================================================== */}

        <div className="min-w-0 max-w-full divide-y divide-[#143b28]">

          {/* LOADING */}

          {loading && (
            <div className="p-5">
              <p className="break-words text-sm text-white/50">
                Loading requests...
              </p>
            </div>
          )}

          {/* EMPTY */}

          {!loading && visibleRequests.length === 0 && (
            <div className="flex min-w-0 flex-col items-center px-5 py-12 text-center text-white/40">

              <Search className="mb-3 h-10 w-10" />

              <p className="break-words">
                No requests found
              </p>

            </div>
          )}

          {/* REQUESTS */}

          {!loading &&
            visibleRequests.map((request) => {

              const requestType =
                request.category ||
                request.service_type ||
                "Uncategorized"

              return (
                <div
                  key={request.id}
                  className="flex min-w-0 max-w-full flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                >

                  {/* =================================================
                      REQUEST INFORMATION
                  ================================================= */}

                  <div className="min-w-0 max-w-full flex-1">

                    {/* TITLE */}

                    <h3 className="min-w-0 max-w-full break-words text-base font-semibold text-white">
                      {request.title ||
                        "Untitled Request"}
                    </h3>

                    {/* CASE NUMBER */}

                    <p className="mt-1 min-w-0 max-w-full break-all font-mono text-xs text-white/50">
                      {request.case_number ||
                        "No case number"}
                    </p>

                    {/* BADGES */}

                    <div className="mt-3 flex min-w-0 max-w-full flex-wrap gap-2">

                      {/* STATUS */}

                      <span className="max-w-full break-all rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs leading-5 text-[#20dc73]">
                        {request.status ||
                          "unknown"}
                      </span>

                      {/* CATEGORY / SERVICE */}

                      <span className="max-w-full break-words rounded border border-white/10 px-2 py-1 text-xs leading-5 text-white/50">
                        {requestType}
                      </span>

                    </div>

                  </div>

                  {/* =================================================
                      OPEN BUTTON
                  ================================================= */}

                  <Link
                    href={`/dashboard/requests/${request.id}`}
                    className="inline-flex w-full shrink-0 items-center justify-center rounded border border-[#20dc73]/40 px-4 py-2 text-sm text-[#20dc73] transition hover:bg-[#20dc73]/10 sm:w-auto"
                  >
                    Open
                  </Link>

                </div>
              )
            })}

        </div>

      </section>

    </main>
  )
}
