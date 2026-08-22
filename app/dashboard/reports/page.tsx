import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"

type ReportRow = {
  id: string
  case_id: string
  case_number: string
  case_title: string
  title: string
  summary: string | null
  report_type: string | null
  status: string | null
  classification: string | null
  created_by_username: string | null
  approved_by_username: string | null
  created_at: string
  updated_at: string
}

export default async function ReportsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const profileId = await profileIdForUser(user.id)
  const isAdmin = isAdminRole(user.role)

  const { rows } = await query<ReportRow>(
    `
    SELECT
      cr.id,
      cr.case_id,
      c.case_number,
      c.title AS case_title,
      cr.title,
      cr.summary,
      cr.report_type,
      cr.status,
      cr.classification,
      creator.username AS created_by_username,
      approver.username AS approved_by_username,
      cr.created_at,
      cr.updated_at
    FROM case_reports cr
    JOIN cases c ON c.id = cr.case_id
    LEFT JOIN user_profiles creator_profile ON creator_profile.id = cr.created_by
    LEFT JOIN app_users creator ON creator.id = creator_profile.user_id
    LEFT JOIN user_profiles approver_profile ON approver_profile.id = cr.approved_by
    LEFT JOIN app_users approver ON approver.id = approver_profile.user_id
    WHERE
      (
        $1::boolean = TRUE
        OR c.client_profile_id = $2::uuid
        OR c.assigned_to = $2::uuid
        OR EXISTS (
          SELECT 1
          FROM case_assignments ca
          WHERE ca.case_id = c.id
            AND ca.assigned_to = $2::uuid
            AND ca.removed_at IS NULL
        )
      )
      AND (
        $3::text <> 'client'
        OR cr.status IN ('approved', 'delivered', 'final')
      )
    ORDER BY cr.updated_at DESC, cr.created_at DESC
    `,
    [isAdmin, profileId, user.role],
  )

  const stats = {
    total: rows.length,
    drafts: rows.filter((item) => item.status === "draft").length,
    review: rows.filter((item) => [
  "pending_admin_review",
  "pending_super_admin_review",
].includes(item.status || "")).length,
    approved: rows.filter((item) => ["approved", "delivered", "final"].includes(item.status || "")).length,
  }

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">Report Center</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Reports</h1>
        <p className="mt-2 text-sm text-white/55">Case-linked findings, draft reports, review queue, and delivered intelligence.</p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Total" value={stats.total} />
        <Metric label="Drafts" value={stats.drafts} />
        <Metric label="Review" value={stats.review} />
        <Metric label="Approved" value={stats.approved} />
      </section>

      <section className="space-y-3">
        {!rows.length ? (
          <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6 text-sm text-white/50">
            No reports are available for your account.
          </div>
        ) : null}

        {rows.map((item) => (
          <Link
            key={item.id}
            href={`/dashboard/cases/${item.case_id}/reports`}
            className="block rounded-md border border-[#143b28] bg-[#06110f] p-5 transition hover:border-[#20dc73]/55"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-all font-mono text-xs text-[#20dc73]">{item.case_number}</p>
                <h2 className="mt-2 break-words text-lg font-semibold text-white">{item.title}</h2>
                <p className="mt-1 break-words text-sm text-white/50">{item.case_title}</p>
              </div>
              <Status value={item.status || "draft"} />
            </div>

            {item.summary ? (
              <p className="mt-4 line-clamp-3 break-words text-sm leading-6 text-white/60">{item.summary}</p>
            ) : null}

            <div className="mt-4 grid gap-3 text-xs text-white/50 md:grid-cols-4">
              <Info label="Type" value={item.report_type || "case report"} />
              <Info label="Class" value={item.classification || "confidential"} />
              <Info label="Created By" value={item.created_by_username || "unknown"} />
              <Info label="Updated" value={new Date(item.updated_at || item.created_at).toLocaleString()} />
            </div>
          </Link>
        ))}
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#143b28] bg-[#06110f] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#20dc73]">{value}</p>
    </div>
  )
}

function Status({ value }: { value: string }) {
  return (
    <span className="shrink-0 rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs uppercase tracking-[0.12em] text-[#20dc73]">
      {value.replaceAll("_", " ")}
    </span>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded border border-[#143b28] bg-black/25 p-3">
      <p className="uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-1 break-words text-white/70">{value}</p>
    </div>
  )
}
