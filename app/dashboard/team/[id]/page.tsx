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

  assignment_role: string | null
  assignment_status: string | null

  assigned_at: string | null
  deadline: string | null

  removed_at: string | null

  accepted_at: string | null
  rejected_at: string | null
  rejection_reason: string | null

  notes: string | null

  assigned_by_username: string | null
}

function formatRole(
  value: string | null,
) {
  if (!value) {
    return "Operator"
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    )
}

function formatStatus(
  value: string | null,
) {
  if (!value) {
    return "Unknown"
  }

  return value
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
    return "—"
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  )
}

function statusClasses(
  status: string | null,
) {
  switch (
    status?.toLowerCase()
  ) {
    case "approved":
    case "active":
    case "accepted":
    case "assigned":
      return "border-[#20dc73]/25 bg-[#20dc73]/10 text-[#20dc73]"

    case "pending":
      return "border-amber-400/25 bg-amber-400/10 text-amber-300"

    case "rejected":
      return "border-red-400/25 bg-red-400/10 text-red-300"

    case "removed":
      return "border-white/10 bg-white/[0.03] text-white/35"

    default:
      return "border-white/10 bg-white/[0.03] text-white/45"
  }
}

function roleClasses(
  role: string | null,
) {
  switch (
    role?.toLowerCase()
  ) {
    case "investigator":
      return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"

    case "analyst":
      return "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"

    case "administrator":
      return "border-blue-400/25 bg-blue-400/10 text-blue-300"

    case "super_administrator":
    case "super-administrator":
      return "border-purple-400/25 bg-purple-400/10 text-purple-300"

    default:
      return "border-white/10 bg-white/[0.03] text-white/45"
  }
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded border border-[#143b28] bg-black/25 p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">
        {label}
      </p>

      <p className="mt-1 break-words text-sm text-white/70">
        {value}
      </p>
    </div>
  )
}

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
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

  const { id } =
    await params

  const operator =
    await query<OperatorRow>(
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

        LEFT JOIN user_profiles up
          ON up.user_id = au.id

        WHERE au.id = $1

        LIMIT 1
      `,
      [id],
    )

  const item =
    operator.rows[0]

  if (!item) {
    notFound()
  }

  const assignments =
    item.profile_id
      ? await query<AssignmentRow>(
          `
            SELECT
              ca.id,
              ca.case_id,

              c.case_number,
              c.title AS case_title,
              c.status AS case_status,

              ca.assignment_role,
              ca.status AS assignment_status,

              ca.assigned_at,
              ca.deadline,

              ca.removed_at,

              ca.accepted_at,
              ca.rejected_at,
              ca.rejection_reason,

              ca.notes,

              assigner.username
                AS assigned_by_username

            FROM case_assignments ca

            INNER JOIN cases c
              ON c.id = ca.case_id

            LEFT JOIN user_profiles assigner_profile
              ON assigner_profile.id =
                ca.assigned_by

            LEFT JOIN app_users assigner
              ON assigner.id =
                assigner_profile.user_id

            WHERE
              ca.assigned_to = $1

            ORDER BY
              ca.assigned_at DESC
          `,
          [item.profile_id],
        )
      : {
          rows: [] as AssignmentRow[],
        }

  const activeAssignments =
    assignments.rows.filter(
      (assignment) =>
        !assignment.removed_at &&
        [
          "assigned",
          "approved",
          "active",
          "accepted",
        ].includes(
          assignment.assignment_status ||
            "assigned",
        ),
    )

  const pendingAssignments =
    assignments.rows.filter(
      (assignment) =>
        !assignment.removed_at &&
        assignment.assignment_status ===
          "pending",
    )

  const rejectedAssignments =
    assignments.rows.filter(
      (assignment) =>
        assignment.assignment_status ===
        "rejected",
    )

  const removedAssignments =
    assignments.rows.filter(
      (assignment) =>
        Boolean(
          assignment.removed_at,
        ),
    )

  const displayName =
    item.full_name?.trim() ||
    item.username

  return (
    <main className="space-y-6">
      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="border-b border-[#143b28] pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#20dc73]/25 bg-[#20dc73]/10 text-xl font-bold text-[#20dc73]">
              {displayName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
                Personnel Profile
              </p>

              <h1 className="mt-2 break-words text-3xl font-bold text-white">
                {displayName}
              </h1>

              <p className="mt-2 break-all text-sm text-white/45">
                @{item.username}
              </p>

              <p className="mt-1 break-all text-sm text-white/35">
                {item.email}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${roleClasses(
                    item.role,
                  )}`}
                >
                  {formatRole(
                    item.role,
                  )}
                </span>

                <span
                  className={`rounded border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusClasses(
                    item.status,
                  )}`}
                >
                  {formatStatus(
                    item.status,
                  )}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/team"
            className="inline-flex w-fit rounded-md border border-[#254936] px-4 py-2.5 text-sm text-white/55 transition hover:bg-white/5 hover:text-white"
          >
            ← Back to Team
          </Link>
        </div>
      </header>

      {/* ======================================================
          SUMMARY
          ====================================================== */}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric
          label="Active Cases"
          value={
            activeAssignments.length
          }
        />

        <Metric
          label="Pending"
          value={
            pendingAssignments.length
          }
        />

        <Metric
          label="Rejected"
          value={
            rejectedAssignments.length
          }
        />

        <Metric
          label="Assignment Records"
          value={
            assignments.rows.length
          }
        />

        <Metric
          label="Profile"
          value={
            item.profile_id
              ? 1
              : 0
          }
        />
      </section>

      {/* ======================================================
          EMPLOYEE INFORMATION
          ====================================================== */}

      <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
        <div className="border-b border-[#143b28] px-5 py-4">
          <h2 className="font-semibold text-white">
            Employee Information
          </h2>

          <p className="mt-1 text-xs text-white/30">
            Current identity and account information from the
            ShadowNode personnel system.
          </p>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Info
            label="Full Name"
            value={
              item.full_name ||
              item.username
            }
          />

          <Info
            label="Username"
            value={
              item.username
            }
          />

          <Info
            label="Email"
            value={
              item.email
            }
          />

          <Info
            label="System Role"
            value={formatRole(
              item.role,
            )}
          />

          <Info
            label="Account Status"
            value={formatStatus(
              item.status,
            )}
          />

          <Info
            label="Profile"
            value={
              item.profile_id
                ? "Linked"
                : "Not linked"
            }
          />

          <Info
            label="Account Created"
            value={formatDate(
              item.created_at,
            )}
          />

          <Info
            label="Last Account Update"
            value={formatDate(
              item.updated_at,
            )}
          />
        </div>
      </section>

      {/* ======================================================
          CURRENT WORKLOAD
          ====================================================== */}

      <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
        <div className="border-b border-[#143b28] px-5 py-4">
          <h2 className="font-semibold text-white">
            Current Workload
          </h2>

          <p className="mt-1 text-xs text-white/30">
            Cases currently assigned to this employee.
          </p>
        </div>

        {activeAssignments.length ? (
          <div className="divide-y divide-[#143b28]">
            {activeAssignments.map(
              (assignment) => (
                <Link
                  key={
                    assignment.id
                  }
                  href={`/dashboard/cases/${assignment.case_id}`}
                  className="block p-5 transition hover:bg-white/[0.025]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-mono text-xs text-[#20dc73]">
                        {
                          assignment.case_number
                        }
                      </p>

                      <h3 className="mt-2 break-words text-sm font-semibold text-white">
                        {
                          assignment.case_title
                        }
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded border px-2 py-1 text-[10px] ${roleClasses(
                            assignment.assignment_role,
                          )}`}
                        >
                          {formatRole(
                            assignment.assignment_role,
                          )}
                        </span>

                        <span
                          className={`rounded border px-2 py-1 text-[10px] ${statusClasses(
                            assignment.assignment_status,
                          )}`}
                        >
                          {formatStatus(
                            assignment.assignment_status,
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px]">
                      <Info
                        label="Case Status"
                        value={formatStatus(
                          assignment.case_status,
                        )}
                      />

                      <Info
                        label="Deadline"
                        value={formatDate(
                          assignment.deadline,
                        )}
                      />
                    </div>
                  </div>
                </Link>
              ),
            )}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-white/35">
              No active case assignments.
            </p>
          </div>
        )}
      </section>

      {/* ======================================================
          PENDING ASSIGNMENTS
          ====================================================== */}

      {pendingAssignments.length ? (
        <section className="rounded-xl border border-amber-500/15 bg-[#06110f]">
          <div className="border-b border-amber-500/10 px-5 py-4">
            <h2 className="font-semibold text-white">
              Pending Assignments
            </h2>

            <p className="mt-1 text-xs text-amber-300/45">
              These assignment proposals have not yet been
              approved by a Super Administrator.
            </p>
          </div>

          <div className="divide-y divide-amber-500/10">
            {pendingAssignments.map(
              (assignment) => (
                <div
                  key={
                    assignment.id
                  }
                  className="p-5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-mono text-xs text-[#20dc73]">
                        {
                          assignment.case_number
                        }
                      </p>

                      <h3 className="mt-2 text-sm font-semibold text-white">
                        {
                          assignment.case_title
                        }
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded border px-2 py-1 text-[10px] ${roleClasses(
                            assignment.assignment_role,
                          )}`}
                        >
                          {formatRole(
                            assignment.assignment_role,
                          )}
                        </span>

                        <span
                          className={`rounded border px-2 py-1 text-[10px] ${statusClasses(
                            assignment.assignment_status,
                          )}`}
                        >
                          Pending Approval
                        </span>
                      </div>
                    </div>

                    <div className="text-left text-xs text-white/35 lg:text-right">
                      <p>
                        Proposed{" "}
                        {formatDate(
                          assignment.assigned_at,
                        )}
                      </p>

                      {assignment.assigned_by_username ? (
                        <p className="mt-1">
                          By{" "}
                          {
                            assignment.assigned_by_username
                          }
                        </p>
                      ) : null}

                      {assignment.deadline ? (
                        <p className="mt-1">
                          Deadline{" "}
                          {formatDate(
                            assignment.deadline,
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {assignment.notes ? (
                    <div className="mt-4 rounded-md border border-white/6 bg-black/15 p-3 text-xs leading-5 text-white/45">
                      {assignment.notes}
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}

      {/* ======================================================
          REJECTED ASSIGNMENTS
          ====================================================== */}

      {rejectedAssignments.length ? (
        <section className="rounded-xl border border-red-500/10 bg-[#06110f]">
          <div className="border-b border-red-500/10 px-5 py-4">
            <h2 className="font-semibold text-white">
              Rejected Assignments
            </h2>

            <p className="mt-1 text-xs text-white/30">
              Previous assignment proposals that were rejected.
            </p>
          </div>

          <div className="divide-y divide-red-500/10">
            {rejectedAssignments.map(
              (assignment) => (
                <div
                  key={
                    assignment.id
                  }
                  className="p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-mono text-xs text-[#20dc73]">
                        {
                          assignment.case_number
                        }
                      </p>

                      <h3 className="mt-2 text-sm font-semibold text-white/75">
                        {
                          assignment.case_title
                        }
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded border px-2 py-1 text-[10px] ${roleClasses(
                            assignment.assignment_role,
                          )}`}
                        >
                          {formatRole(
                            assignment.assignment_role,
                          )}
                        </span>

                        <span
                          className={`rounded border px-2 py-1 text-[10px] ${statusClasses(
                            "rejected",
                          )}`}
                        >
                          Rejected
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-white/25">
                      {formatDate(
                        assignment.rejected_at,
                      )}
                    </p>
                  </div>

                  {assignment.rejection_reason ? (
                    <div className="mt-4 rounded-md border border-red-500/10 bg-red-500/[0.025] p-3 text-xs leading-5 text-red-300/60">
                      <span className="font-semibold text-red-300/75">
                        Reason:
                      </span>{" "}
                      {
                        assignment.rejection_reason
                      }
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}

      {/* ======================================================
          ASSIGNMENT HISTORY
          ====================================================== */}

      <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
        <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4">
          <div>
            <h2 className="font-semibold text-white">
              Assignment History
            </h2>

            <p className="mt-1 text-xs text-white/30">
              Complete case-assignment history for this employee.
            </p>
          </div>

          <span className="rounded border border-[#20dc73]/20 px-2 py-1 text-[10px] text-[#20dc73]/70">
            {
              assignments.rows.length
            }{" "}
            records
          </span>
        </div>

        {assignments.rows.length ? (
          <div className="divide-y divide-[#143b28]">
            {assignments.rows.map(
              (assignment) => (
                <Link
                  key={
                    assignment.id
                  }
                  href={`/dashboard/cases/${assignment.case_id}`}
                  className="block p-5 transition hover:bg-white/[0.025]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-mono text-xs text-[#20dc73]">
                        {
                          assignment.case_number
                        }
                      </p>

                      <h3 className="mt-2 break-words text-sm font-semibold text-white/75">
                        {
                          assignment.case_title
                        }
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {assignment.assignment_role ? (
                          <span
                            className={`rounded border px-2 py-1 text-[10px] ${roleClasses(
                              assignment.assignment_role,
                            )}`}
                          >
                            {formatRole(
                              assignment.assignment_role,
                            )}
                          </span>
                        ) : null}

                        <span
                          className={`rounded border px-2 py-1 text-[10px] ${statusClasses(
                            assignment.removed_at
                              ? "removed"
                              : assignment.assignment_status,
                          )}`}
                        >
                          {assignment.removed_at
                            ? "Removed"
                            : formatStatus(
                                assignment.assignment_status,
                              )}
                        </span>
                      </div>
                    </div>

                    <div className="text-left text-xs text-white/30 lg:text-right">
                      <p>
                        Assigned{" "}
                        {formatDate(
                          assignment.assigned_at,
                        )}
                      </p>

                      {assignment.removed_at ? (
                        <p className="mt-1">
                          Removed{" "}
                          {formatDate(
                            assignment.removed_at,
                          )}
                        </p>
                      ) : null}

                      {assignment.assigned_by_username ? (
                        <p className="mt-1">
                          By{" "}
                          {
                            assignment.assigned_by_username
                          }
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ),
            )}
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-sm text-white/30">
            No assignment records have been recorded for this employee.
          </div>
        )}
      </section>

      {/* ======================================================
          SECURITY NOTE
          ====================================================== */}

      <section className="rounded-xl border border-[#143b28] bg-[#06110f] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#20dc73]/60">
          Personnel Security
        </p>

        <p className="mt-2 text-sm leading-6 text-white/40">
          Authentication, MFA, permissions, and account security
          remain managed through the existing ShadowNode identity
          system. This profile does not duplicate credentials or
          security secrets.
        </p>
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