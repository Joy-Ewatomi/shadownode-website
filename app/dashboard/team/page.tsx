import Link from "next/link"
import { redirect } from "next/navigation"
import {
  getCurrentUser,
  isAdminRole,
} from "@/lib/auth"
import { query } from "@/lib/db"

type TeamPageProps = {
  searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >
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
  pending_assignments: number
  rejected_assignments: number
  last_assigned_at: string | null
}

function firstParam(
  value:
    | string
    | string[]
    | undefined,
) {
  return Array.isArray(value)
    ? value[0]
    : value
}

const TEAM_FILTERS: Record<
  string,
  string[]
> = {
  employees: [
    "administrator",
    "super_administrator",
    "super-administrator",
    "investigator",
    "analyst",
  ],

  roles: [
    "administrator",
    "super_administrator",
    "super-administrator",
    "investigator",
    "analyst",
  ],

  investigators: [
    "investigator",
  ],

  analysts: [
    "analyst",
  ],

  administrators: [
    "administrator",
  ],

  "super-administrators": [
    "super_administrator",
    "super-administrator",
  ],
}

function formatRole(
  role: string,
) {
  return role
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    )
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "Never"
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown"
  }

  return date.toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  )
}

function roleClasses(
  role: string,
) {
  switch (role) {
    case "super_administrator":
    case "super-administrator":
      return "border-purple-400/25 bg-purple-400/10 text-purple-300"

    case "administrator":
      return "border-blue-400/25 bg-blue-400/10 text-blue-300"

    case "analyst":
      return "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"

    case "investigator":
      return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"

    default:
      return "border-white/10 bg-white/[0.03] text-white/45"
  }
}

function statusClasses(
  status: string,
) {
  if (status === "active") {
    return "border-[#20dc73]/25 bg-[#20dc73]/10 text-[#20dc73]"
  }

  if (
    status ===
      "suspended" ||
    status === "disabled" ||
    status === "inactive"
  ) {
    return "border-red-400/20 bg-red-400/10 text-red-300"
  }

  return "border-white/10 bg-white/[0.03] text-white/40"
}

