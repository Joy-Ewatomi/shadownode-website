import { Download, FileText, Shield } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import MarkResourceNotificationsRead from "@/components/notifications/MarkResourceNotificationsRead"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export default async function ClientReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "client") {
    redirect("/403")
  }

  const { id } = await params

  const result = await query<{
    id: string
    title: string | null
    summary: string | null
    file_url: string | null
    created_at: string
    case_number: string | null
  }>(
    `
      SELECT
        r.id,
        r.title,
        r.summary,
        r.file_url,
        r.created_at,
        c.case_number
      FROM case_reports r
      JOIN cases c
        ON c.id = r.case_id
      JOIN user_profiles up
        ON up.id = c.client_profile_id
      WHERE r.id = $1
        AND up.user_id = $2
        AND COALESCE(r.status, 'published') IN (
          'delivered',
          'final',
          'published'
        )
        AND COALESCE(r.classification, 'confidential') <> 'internal'
      LIMIT 1
    `,
    [id, user.id],
  )

  const report = result.rows[0]

  if (!report) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <MarkResourceNotificationsRead
        resourceType="report"
        resourceId={report.id}
      />

      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
          Client Report
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          {report.title || "Investigation Report"}
        </h1>
        <p className="mt-2 text-sm text-white/45">
          Case: {report.case_number || "Unassigned"}
        </p>
      </header>

      <section className="rounded-md border border-[#143b28] bg-[#06110f] p-6">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 text-[#20dc73]" />
          <div className="min-w-0">
            <p className="text-sm leading-6 text-white/65">
              {report.summary || "This report is available for review."}
            </p>
            <p className="mt-3 text-xs text-white/35">
              Published {new Date(report.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`/api/reports/${encodeURIComponent(report.id)}/export`}
            className="inline-flex items-center gap-2 rounded bg-[#20dc73] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#20dc73]/80"
          >
            <Download className="h-4 w-4" />
            Download Word Report
          </a>
          {report.file_url ? (
            <a
              href={report.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded bg-[#20dc73] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#20dc73]/80"
            >
              <Shield className="h-4 w-4" />
              Open Report File
            </a>
          ) : null}
          <Link
            href="/dashboard/client/reports"
            className="inline-flex items-center rounded border border-[#143b28] px-4 py-2 text-sm text-white/65 transition hover:border-[#20dc73]/40 hover:text-[#20dc73]"
          >
            Back to Reports
          </Link>
        </div>
      </section>
    </div>
  )
}
