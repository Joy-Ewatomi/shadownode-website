import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

type OperatorRow = {
  id: string
  profile_id: string | null
  username: string
  email: string
  role: string
  status: string
  full_name: string | null
  created_at: string
  updated_at: string
}

type AssignmentRow = {
  id: string
  case_id: string
  case_number: string
  case_title: string
  case_status: string | null
  assigned_at: string
  removed_at: string | null
  assigned_by_username: string | null
}

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (!isAdminRole(user.role)) {
    redirect("/403")
  }

  const { id } = await params

  const operator = await query<OperatorRow>(
    `
    SELECT
      au.id,
      up.id AS profile_id,
      au.username,
      au.email,
      au.role,
      au.status,
      up.full_name,
      au.created_at,
      au.updated_at
    FROM app_users au
    LEFT JOIN user_profiles up ON up.user_id = au.id
    WHERE au.id = $1
    LIMIT 1
    `,
    [id],
  )

  const item = operator.rows[0]

  if (!item) {
    notFound()
  }

  const assignments = item.profile_id
    ? await query<AssignmentRow>(
        `
        SELECT
          ca.id,
          ca.case_id,
          c.case_number,
          c.title AS case_title,
          c.status AS case_status,
          ca.assigned_at,
          ca.removed_at,
          assigner.username AS assigned_by_username
        FROM case_assignments ca
        JOIN cases c ON c.id = ca.case_id
        LEFT JOIN user_profiles assigner_profile ON assigner_profile.id = ca.assigned_by
        LEFT JOIN app_users assigner ON assigner.id = assigner_profile.user_id
        WHERE ca.assigned_to = $1
        ORDER BY ca.removed_at NULLS FIRST, ca.assigned_at DESC
        `,
        [item.profile_id],
      )
    : { rows: [] as AssignmentRow[] }

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">Operator Profile</p>
        <h1 className="mt-3 break-words text-3xl font-bold text-white">{item.full_name || item.username}</h1>
        <p className="mt-2 break-all text-sm text-white/55">{item.email}</p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Info label="Role" value={item.role.replaceAll("_", " ")} />
        <Info label="Status" value={item.status} />
        <Info label="Profile" value={item.profile_id ? "linked" : "missing"} />
        <Info label="Assignments" value={String(assignments.rows.filter((row) => !row.removed_at).length)} />
      </section>

      <section className="rounded-md border border-[#143b28] bg-[#06110f]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] px-5 py-4">
          <h2 className="font-semibold text-white">Assignment History</h2>
          <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">{assignments.rows.length} records</span>
        </div>

        <div className="divide-y divide-[#143b28]">
          {!assignments.rows.length ? (
            <p className="p-5 text-sm text-white/45">No assignments have been recorded for this operator.</p>
          ) : null}

          {assignments.rows.map((assignment) => (
            <Link
              key={assignment.id}
              href={`/dashboard/cases/${assignment.case_id}`}
              className="block p-5 transition hover:bg-white/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all font-mono text-xs text-[#20dc73]">{assignment.case_number}</p>
                  <h3 className="mt-2 break-words font-semibold text-white">{assignment.case_title}</h3>
                  <p className="mt-1 break-words text-sm text-white/45">
                    Assigned by {assignment.assigned_by_username || "system"}
                  </p>
                </div>
                <span className="rounded border border-[#20dc73]/25 px-2 py-1 text-xs text-[#20dc73]">
                  {assignment.removed_at ? "removed" : "active"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-xs text-white/50 md:grid-cols-3">
                <Info label="Case Status" value={assignment.case_status || "unknown"} />
                <Info label="Assigned" value={new Date(assignment.assigned_at).toLocaleString()} />
                <Info label="Removed" value={assignment.removed_at ? new Date(assignment.removed_at).toLocaleString() : "current"} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
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
