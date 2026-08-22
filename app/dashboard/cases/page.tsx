import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"

type CaseRow = {
  id: string
  case_number: string
  title: string
  description: string | null
  service_type: string | null
  status: string | null
  priority: string | null
  progress: number | null
  payment_status: string | null
  estimated_completion: string | null
  created_at: string
  updated_at: string
  investigator_username: string | null
  evidence_count: number
  report_count: number
}

export default async function CasesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const profileId = await profileIdForUser(user.id)
  const isAdmin = isAdminRole(user.role)

  const { rows } = await query<CaseRow>(
    `
    SELECT
      c.id,
      c.case_number,
      c.title,
      c.description,
      c.service_type,
      c.status,
      c.priority,
      c.progress,
      c.payment_status,
      c.estimated_completion,
      c.created_at,
      c.updated_at,
      investigator.username AS investigator_username,
      COUNT(DISTINCT ff.id)::int AS evidence_count,
      COUNT(DISTINCT cr.id)::int AS report_count
    FROM cases c
    LEFT JOIN user_profiles investigator_profile ON investigator_profile.id = c.assigned_to
    LEFT JOIN app_users investigator ON investigator.id = investigator_profile.user_id
    LEFT JOIN forensic_files ff ON ff.case_id = c.id
    LEFT JOIN case_reports cr ON cr.case_id = c.id
    WHERE
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
    GROUP BY c.id, investigator.username
    ORDER BY c.updated_at DESC, c.created_at DESC
    `,
    [isAdmin, profileId],
  )

  const metrics = {
    total: rows.length,
    active: rows.filter((item) => ["active", "in_progress", "assigned"].includes(item.status || "")).length,
    awaiting: rows.filter((item) => ["awaiting_payment", "awaiting_assignment", "pending_assignment", "awaiting_client"].includes(item.status || "")).length,
    completed: rows.filter((item) => ["completed", "closed", "delivered"].includes(item.status || "")).length,
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">Investigation Management</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Cases</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
          Manage investigations, evidence, assignments, messages, and reports from live case records.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Total" value={metrics.total} />
        <Metric label="Active" value={metrics.active} />
        <Metric label="Awaiting Action" value={metrics.awaiting} />
        <Metric label="Completed" value={metrics.completed} />
      </section>

      <section className="space-y-3">
        {!rows.length ? (
          <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6 text-sm text-white/50">
            No cases are available for your account.
          </div>
        ) : null}

        {rows.map((item) => (
          <Link
            key={item.id}
            href={`/dashboard/cases/${item.id}`}
            className="block rounded-md border border-[#143b28] bg-[#06110f] p-5 transition hover:border-[#20dc73]/55"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-all font-mono text-xs uppercase tracking-[0.14em] text-[#20dc73]">{item.case_number}</p>
                <h2 className="mt-2 break-words text-lg font-semibold text-white">{item.title}</h2>
                {item.description ? (
                  <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-white/55">{item.description}</p>
                ) : null}
              </div>
              <Status value={item.status || "unknown"} />
            </div>

            <div className="mt-4 grid gap-3 text-xs text-white/50 md:grid-cols-5">
              <Info label="Service" value={item.service_type || "unspecified"} />
              <Info label="Priority" value={item.priority || "normal"} />
              <Info label="Payment" value={item.payment_status || "pending"} />
              <Info label="Investigator" value={item.investigator_username || "unassigned"} />
              <Info label="Files / Reports" value={`${item.evidence_count} / ${item.report_count}`} />
            </div>
          </Link>
        ))}
      </section>
    </div>
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
