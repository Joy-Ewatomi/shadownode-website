"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  Fingerprint,
  FolderOpen,
  GitBranch,
  Loader2,
  MessageSquare,
  Network,
  Shield,
  Users,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type CaseData = {
  id: string
  case_number: string | null
  title: string | null
  description: string | null
  service_type: string | null
  status: string | null
  priority: string | null
  progress: number
  budget: number | null
  payment_status: string | null
  estimated_completion: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string | null
  updated_at: string | null
  investigator_username: string | null
}

type CaseStats = {
  entities: number
  relationships: number
  evidence: number
  updates: number
  notes: number
  reports?: number
  assigned_investigators: number
}

type TeamMember = {
  id: string
  case_id: string
  assigned_to: string
  assigned_by: string | null
  assigned_at: string | null
  removed_at: string | null
  user_id: string
  username: string | null
  email: string | null
  role: string | null
  assigned_by_username: string | null
}

type DashboardResponse = {
  case: CaseData
  stats: CaseStats
  team: TeamMember[]
}

function cleanText(
  value: string | null | undefined,
  fallback: string,
) {
  const result = value?.trim()

  return result || fallback
}

function formatDate(
  value: string | null | undefined,
) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  )
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return date.toLocaleString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  )
}

function formatStatus(
  value: string | null | undefined,
) {
  if (!value) {
    return "Unknown"
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function statusTone(
  status: string | null | undefined,
) {
  const normalized =
    status?.toLowerCase() || ""

  if (
    normalized.includes("completed") ||
    normalized.includes("closed")
  ) {
    return "border-[#1d6f48] bg-[#0a281b] text-[#63f0a1]"
  }

  if (
    normalized.includes("waiting") ||
    normalized.includes("pending")
  ) {
    return "border-[#604b17] bg-[#261f08] text-[#e6c95f]"
  }

  if (
    normalized.includes("rejected") ||
    normalized.includes("cancelled") ||
    normalized.includes("archived")
  ) {
    return "border-[#612828] bg-[#260e0e] text-[#f27a7a]"
  }

  return "border-[#175034] bg-[#071e14] text-[#4ce68e]"
}

function priorityTone(
  priority: string | null | undefined,
) {
  const normalized =
    priority?.toLowerCase() || ""

  if (normalized === "critical") {
    return "text-[#ff6d6d]"
  }

  if (normalized === "high") {
    return "text-[#ffbf68]"
  }

  if (normalized === "medium") {
    return "text-[#f3d36a]"
  }

  return "text-[#7ce7a7]"
}

const investigationTasks = [
  {
    number: "01",
    title: "Identity & Company Affiliation",
  },
  {
    number: "02",
    title: "Role & Appointment History",
  },
  {
    number: "03",
    title: "Residence & Date of Birth",
  },
  {
    number: "04",
    title: "Company Registration",
  },
  {
    number: "05",
    title: "Previous Company Name",
  },
  {
    number: "06",
    title: "Company Status",
  },
  {
    number: "07",
    title: "Historical Corporate Record",
  },
  {
    number: "08",
    title: "LinkedIn Identity",
  },
  {
    number: "09",
    title: "Corporate Email Intelligence",
  },
  {
    number: "10",
    title: "Historical Website Contact",
  },
  {
    number: "11",
    title: "Domain & DNS Intelligence",
  },
]

export default function CaseDashboard() {
  const params = useParams()

  const caseId = String(params.id || "")

  const [data, setData] =
    useState<DashboardResponse | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      if (!caseId) {
        setError("Case ID is missing")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `/api/cases/${encodeURIComponent(
            caseId,
          )}/dashboard`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        )

        const result =
          (await response.json()) as
            | DashboardResponse
            | { error?: string }

        if (!response.ok) {
          throw new Error(
            result &&
              "error" in result &&
              result.error
              ? result.error
              : "Failed to load case dashboard",
          )
        }

        if (!cancelled) {
          setData(
            result as DashboardResponse,
          )
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load case dashboard",
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [caseId])

  const activeTeam = useMemo(() => {
    if (!data?.team) {
      return []
    }

    return data.team.filter(
      (member) => !member.removed_at,
    )
  }, [data])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020604] text-white">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-[#20dc73]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Case Workspace...
          </div>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#020604] px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-xl border border-[#542323] bg-[#160909] p-8">
          <div className="flex items-start gap-4">
            <CircleAlert className="mt-0.5 h-6 w-6 shrink-0 text-[#ff6d6d]" />

            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#ff6d6d]">
                Case Access
              </p>

              <h1 className="mt-2 text-xl font-semibold">
                Unable to load case
              </h1>

              <p className="mt-2 text-sm text-white/60">
                {error ||
                  "No case data was returned."}
              </p>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className="mt-5 rounded-md border border-[#2a5a3f] bg-[#091b12] px-4 py-2 text-sm font-semibold text-[#5be998] transition hover:border-[#20dc73]/60 hover:bg-[#0d291b]"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const caseData = data.case
  const stats = data.stats

  const title = cleanText(
    caseData.title,
    "Investigation Case",
  )

  const caseNumber = cleanText(
    caseData.case_number,
    caseId,
  )

  const status = cleanText(
    caseData.status,
    "active",
  )

  const priority = cleanText(
    caseData.priority,
    "normal",
  )

  const progress = Math.min(
    100,
    Math.max(
      0,
      Number(caseData.progress || 0),
    ),
  )

  return (
    <main className="min-h-screen bg-[#020604] text-white">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* =================================================
              CASE HEADER
          ================================================= */}

          <section className="overflow-hidden rounded-xl border border-[#143b28] bg-[#06110f]">
            <div className="border-b border-[#143b28] bg-[radial-gradient(circle_at_top_right,rgba(32,220,115,0.10),transparent_35%)] p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-[#1c5438] bg-[#061a11] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]">
                      Case Operations
                    </span>

                    <span
                      className={`rounded border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusTone(
                        status,
                      )}`}
                    >
                      {formatStatus(status)}
                    </span>
                  </div>

                  <h1 className="mt-4 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {title}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/50">
                    <span className="font-mono">
                      {caseNumber}
                    </span>

                    <span className="text-white/20">
                      •
                    </span>

                    <span>
                      {cleanText(
                        caseData.service_type,
                        "Investigation",
                      )}
                    </span>

                    <span className="text-white/20">
                      •
                    </span>

                    <span
                      className={priorityTone(
                        priority,
                      )}
                    >
                      {formatStatus(priority)} Priority
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/dashboard/cases/${caseId}/team`}
                    className="inline-flex items-center gap-2 rounded-md bg-[#20dc73] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#39ed86]"
                  >
                    Manage Case
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Progress */}

            <div className="px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                    Investigation Progress
                  </p>

                  <p className="mt-1 text-sm text-white/60">
                    Operational progress across the current case.
                  </p>
                </div>

                <span className="font-mono text-xl font-bold text-[#20dc73]">
                  {progress}%
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black">
                <div
                  className="h-full rounded-full bg-[#20dc73] transition-all"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>
          </section>

          {/* =================================================
              STATISTICS
          ================================================= */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard
              icon={Users}
              label="Team"
              value={
                stats.assigned_investigators
              }
              href={`/dashboard/cases/${caseId}/team`}
            />

            <MetricCard
              icon={Fingerprint}
              label="Entities"
              value={stats.entities}
              href={`/dashboard/cases/${caseId}/graph`}
            />

            <MetricCard
              icon={GitBranch}
              label="Relationships"
              value={stats.relationships}
              href={`/dashboard/cases/${caseId}/graph`}
            />

            <MetricCard
              icon={FolderOpen}
              label="Evidence"
              value={stats.evidence}
              href={`/dashboard/cases/${caseId}/evidence`}
            />

            <MetricCard
              icon={Activity}
              label="Updates"
              value={stats.updates}
              href={`/dashboard/cases/${caseId}/timeline`}
            />

            <MetricCard
              icon={FileText}
              label="Reports"
              value={stats.reports ?? 0}
              href={`/dashboard/cases/${caseId}/reports`}
            />
          </section>

          {/* =================================================
              MAIN CONTENT
          ================================================= */}

          <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">

            <div className="space-y-6">

              {/* CASE SUMMARY */}

              <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
                <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4 sm:px-6">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]">
                      Case Overview
                    </p>

                    <h2 className="mt-1 text-lg font-semibold">
                      Investigation Summary
                    </h2>
                  </div>

                  <Shield className="h-5 w-5 text-[#20dc73]" />
                </div>

                <div className="p-5 sm:p-6">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-white/65">
                    {cleanText(
                      caseData.description,
                      "No investigation summary has been provided yet.",
                    )}
                  </p>
                </div>
              </section>

              {/* =================================================
                  CASE WORKSPACE
              ================================================= */}

              <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
                <div className="border-b border-[#143b28] px-5 py-4 sm:px-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]">
                    Operational Workspace
                  </p>

                  <h2 className="mt-1 text-lg font-semibold">
                    Case Workspace
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-white/40">
                    Access the operational systems attached to this investigation.
                  </p>
                </div>

                <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">

                  <WorkspaceLink
                    href={`/dashboard/cases/${caseId}/team`}
                    icon={Users}
                    title="Team"
                    description="Assignments and investigation personnel."
                  />

                  <WorkspaceLink
                    href={`/dashboard/cases/${caseId}/evidence`}
                    icon={FolderOpen}
                    title="Evidence"
                    description="Case files, hashes and custody."
                  />

                  <WorkspaceLink
                    href={`/dashboard/cases/${caseId}/messages`}
                    icon={MessageSquare}
                    title="Messages"
                    description="Secure case communication."
                  />

                  <WorkspaceLink
                    href={`/dashboard/cases/${caseId}/reports`}
                    icon={FileText}
                    title="Reports"
                    description="Investigation reports and findings."
                  />

                  <WorkspaceLink
                    href={`/dashboard/cases/${caseId}/timeline`}
                    icon={CalendarDays}
                    title="Timeline"
                    description="Chronological case activity."
                  />

                  <WorkspaceLink
                    href={`/dashboard/cases/${caseId}/graph`}
                    icon={Network}
                    title="Investigation Graph"
                    description="Entities, links and relationships."
                  />

                </div>
              </section>

              {/* =================================================
                  INVESTIGATION WORKSTREAMS
              ================================================= */}

              <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
                <div className="border-b border-[#143b28] px-5 py-4 sm:px-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]">
                    Intelligence Workstreams
                  </p>

                  <h2 className="mt-1 text-lg font-semibold">
                    Investigation Tasks
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-white/40">
                    Investigation objectives attached to this case.
                  </p>
                </div>

                <div className="grid gap-3 p-5 sm:p-6 md:grid-cols-2">

                  {investigationTasks.map(
                    (task) => (
                      <div
                        key={task.number}
                        className="group flex items-center gap-4 rounded-lg border border-[#123a2d] bg-black/20 p-4 transition hover:border-[#206344] hover:bg-[#071610]"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#20dc73]/20 bg-[#20dc73]/10 font-mono text-xs font-bold text-[#20dc73]">
                          {task.number}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-5 text-white">
                            {task.title}
                          </p>

                          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/20">
                            Investigation Task
                          </p>
                        </div>

                        <span className="text-xs text-white/20 transition group-hover:text-[#20dc73]">
                          →
                        </span>
                      </div>
                    ),
                  )}

                </div>
              </section>

            </div>

            {/* =================================================
                SIDEBAR
            ================================================= */}

            <aside className="space-y-6">

              {/* TEAM */}

              <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
                <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]">
                      Personnel
                    </p>

                    <h2 className="mt-1 font-semibold">
                      Investigation Team
                    </h2>
                  </div>

                  <Link
                    href={`/dashboard/cases/${caseId}/team`}
                    className="text-xs font-semibold text-[#20dc73] hover:underline"
                  >
                    Manage
                  </Link>
                </div>

                <div className="p-5">
                  {activeTeam.length ? (
                    <div className="space-y-3">
                      {activeTeam
                        .slice(0, 5)
                        .map(
                          (member) => (
                            <div
                              key={
                                member.id
                              }
                              className="rounded-lg border border-white/8 bg-black/20 p-3"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#1d5137] bg-[#0a1d13]">
                                  <Users className="h-4 w-4 text-[#20dc73]" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-white">
                                    {cleanText(
                                      member.username,
                                      cleanText(
                                        member.email,
                                        "Assigned member",
                                      ),
                                    )}
                                  </p>

                                  <p className="mt-0.5 text-xs capitalize text-white/40">
                                    {cleanText(
                                      member.role,
                                      "team member",
                                    ).replace(
                                      /_/g,
                                      " ",
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ),
                        )}

                      {activeTeam.length >
                        5 ? (
                        <Link
                          href={`/dashboard/cases/${caseId}/team`}
                          className="block text-center text-xs text-[#20dc73] hover:underline"
                        >
                          View{" "}
                          {activeTeam.length -
                            5}{" "}
                          more
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-white/10 p-5 text-center">
                      <Users className="mx-auto h-6 w-6 text-white/20" />

                      <p className="mt-2 text-sm text-white/45">
                        No active team members
                      </p>

                      <Link
                        href={`/dashboard/cases/${caseId}/team`}
                        className="mt-3 inline-flex text-xs font-semibold text-[#20dc73] hover:underline"
                      >
                        Review Assignments
                      </Link>
                    </div>
                  )}
                </div>
              </section>

              {/* CASE DETAILS */}

              <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
                <div className="border-b border-[#143b28] px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]">
                    Case Metadata
                  </p>

                  <h2 className="mt-1 font-semibold">
                    Operational Details
                  </h2>
                </div>

                <div className="divide-y divide-white/6">
                  <DetailRow
                    label="Case Number"
                    value={caseNumber}
                    mono
                  />

                  <DetailRow
                    label="Service"
                    value={cleanText(
                      caseData.service_type,
                      "Investigation",
                    )}
                  />

                  <DetailRow
                    label="Priority"
                    value={formatStatus(
                      priority,
                    )}
                    valueClassName={priorityTone(
                      priority,
                    )}
                  />

                  <DetailRow
                    label="Payment"
                    value={formatStatus(
                      cleanText(
                        caseData.payment_status,
                        "unknown",
                      ),
                    )}
                  />

                  <DetailRow
                    label="Started"
                    value={formatDate(
                      caseData.started_at,
                    )}
                  />

                  <DetailRow
                    label="Estimated Completion"
                    value={formatDate(
                      caseData.estimated_completion,
                    )}
                  />

                  <DetailRow
                    label="Last Updated"
                    value={formatDateTime(
                      caseData.updated_at,
                    )}
                  />
                </div>
              </section>

              {/* PROGRESS STATUS */}

              <section className="rounded-xl border border-[#143b28] bg-[#06110f] p-5">
                <div className="flex items-start gap-3">
                  {progress >= 100 ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#20dc73]" />
                  ) : (
                    <Clock3 className="mt-0.5 h-5 w-5 text-[#d6b95c]" />
                  )}

                  <div>
                    <h2 className="font-semibold">
                      {progress >= 100
                        ? "Investigation Ready for Completion"
                        : "Investigation In Progress"}
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-white/45">
                      {progress >= 100
                        ? "The case has reached 100% operational progress."
                        : "Continue investigation activity, evidence review and reporting until the case is ready for completion."}
                    </p>
                  </div>
                </div>
              </section>

            </aside>
          </section>

          {/* FOOTER */}

          <div className="flex flex-col gap-2 border-t border-[#143b28] pt-4 text-[10px] uppercase tracking-[0.12em] text-white/25 sm:flex-row sm:items-center sm:justify-between">
            <span>
              ShadowNode Investigation Operations
            </span>

            <span className="font-mono">
              Case ID: {caseId}
            </span>
          </div>

        </div>
      </div>
    </main>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Users
  label: string
  value: number
  href: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-[#143b28] bg-[#06110f] p-4 transition hover:border-[#206344] hover:bg-[#071610]"
    >
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-[#20dc73]" />

        <ArrowRight className="h-3.5 w-3.5 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-[#20dc73]" />
      </div>

      <p className="mt-4 text-xs uppercase tracking-[0.12em] text-white/40">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-white">
        {value}
      </p>
    </Link>
  )
}

function WorkspaceLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: typeof Network
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-[#123a2d] bg-black/20 p-4 transition hover:border-[#206344] hover:bg-[#071610]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#17462f] bg-[#081a11]">
          <Icon className="h-4 w-4 text-[#20dc73]" />
        </div>

        <ArrowRight className="ml-auto h-4 w-4 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-[#20dc73]" />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-white/40">
        {description}
      </p>
    </Link>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
  valueClassName = "",
}: {
  label: string
  value: string
  mono?: boolean
  valueClassName?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <span className="text-xs text-white/35">
        {label}
      </span>

      <span
        className={`text-right text-xs text-white/70 ${
          mono ? "font-mono" : ""
        } ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  )
}