import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

type TeamPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type TeamRow = {
  id: string
  profile_id: string | null
  username: string
  email: string
  role: string
  status: string
  full_name: string | null
  active_assignments: number
  last_assigned_at: string | null
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

const TEAM_FILTERS: Record<string, string[]> = {
  employees: ["administrator", "super_administrator", "super-administrator", "investigator", "analyst"],
  roles: ["administrator", "super_administrator", "super-administrator", "investigator", "analyst"],
  investigators: ["investigator"],
  analysts: ["analyst"],
}

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (!isAdminRole(user.role)) {
    redirect("/403")
  }

  const params = searchParams ? await searchParams : {}
  const filter = firstParam(params.view)
  const roles = filter ? TEAM_FILTERS[filter] || [filter] : null

  const { rows } = await query<TeamRow>(
    `
    SELECT
      au.id,
      up.id AS profile_id,
      au.username,
      au.email,
      au.role,
      au.status,
      up.full_name,
      COUNT(DISTINCT ca.case_id) FILTER (WHERE ca.removed_at IS NULL)::int AS active_assignments,
      MAX(ca.assigned_at) AS last_assigned_at
    FROM app_users au
    LEFT JOIN user_profiles up ON up.user_id = au.id
    LEFT JOIN case_assignments ca ON ca.assigned_to = up.id
    WHERE
      au.role IN ('administrator', 'super_administrator', 'super-administrator', 'investigator', 'analyst')
      AND ($1::text[] IS NULL OR au.role = ANY($1::text[]))
    GROUP BY au.id, up.id
    ORDER BY
      CASE au.role
        WHEN 'super_administrator' THEN 1
        WHEN 'super-administrator' THEN 1
        WHEN 'administrator' THEN 2
        WHEN 'investigator' THEN 3
        WHEN 'analyst' THEN 4
        ELSE 5
      END,
      au.username
    `,
    [roles],
  )

  const roleCounts = rows.reduce<Record<string, number>>((acc, item) => {
    acc[item.role] = (acc[item.role] || 0) + 1
    return acc
  }, {})

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">Operations Team</p>
        <h1 className="mt-3 text-3xl font-bold text-white">
          {filter ? `${filter.replaceAll("-", " ").replaceAll("_", " ")} Team` : "Team"}
        </h1>
        <p className="mt-2 text-sm text-white/55">Active operator accounts, roles, profiles, and assignment load.</p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Operators" value={rows.length} />
        <Metric label="Investigators" value={roleCounts.investigator || 0} />
        <Metric label="Analysts" value={roleCounts.analyst || 0} />
        <Metric label="Administrators" value={(roleCounts.administrator || 0) + (roleCounts.super_administrator || 0) + (roleCounts["super-administrator"] || 0)} />
      </section>

      <section className="rounded-md border border-[#143b28] bg-[#06110f]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] px-5 py-4">
          <h2 className="font-semibold text-white">Operator Directory</h2>
          <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">{rows.length} records</span>
        </div>

        <div className="divide-y divide-[#143b28]">
          {!rows.length ? (
            <p className="p-5 text-sm text-white/45">No operators match this view.</p>
          ) : null}

          {rows.map((item) => (
            <Link key={item.id} href={`/dashboard/team/${item.id}`} className="block p-5 transition hover:bg-white/5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold text-white">{item.full_name || item.username}</h3>
                  <p className="mt-1 break-all text-sm text-white/45">{item.email}</p>
                </div>
                <span className="rounded border border-[#20dc73]/25 px-2 py-1 text-xs text-[#20dc73]">
                  {item.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-xs text-white/50 md:grid-cols-4">
                <Info label="Role" value={item.role.replaceAll("_", " ")} />
                <Info label="Profile" value={item.profile_id ? "linked" : "missing"} />
                <Info label="Assignments" value={String(item.active_assignments || 0)} />
                <Info label="Last Assigned" value={item.last_assigned_at ? new Date(item.last_assigned_at).toLocaleString() : "never"} />
              </div>
            </Link>
          ))}
        </div>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded border border-[#143b28] bg-black/25 p-3">
      <p className="uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-1 break-words text-white/70">{value}</p>
    </div>
  )
}
