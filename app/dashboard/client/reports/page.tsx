"use client"

import { FileText, RefreshCcw, Shield } from "lucide-react"
import { useEffect, useState } from "react"

type ClientReport = {
  id: string
  title: string | null
  summary: string | null
  file_url: string | null
  created_at: string
  case_number: string
}

export default function ClientReportsPage() {
  const [reports, setReports] = useState<ClientReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    const res = await fetch("/api/client/dashboard", { credentials: "include" })
    if (res.ok) {
      const data = await res.json()
      setReports(data.reports || [])
      setError("")
    } else {
      setError("Failed to load reports")
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Client Operations</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Reports</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/55">
            Access investigation reports, findings, and case summaries published by the bureau.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex h-10 items-center gap-2 rounded border border-[#20dc73]/40 px-3 text-sm text-[#20dc73]"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </header>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-8 text-sm text-white/45">
          Loading reports...
        </div>
      ) : null}

      {!loading && !reports.length && !error ? (
        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-[#20dc73]" />
          <p className="mt-3 text-sm text-white/45">No reports published yet.</p>
          <p className="mt-1 text-xs text-white/30">
            Investigation reports will appear here once the bureau has completed analysis.
          </p>
        </div>
      ) : null}

      {!loading && reports.length ? (
        <section className="grid gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-md border border-[#143b28] bg-[#06110f] p-5"
            >
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 text-[#20dc73]" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{report.title || "Untitled Report"}</p>
                  <p className="mt-1 text-xs text-white/40">Case: {report.case_number}</p>
                </div>
              </div>

              {report.summary ? (
                <p className="mt-3 text-sm leading-6 text-white/55">{report.summary}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-white/35">
                  Published {new Date(report.created_at).toLocaleDateString()}
                </span>
                {report.file_url ? (
                  <a
                    href={report.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded border border-[#20dc73]/40 px-3 py-1.5 text-xs text-[#20dc73] transition hover:bg-[#20dc73]/10"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    View Report
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}
