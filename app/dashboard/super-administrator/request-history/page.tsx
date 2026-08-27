"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  History,
  RefreshCcw,
  Search,
} from "lucide-react"

type RequestHistoryItem = {
  id: string
  case_number: string | null
  title: string | null
  category: string | null
  service_type: string | null
  status: string
  priority: string | null

  admin_quote_action?: string | null
  admin_quote_notes?: string | null
  admin_reviewed_by?: string | null
  admin_reviewed_at?: string | null

  super_admin_quote_action?: string | null
  super_admin_quote_notes?: string | null
  super_admin_reviewed_by?: string | null
  super_admin_reviewed_at?: string | null

  client_username?: string | null
  client_email?: string | null

  created_at: string
  updated_at: string
}

type HistoryResponse = {
  success: boolean
  role: string
  total: number
  requests: RequestHistoryItem[]
  error?: string
}

export default function RequestHistoryPage() {
  const [requests, setRequests] =
    useState<RequestHistoryItem[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [search, setSearch] =
    useState("")

  async function loadHistory() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        "/api/admin/requests/history",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      )

      const data: HistoryResponse =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load request history",
        )
      }

      setRequests(
        Array.isArray(data.requests)
          ? data.requests
          : [],
      )
    } catch (err) {
      console.error(
        "REQUEST HISTORY ERROR:",
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load request history",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  const filteredRequests =
    requests.filter((request) => {
      const value = search
        .toLowerCase()
        .trim()

      if (!value) {
        return true
      }

      return [
        request.title,
        request.case_number,
        request.category,
        request.service_type,
        request.status,
        request.client_username,
        request.client_email,
      ]
        .filter(Boolean)
        .some((item) =>
          String(item)
            .toLowerCase()
            .includes(value),
        )
    })

  function formatDate(
    value: string | null | undefined,
  ) {
    if (!value) {
      return "Unknown"
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return "Unknown"
    }

    return date.toLocaleString()
  }

  return (
    <main className="min-w-0 max-w-full space-y-6">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="min-w-0 border-b border-[#143b28] pb-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          <div className="min-w-0">

            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
              Governance
            </p>

            <h1 className="mt-2 break-words text-3xl font-bold text-white">
              Request History
            </h1>

            <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-white/50">
              Previously reviewed requests that have
              moved out of the active request queue.
            </p>

          </div>

          <button
            type="button"
            onClick={() => void loadHistory()}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded border border-[#20dc73]/40 px-4 py-2 text-sm text-[#20dc73] transition hover:bg-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw
              className={[
                "h-4 w-4",
                loading
                  ? "animate-spin"
                  : "",
              ].join(" ")}
            />

            Refresh
          </button>

        </div>

      </header>

      {/* =====================================================
          SEARCH / SUMMARY
          ===================================================== */}

      <section className="min-w-0 rounded-md border border-[#143b28] bg-[#06110f]">

        <div className="flex min-w-0 flex-col gap-4 border-b border-[#143b28] p-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="rounded border border-[#20dc73]/20 bg-[#20dc73]/10 p-2">
              <History className="h-5 w-5 text-[#20dc73]" />
            </div>

            <div>

              <p className="font-semibold text-white">
                Reviewed Requests
              </p>

              <p className="text-xs text-white/40">
                {requests.length} historical request
                {requests.length === 1
                  ? ""
                  : "s"}
              </p>

            </div>

          </div>

          <div className="relative min-w-0 sm:w-80">

            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search history..."
              className="w-full rounded border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#20dc73]/40"
            />

          </div>

        </div>

        {/* ===================================================
            ERROR
            =================================================== */}

        {error && (
          <div className="border-b border-red-500/20 bg-red-500/5 px-5 py-4">

            <p className="text-sm text-red-300">
              {error}
            </p>

          </div>
        )}

        {/* ===================================================
            LOADING
            =================================================== */}

        {loading && (
          <div className="px-5 py-12 text-center">

            <RefreshCcw className="mx-auto mb-3 h-7 w-7 animate-spin text-[#20dc73]" />

            <p className="text-sm text-white/40">
              Loading request history...
            </p>

          </div>
        )}

        {/* ===================================================
            EMPTY
            =================================================== */}

        {!loading &&
          !error &&
          filteredRequests.length === 0 && (
            <div className="flex flex-col items-center px-5 py-16 text-center">

              <History className="mb-4 h-10 w-10 text-white/20" />

              <p className="text-sm text-white/50">
                {requests.length === 0
                  ? "No reviewed requests found."
                  : "No requests match your search."}
              </p>

              {requests.length === 0 && (
                <p className="mt-2 max-w-md text-xs leading-5 text-white/30">
                  Requests will appear here after an
                  administrator or super administrator
                  completes their review.
                </p>
              )}

            </div>
          )}

        {/* ===================================================
            HISTORY LIST
            =================================================== */}

        {!loading &&
          !error &&
          filteredRequests.length > 0 && (
            <div className="divide-y divide-[#143b28]">

              {filteredRequests.map(
                (request) => {

                  const reviewedAt =
                    request.super_admin_reviewed_at ||
                    request.admin_reviewed_at

                  const reviewAction =
                    request.super_admin_quote_action ||
                    request.admin_quote_action ||
                    "Reviewed"

                  const requestType =
                    request.category ||
                    request.service_type ||
                    "Uncategorized"

                  return (
                    <div
                      key={request.id}
                      className="flex min-w-0 flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >

                      {/* REQUEST INFO */}

                      <div className="min-w-0 flex-1">

                        <div className="flex min-w-0 flex-wrap items-center gap-2">

                          <h2 className="min-w-0 break-words text-base font-semibold text-white">
                            {request.title ||
                              "Untitled Request"}
                          </h2>

                          <span className="shrink-0 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-wider text-white/40">
                            Historical
                          </span>

                        </div>

                        <p className="mt-1 break-all font-mono text-xs text-white/40">
                          {request.case_number ||
                            "No case number"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">

                          <span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs text-[#20dc73]">
                            {request.status ||
                              "unknown"}
                          </span>

                          <span className="rounded border border-white/10 px-2 py-1 text-xs text-white/50">
                            {requestType}
                          </span>

                          <span className="rounded border border-white/10 px-2 py-1 text-xs text-white/50">
                            {reviewAction}
                          </span>

                          {request.priority && (
                            <span className="rounded border border-white/10 px-2 py-1 text-xs uppercase text-white/40">
                              {request.priority}
                            </span>
                          )}

                        </div>

                        <div className="mt-4 grid min-w-0 gap-2 text-xs text-white/35 sm:grid-cols-2">

                          <div>
                            <span className="text-white/20">
                              Client:{" "}
                            </span>

                            {request.client_username ||
                              request.client_email ||
                              "Unknown"}
                          </div>

                          <div>
                            <span className="text-white/20">
                              Reviewed:{" "}
                            </span>

                            {formatDate(
                              reviewedAt,
                            )}
                          </div>

                        </div>

                      </div>

                      {/* OPEN */}

                      <Link
                        href={`/dashboard/requests/${request.id}`}
                        className="inline-flex w-full shrink-0 items-center justify-center rounded border border-[#20dc73]/40 px-4 py-2 text-sm text-[#20dc73] transition hover:bg-[#20dc73]/10 sm:w-auto"
                      >
                        View Request
                      </Link>

                    </div>
                  )
                },
              )}

            </div>
          )}

      </section>

    </main>
  )
}