export default async function TeamPage({
  searchParams,
}: TeamPageProps) {
  const user =
    await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (
    !isAdminRole(
      user.role,
    )
  ) {
    redirect("/403")
  }

  const params =
    searchParams
      ? await searchParams
      : {}

  const filter =
    firstParam(
      params.view,
    )

  const roles =
    filter
      ? TEAM_FILTERS[
          filter
        ] || [
          filter,
        ]
      : null

  const search =
    firstParam(
      params.search,
    )
      ?.trim()
      .toLowerCase() || ""

  const { rows } =
    await query<TeamRow>(
      `
        SELECT
          au.id,

          up.id AS profile_id,

          au.username,
          au.email,
          au.role,
          au.status,

          up.full_name,

          COUNT(
            DISTINCT ca.case_id
          ) FILTER (
            WHERE
              ca.removed_at IS NULL
              AND COALESCE(
                ca.status,
                'assigned'
              ) IN (
                'assigned',
                'approved',
                'active',
                'accepted'
              )
          )::int
            AS active_assignments,

          COUNT(
            DISTINCT ca.id
          ) FILTER (
            WHERE
              ca.removed_at IS NULL
              AND ca.status = 'pending'
          )::int
            AS pending_assignments,

          COUNT(
            DISTINCT ca.id
          ) FILTER (
            WHERE
              ca.status = 'rejected'
          )::int
            AS rejected_assignments,

          MAX(
            ca.assigned_at
          ) AS last_assigned_at

        FROM app_users au

        LEFT JOIN user_profiles up
          ON up.user_id = au.id

        LEFT JOIN case_assignments ca
          ON ca.assigned_to = up.id

        WHERE
          au.role IN (
            'administrator',
            'super_administrator',
            'super-administrator',
            'investigator',
            'analyst'
          )

          AND au.status = 'active'

          AND (
            $1::text[] IS NULL
            OR au.role = ANY($1::text[])
          )

        GROUP BY
          au.id,
          up.id

        ORDER BY
          CASE au.role
            WHEN 'super_administrator' THEN 1
            WHEN 'super-administrator' THEN 1
            WHEN 'administrator' THEN 2
            WHEN 'investigator' THEN 3
            WHEN 'analyst' THEN 4
            ELSE 5
          END,

          COALESCE(
            NULLIF(
              up.full_name,
              ''
            ),
            au.username
          )
      `,
      [roles],
    )

  const filteredRows =
    search
      ? rows.filter(
          (item) => {
            const searchable =
              [
                item.full_name,
                item.username,
                item.email,
                item.role,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()

            return searchable.includes(
              search,
            )
          },
        )
      : rows

  const roleCounts =
    rows.reduce<
      Record<
        string,
        number
      >
    >(
      (acc, item) => {
        acc[item.role] =
          (acc[item.role] ||
            0) + 1

        return acc
      },
      {},
    )

  const pendingTotal =
    rows.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.pending_assignments ||
            0,
        ),
      0,
    )

  const activeLoad =
    rows.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.active_assignments ||
            0,
        ),
      0,
    )

  return (
    <main className="space-y-6">
      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="border-b border-[#143b28] pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Operations Team
            </p>

            <h1 className="mt-3 text-3xl font-bold text-white">
              {filter
                ? `${formatRole(filter)} Team`
                : "Team Directory"}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
              Select and inspect real ShadowNode
              personnel, their system roles, current
              workload, and case assignment activity.
            </p>
          </div>

          <div className="rounded-md border border-[#20dc73]/20 bg-[#071b12] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#20dc73]">
              Personnel Operations
            </p>

            <p className="mt-1 text-xs text-white/45">
              {rows.length} active personnel
            </p>
          </div>
        </div>
      </header>

      {/* ======================================================
          METRICS
          ====================================================== */}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric
          label="Personnel"
          value={rows.length}
        />

        <Metric
          label="Investigators"
          value={
            roleCounts.investigator ||
            0
          }
        />

        <Metric
          label="Analysts"
          value={
            roleCounts.analyst ||
            0
          }
        />

        <Metric
          label="Active Case Load"
          value={activeLoad}
        />

        <Metric
          label="Pending Assignments"
          value={pendingTotal}
        />
      </section>

      {/* ======================================================
          FILTERS
          ====================================================== */}

      <section className="flex flex-col gap-3 md:flex-row">
        <form
          action="/dashboard/team"
          method="GET"
          className="flex flex-1 gap-2"
        >
          {filter ? (
            <input
              type="hidden"
              name="view"
              value={filter}
            />
          ) : null}

          <input
            type="search"
            name="search"
            defaultValue={
              search
            }
            placeholder="Search employee name, username, email, or role..."
            className="h-11 min-w-0 flex-1 rounded-md border border-[#143b28] bg-[#06110f] px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/45"
          />

          <button
            type="submit"
            className="rounded-md border border-[#254936] px-4 text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <FilterLink
            href="/dashboard/team"
            label="All"
            active={!filter}
          />

          <FilterLink
            href="/dashboard/team?view=investigators"
            label="Investigators"
            active={
              filter ===
              "investigators"
            }
          />

          <FilterLink
            href="/dashboard/team?view=analysts"
            label="Analysts"
            active={
              filter ===
              "analysts"
            }
          />

          <FilterLink
            href="/dashboard/team?view=administrators"
            label="Administrators"
            active={
              filter ===
              "administrators"
            }
          />

          <FilterLink
            href="/dashboard/team?view=super-administrators"
            label="Super Admins"
            active={
              filter ===
              "super-administrators"
            }
          />
        </div>
      </section>

      {/* ======================================================
          DIRECTORY
          ====================================================== */}

      <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] px-5 py-4">
          <div>
            <h2 className="font-semibold text-white">
              Personnel Directory
            </h2>

            <p className="mt-1 text-xs text-white/30">
              Select an employee to inspect their
              internal profile and case history.
            </p>
          </div>

          <span className="rounded border border-[#20dc73]/25 bg-[#20dc73]/5 px-2 py-1 font-mono text-xs text-[#20dc73]">
            {
              filteredRows.length
            }{" "}
            records
          </span>
        </div>

        {!filteredRows.length ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-white/35">
              No employees match this view.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#143b28]">
            {filteredRows.map(
              (item) => {
                const displayName =
                  item.full_name?.trim() ||
                  item.username

                return (
                  <Link
                    key={
                      item.id
                    }
                    href={`/dashboard/team/${item.id}`}
                    className="group block p-5 transition hover:bg-white/[0.025]"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      {/* ====================================
                          PERSON
                          ==================================== */}

                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#20dc73]/25 bg-[#20dc73]/10">
                          <span className="text-sm font-bold text-[#20dc73]">
                            {displayName
                              .charAt(
                                0,
                              )
                              .toUpperCase()}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-base font-semibold text-white">
                              {
                                displayName
                              }
                            </h3>

                            <span
                              className={`rounded border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${roleClasses(
                                item.role,
                              )}`}
                            >
                              {formatRole(
                                item.role,
                              )}
                            </span>

                            <span
                              className={`rounded border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${statusClasses(
                                item.status,
                              )}`}
                            >
                              {formatRole(
                                item.status,
                              )}
                            </span>
                          </div>

                          <p className="mt-1 break-all text-xs text-white/35">
                            {item.email}
                          </p>

                          <p className="mt-1 text-xs text-white/25">
                            @{item.username}
                          </p>
                        </div>
                      </div>

                      {/* ====================================
                          OPERATIONAL DATA
                          ==================================== */}

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:min-w-[610px]">
                        <Info
                          label="Active Cases"
                          value={String(
                            item.active_assignments ||
                              0,
                          )}
                        />

                        <Info
                          label="Pending"
                          value={String(
                            item.pending_assignments ||
                              0,
                          )}
                        />

                        <Info
                          label="Rejected"
                          value={String(
                            item.rejected_assignments ||
                              0,
                          )}
                        />

                        <Info
                          label="Last Assigned"
                          value={formatDate(
                            item.last_assigned_at,
                          )}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-white/20">
                        Profile ID:{" "}
                        <span className="font-mono">
                          {item.profile_id ||
                            "not linked"}
                        </span>
                      </span>

                      <span className="text-xs text-[#20dc73]/45 transition group-hover:text-[#20dc73]">
                        View Employee Profile →
                      </span>
                    </div>
                  </Link>
                )
              },
            )}
          </div>
        )}
      </section>
    </main>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-md border border-[#143b28] bg-[#06110f] p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-[#20dc73]">
        {value}
      </p>
    </div>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded border border-[#143b28] bg-black/20 p-3">
      <p className="text-[9px] uppercase tracking-[0.12em] text-white/30">
        {label}
      </p>

      <p className="mt-1 break-words text-xs text-white/65">
        {value}
      </p>
    </div>
  )
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-md border px-3 py-2 text-xs transition ${
        active
          ? "border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"
          : "border-white/8 bg-white/[0.02] text-white/40 hover:bg-white/[0.04] hover:text-white/70"
      }`}
    >
      {label}
    </Link>
  )
}