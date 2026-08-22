import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  canUseInvestigationWorkspace,
  resolveCaseId,
} from "@/lib/investigation-workspace"

type TeamRow = {
  id: string
  assigned_to: string
  assigned_by: string | null
  assigned_at: string
  removed_at: string | null
  username: string
  email: string
  role: string
  assigned_by_username: string | null
}

export default async function CaseTeamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const { id } = await params
  const caseId = await resolveCaseId(id)

  if (!caseId) {
    notFound()
  }

  const canView = await canUseInvestigationWorkspace(user.id, user.role, caseId)

  if (!canView) {
    redirect("/403")
  }

  const { rows } = await query<TeamRow>(
    `
    SELECT
      ca.id,
      ca.assigned_to,
      ca.assigned_by,
      ca.assigned_at,
      ca.removed_at,
      au.username,
      au.email,
      au.role,
      assigned_by_user.username AS assigned_by_username
    FROM case_assignments ca
    JOIN user_profiles up ON up.id = ca.assigned_to
    JOIN app_users au ON au.id = up.user_id
    LEFT JOIN user_profiles assigned_by_profile ON assigned_by_profile.id = ca.assigned_by
    LEFT JOIN app_users assigned_by_user ON assigned_by_user.id = assigned_by_profile.user_id
    WHERE ca.case_id = $1
    ORDER BY ca.removed_at NULLS FIRST, ca.assigned_at DESC
    `,
    [caseId],
  )

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">Case Team</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Assignments</h1>
        <p className="mt-2 text-sm text-white/55">Current operators and assignment history for this investigation.</p>
      </header>

      <section className="rounded-md border border-[#143b28] bg-[#06110f]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] px-5 py-4">
          <h2 className="font-semibold text-white">Assigned Operators</h2>
          <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">{rows.length} records</span>
        </div>

        <div className="divide-y divide-[#143b28]">
          {!rows.length ? (
            <p className="p-5 text-sm text-white/45">No assignments have been recorded for this case.</p>
          ) : null}

          {rows.map((item) => (
            <article key={item.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold text-white">{item.username}</h3>
                  <p className="mt-1 break-all text-sm text-white/45">{item.email}</p>
                </div>
                <span className="rounded border border-[#20dc73]/25 px-2 py-1 text-xs text-[#20dc73]">
                  {item.removed_at ? "removed" : "active"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-xs text-white/50 md:grid-cols-4">
                <Info label="Role" value={item.role.replaceAll("_", " ")} />
                <Info label="Assigned By" value={item.assigned_by_username || "system"} />
                <Info label="Assigned" value={new Date(item.assigned_at).toLocaleString()} />
                <Info label="Removed" value={item.removed_at ? new Date(item.removed_at).toLocaleString() : "current"} />
              </div>
            </article>
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
