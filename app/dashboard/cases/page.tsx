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
  active_operator_summary: string | null

  investigation_objective: string | null
  client_username: string | null
  client_email: string | null

  subject_type: string | null
  subject_full_name: string | null

  assignment_count: number
  pending_assignment_count: number
  approved_assignment_count: number

  evidence_count: number
  report_count: number
  unread_notification_count: number
}

function formatStatus(value: string | null) {
  if (!value) return "Unknown"

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatPriority(value: string | null) {
  if (!value) return "Normal"

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getStatusClass(value: string | null) {
  switch (value) {
    case "active":
    case "in_progress":
    case "investigation_in_progress":
    case "assigned":
    case "completed":
    case "delivered":
    case "closed":
      return "border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"

    case "awaiting_assignment":
    case "pending_assignment":
    case "awaiting_client":
    case "waiting_client":
    case "waiting_evidence":
    case "report_review":
      return "border-amber-400/25 bg-amber-400/10 text-amber-300"

    case "archived":
      return "border-white/10 bg-white/[0.03] text-white/35"

    default:
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
  }
}

function getPriorityClass(value: string | null) {
  switch (value) {
    case "critical":
      return "border-red-400/25 bg-red-400/10 text-red-300"

    case "high":
      return "border-amber-400/25 bg-amber-400/10 text-amber-300"

    case "low":
      return "border-white/10 bg-white/[0.03] text-white/40"

    default:
      return "border-white/10 bg-white/[0.03] text-white/55"
  }
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

        (
          SELECT STRING_AGG(
            COALESCE(assigned_user.username, 'Assigned operator') || ' (' ||
            REPLACE(COALESCE(active_assignment.assignment_role, 'investigator'), '_', ' ') || ')',
            ', '
            ORDER BY active_assignment.assigned_at ASC
          )
          FROM case_assignments active_assignment
          JOIN user_profiles assigned_profile
            ON assigned_profile.id = active_assignment.assigned_to
          JOIN app_users assigned_user
            ON assigned_user.id = assigned_profile.user_id
          WHERE active_assignment.case_id = c.id
            AND active_assignment.removed_at IS NULL
            AND COALESCE(active_assignment.status, 'assigned') IN (
              'assigned',
              'approved',
              'active',
              'accepted'
            )
        ) AS active_operator_summary,

        r.investigation_objective,

        client_user.username AS client_username,
        r.client_email,

        r.subject_type,
        r.subject_full_name,

        COUNT(
          DISTINCT CASE
            WHEN ca.id IS NOT NULL
              AND ca.removed_at IS NULL
            THEN ca.id
          END
        )::int AS assignment_count,

        COUNT(
          DISTINCT CASE
            WHEN ca.id IS NOT NULL
              AND ca.removed_at IS NULL
              AND ca.status = 'pending'
            THEN ca.id
          END
        )::int AS pending_assignment_count,

        COUNT(
          DISTINCT CASE
            WHEN ca.id IS NOT NULL
              AND ca.removed_at IS NULL
              AND ca.status IN (
                'approved',
                'active',
                'accepted',
                'assigned'
              )
            THEN ca.id
          END
        )::int AS approved_assignment_count,

        COUNT(
          DISTINCT ff.id
        )::int AS evidence_count,

        COUNT(
          DISTINCT cr.id
        )::int AS report_count,

        (
          SELECT COUNT(*)::int
          FROM notifications n
          WHERE n.user_id = $3
            AND n.is_read = false
            AND (
              n.case_id::text = c.id::text
              OR n.metadata->>'case_id' = c.id::text
              OR n.metadata->>'caseId' = c.id::text
              OR (
                COALESCE(n.metadata->>'resource_type', n.metadata->>'resourceType') = 'case'
                AND COALESCE(n.metadata->>'resource_id', n.metadata->>'resourceId') = c.id::text
              )
            )
        ) AS unread_notification_count

      FROM cases c

      LEFT JOIN requests r
        ON r.converted_case_id = c.id

      LEFT JOIN app_users client_user
        ON client_user.id = r.user_id

      LEFT JOIN user_profiles investigator_profile
        ON investigator_profile.id = c.assigned_to

      LEFT JOIN app_users investigator
        ON investigator.id = investigator_profile.user_id

      LEFT JOIN case_assignments ca
        ON ca.case_id = c.id

      LEFT JOIN forensic_files ff
        ON ff.case_id = c.id

      LEFT JOIN case_reports cr
        ON cr.case_id = c.id

      WHERE
        $1::boolean = TRUE
        OR c.client_profile_id = $2::uuid
        OR c.assigned_to = $2::uuid
        OR EXISTS (
          SELECT 1
          FROM case_assignments assigned_case
          WHERE
            assigned_case.case_id = c.id
            AND assigned_case.assigned_to = $2::uuid
            AND assigned_case.removed_at IS NULL
            AND COALESCE(
              assigned_case.status,
              'assigned'
            ) IN (
              'assigned',
              'approved',
              'active',
              'accepted'
            )
        )

      GROUP BY
        c.id,
        investigator.username,
        r.investigation_objective,
        client_user.username,
        r.client_email,
        r.subject_type,
        r.subject_full_name

      ORDER BY
        c.updated_at DESC,
        c.created_at DESC
    `,
    [isAdmin, profileId, user.id],
  )

  const metrics = {
    total: rows.length,

    active: rows.filter((item) =>
      [
        "active",
        "in_progress",
        "assigned",
        "investigation_in_progress",
      ].includes(item.status || ""),
    ).length,

    awaiting: rows.filter((item) =>
      [
        "awaiting_payment",
        "awaiting_assignment",
        "pending_assignment",
        "awaiting_client",
        "waiting_client",
        "waiting_evidence",
      ].includes(item.status || ""),
    ).length,

    pendingAssignments: rows.reduce(
      (total, item) =>
        total +
        (item.pending_assignment_count || 0),
      0,
    ),

    completed: rows.filter((item) =>
      [
        "completed",
        "closed",
        "delivered",
      ].includes(item.status || ""),
    ).length,

    critical: rows.filter(
      (item) => item.priority === "critical",
    ).length,
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Investigation Management
            </p>

            <h1 className="mt-3 text-3xl font-bold text-white">
              Cases
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
              Manage live investigations, review client objectives,
              monitor assignments, evidence, reports, and operational
              case progress.
            </p>
          </div>

          {isAdmin ? (
            <div className="rounded border border-[#20dc73]/20 bg-[#20dc73]/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#20dc73]/80">
              Administrator View
            </div>
          ) : (
            <div className="rounded border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
              Client / Assigned View
            </div>
          )}
        </div>
      </header>

      {/* =========================================================
          METRICS
          ========================================================= */}

      <section
        className={`grid gap-3 ${
          isAdmin
            ? "md:grid-cols-6"
            : "md:grid-cols-4"
        }`}
      >
        <Metric
          label="Total"
          value={metrics.total}
        />

        <Metric
          label="Active"
          value={metrics.active}
        />

        <Metric
          label="Awaiting Action"
          value={metrics.awaiting}
        />

        {isAdmin ? (
          <Metric
            label="Pending Assignments"
            value={metrics.pendingAssignments}
          />
        ) : null}

        <Metric
          label="Critical"
          value={metrics.critical}
        />

        <Metric
          label="Completed"
          value={metrics.completed}
        />
      </section>

      {/* =========================================================
          CASE LIST
          ========================================================= */}

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
            className={[
              "group block rounded-md border p-5 transition hover:border-[#20dc73]/55 hover:bg-[#071510]",
              item.unread_notification_count > 0
                ? "border-[#20dc73]/40 bg-[#20dc73]/5"
                : "border-[#143b28] bg-[#06110f]",
            ].join(" ")}
          >
            {/* =====================================================
                HEADER
                ===================================================== */}

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="break-all font-mono text-xs uppercase tracking-[0.14em] text-[#20dc73]">
                  {item.case_number}
                </p>

                <h2 className="mt-2 break-words text-lg font-semibold text-white">
                  {item.title}
                </h2>

                {item.unread_notification_count > 0 ? (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded border border-[#20dc73]/40 bg-[#20dc73]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#20dc73]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#20dc73]" />
                    NEW
                    {item.unread_notification_count > 1
                      ? ` ${item.unread_notification_count}`
                      : ""}
                  </span>
                ) : null}

                {item.investigation_objective ? (
                  <div className="mt-3 rounded border border-[#20dc73]/10 bg-[#20dc73]/[0.025] p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#20dc73]/55">
                      Investigation Objective
                    </p>

                    <p className="mt-1 line-clamp-3 break-words text-sm leading-6 text-white/60">
                      {item.investigation_objective}
                    </p>
                  </div>
                ) : item.description ? (
                  <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-white/45">
                    {item.description}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <span
                  className={`rounded border px-2 py-1 text-xs uppercase tracking-[0.12em] ${getStatusClass(
                    item.status,
                  )}`}
                >
                  {formatStatus(
                    item.status,
                  )}
                </span>

                <span
                  className={`rounded border px-2 py-1 text-xs uppercase tracking-[0.12em] ${getPriorityClass(
                    item.priority,
                  )}`}
                >
                  {formatPriority(
                    item.priority,
                  )}
                </span>
              </div>
            </div>

            {/* =====================================================
                DETAILS
                ===================================================== */}

            <div className="mt-4 grid gap-3 text-xs text-white/50 sm:grid-cols-2 lg:grid-cols-4">
              <Info
                label="Service"
                value={
                  item.service_type ||
                  "Unspecified"
                }
              />

              <Info
                label="Payment"
                value={
                  item.payment_status ||
                  "Pending"
                }
              />

              <Info
                label="Progress"
                value={`${item.progress ?? 0}%`}
              />

              <Info
                label="Active team"
                value={
                  item.active_operator_summary ||
                  "Unassigned"
                }
              />
            </div>

            {/* =====================================================
                ADMIN / SUBJECT DETAILS
                ===================================================== */}

            <div className="mt-3 grid gap-3 text-xs text-white/50 sm:grid-cols-2 lg:grid-cols-4">
              {isAdmin ? (
                <>
                  <Info
                    label="Client"
                    value={
                      item.client_username ||
                      item.client_email ||
                      "Unknown"
                    }
                  />

                  <Info
                    label="Subject"
                    value={
                      item.subject_full_name ||
                      item.subject_type ||
                      "Not specified"
                    }
                  />

                  <Info
                    label="Assignments"
                    value={String(
                      item.assignment_count || 0,
                    )}
                  />

                  <Info
                    label="Files / Reports"
                    value={`${item.evidence_count || 0} / ${item.report_count || 0}`}
                  />
                </>
              ) : (
                <>
                  <Info
                    label="Subject"
                    value={
                      item.subject_full_name ||
                      item.subject_type ||
                      "Not specified"
                    }
                  />

                  <Info
                    label="Active team"
                    value={
                      item.active_operator_summary ||
                      "Not assigned"
                    }
                  />

                  <Info
                    label="Reports"
                    value={String(
                      item.report_count || 0,
                    )}
                  />

                  <Info
                    label="Updated"
                    value={formatDate(
                      item.updated_at,
                    )}
                  />
                </>
              )}
            </div>

            {/* =====================================================
                ASSIGNMENT STATUS
                ===================================================== */}

            {isAdmin &&
            item.pending_assignment_count >
              0 ? (
              <div className="mt-4 flex items-center justify-between rounded border border-amber-400/15 bg-amber-400/[0.035] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />

                  <span className="text-xs text-amber-200/75">
                    {item.pending_assignment_count} assignment
                    {item.pending_assignment_count ===
                    1
                      ? ""
                      : "s"}{" "}
                    awaiting Super Administrator approval
                  </span>
                </div>

                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-amber-300/45">
                  Review Required
                </span>
              </div>
            ) : null}

            {/* =====================================================
                PROGRESS BAR
                ===================================================== */}

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-white/25">
                <span>Case Progress</span>

                <span>
                  {item.progress ?? 0}%
                </span>
              </div>

              <div className="h-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-[#20dc73]/70 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        item.progress ?? 0,
                      ),
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* =====================================================
                FOOTER
                ===================================================== */}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.11em] text-white/25">
              <span>
                Created{" "}
                {formatDate(
                  item.created_at,
                )}
              </span>

              <span className="text-[#20dc73]/50 transition group-hover:text-[#20dc73]">
                Open Case →
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  )
}

/* ===============================================================
   HELPERS
   =============================================================== */

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "Unknown"
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
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
      <p className="text-xs uppercase tracking-[0.14em] text-white/40">
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
    <div className="min-w-0 rounded border border-[#143b28] bg-black/25 p-3">
      <p className="uppercase tracking-[0.12em] text-white/35">
        {label}
      </p>

      <p className="mt-1 break-words text-white/70">
        {value}
      </p>
    </div>
  )
}
