"use client"

import { FileText } from "lucide-react"

type PublishedReport = {
  id: string
  title: string | null
  file_url: string | null
  summary: string | null
  created_at: string
}

export default function ClientReports({ reports }: { reports: PublishedReport[] }) {
  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f]">
      <div className="border-b border-[#143b28] px-5 py-4">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Reports</p>
        <h2 className="mt-1 font-semibold text-white">Published Intelligence Reports</h2>
      </div>
      <div className="divide-y divide-[#143b28]">
        {!reports.length ? <p className="p-5 text-sm text-white/45">No published reports are available for this case yet.</p> : null}
        {reports.map((report) => (
          <article key={report.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="flex items-center gap-2 font-medium text-white">
                <FileText className="h-4 w-4 text-[#20dc73]" />
                {report.title || "Published report"}
              </p>
              <p className="mt-1 text-xs text-white/40">
                Intelligence report · published {new Date(report.created_at).toLocaleDateString()}
              </p>
            </div>
            <a href={report.file_url || "#"} className="rounded border border-[#20dc73]/40 px-3 py-2 text-sm text-[#20dc73] hover:bg-[#20dc73]/10">
              View
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}
