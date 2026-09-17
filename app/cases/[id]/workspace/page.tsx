"use client"

import Timeline from "@/components/cases/Timeline"
import MessagePanel from "@/components/cases/MessagePanel"
import { ClientNotificationProvider } from "@/components/notifications/ClientNotificationProvider"
import EvidencePanel from "@/components/evidence/EvidencePanel"
import InvestigationWorkspaceFoundation from "@/components/investigation/InvestigationWorkspaceFoundation"
import ReportBuilder from "@/components/reports/ReportBuilder"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  FileText,
  GitBranch,
  Loader2,
  Network,
  RefreshCw,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

type CaseData = {
  id: string
  case_number: string | null
  title: string | null
  description: string | null
  service_type: string | null
  status: string | null
  priority: string | null
  progress: number | null
  budget: number | null
  payment_status: string | null
  estimated_completion: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string | null
  updated_at: string | null
  assigned_to?: {
    username: string | null
  } | null
}

type WorkspaceStats = {
  entities: number
  relationships: number
  evidence: number
  updates: number
  notes: number
  assigned_investigators: number
  reports?: number
}

type TeamMember = {
  id: string
  username: string | null
  email: string | null
  role: string | null
  full_name: string | null
}

type DashboardData = {
  case: CaseData
  stats: WorkspaceStats
  team: TeamMember[]
}

function numberValue(value: unknown) {
  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

function labelValue(
  value: string | null | undefined,
) {
  if (!value) {
    return "—"
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
    normalized.includes("pending") ||
    normalized.includes("waiting")
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

export default function InvestigatorCaseWorkspace() {
  const params = useParams()

  const caseId = String(
    params.id || "",
  )

  const [data, setData] =
    useState<DashboardData | null>(
      null,
    )

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const loadDashboard = useCallback(
    async (refresh = false) => {
      if (!caseId) {
        return
      }

      try {
        if (refresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        setError(null)

        const response =
          await fetch(
            `/api/cases/${encodeURIComponent(
              caseId,
            )}/dashboard`,
            {
              credentials: "include",
              cache: "no-store",
            },
          )

        const result =
          (await response.json()) as
            | DashboardData
            | {
                error?: string
              }

        if (!response.ok) {
          throw new Error(
            !("case" in result) &&
              result.error
              ? result.error
              : "Failed to load investigation workspace",
          )
        }

        if (
          !("case" in result) ||
          !result.case ||
          !result.stats
        ) {
          throw new Error(
            "The investigation workspace returned an invalid response.",
          )
        }

        setData(result)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load investigation workspace",
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [caseId],
  )

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const stats = data?.stats
  const currentCase = data?.case

  const activeTeam = useMemo(
    () => {
      if (!data?.team) {
        return []
      }

      return data.team
    },
    [data],
  )

  if (loading) {
    return (
      <main className="min-h-[60vh] bg-[#020604] text-white">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-white/45">
            <Loader2 className="h-5 w-5 animate-spin text-[#20dc73]" />
            Loading investigation workspace...
          </div>
        </div>
      </main>
    )
  }

  if (
    error ||
    !data ||
    !currentCase
  ) {
    return (
      <main className="min-h-screen bg-[#020604] p-4 text-white sm:p-6 lg:p-8">
        <section className="mx-auto max-w-5xl rounded-xl border border-[#5f2828] bg-[#220d0d] p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#ff8989]" />

            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#ff8989]">
                Workspace Access
              </p>

              <h1 className="mt-2 text-xl font-semibold text-white">
                Investigation Workspace Unavailable
              </h1>

              <p className="mt-2 text-sm leading-6 text-[#ff9f9f]">
                {error ||
                  "The investigation workspace could not be loaded."}
              </p>

              <button
                type="button"
                onClick={() =>
                  loadDashboard()
                }
                className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#7d3939] px-4 py-2 text-sm font-semibold text-[#ffb0b0] transition hover:bg-white/5"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  const progress = Math.min(
    100,
    Math.max(
      0,
      numberValue(
        currentCase.progress,
      ),
    ),
  )

  const status =
    labelValue(
      currentCase.status,
    )

  const priority =
    labelValue(
      currentCase.priority,
    )

  const caseNumber =
    currentCase.case_number ||
    caseId

  return (
    <ClientNotificationProvider>
      <main className="min-h-screen bg-[#020604] text-white">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* =====================================================
              WORKSPACE HEADER
          ===================================================== */}

          <header className="overflow-hidden rounded-xl border border-[#143b28] bg-[#06110f]">
            <div className="border-b border-[#143b28] bg-[radial-gradient(circle_at_top_right,rgba(32,220,115,0.10),transparent_35%)] p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-[#1c5438] bg-[#061a11] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]">
                      Investigation Workspace
                    </span>

                    <span
                      className={`rounded border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusTone(
                        currentCase.status,
                      )}`}
                    >
                      {status}
                    </span>
                  </div>

                  <h1 className="mt-4 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {currentCase.title ||
                      "Investigation Workspace"}
                  </h1>

                  <p className="mt-2 font-mono text-xs text-white/30">
                    {caseNumber}
                  </p>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">
                    Active investigative work for{" "}
                    <span className="text-white/75">
                      {caseNumber}
                    </span>
                    . Review evidence, build intelligence
                    relationships, track activity, communicate
                    with authorized case participants, and
                    prepare findings.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      loadDashboard(true)
                    }
                    disabled={refreshing}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-[#254936] px-4 py-2.5 text-sm font-medium text-white/65 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        refreshing
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                    Refresh
                  </button>

                  <Link
                    href={`/dashboard/cases/${caseId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#20dc73] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#3aee89]"
                  >
                    Case Overview
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------
                WORKSPACE METADATA
            --------------------------------------------------- */}

            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
              <CaseMeta
                label="Service"
                value={labelValue(
                  currentCase.service_type,
                )}
              />

              <CaseMeta
                label="Priority"
                value={priority}
                valueClassName={priorityTone(
                  currentCase.priority,
                )}
              />

              <CaseMeta
                label="Payment"
                value={labelValue(
                  currentCase.payment_status,
                )}
              />

              <CaseMeta
                label="Assigned Operator"
                value={
                  currentCase.assigned_to
                    ?.username ||
                  "Unassigned"
                }
              />
            </div>

            {/* ---------------------------------------------------
                PROGRESS
            --------------------------------------------------- */}

            <div className="border-t border-[#143b28] px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
                    Investigation Progress
                  </p>

                  <p className="mt-1 text-sm text-white/50">
                    Progress recorded across the current
                    investigation.
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
          </header>

          {/* =====================================================
              WORKSPACE METRICS
          ===================================================== */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <WorkspaceMetric
              icon={Users}
              label="Assignments"
              value={
                stats?.assigned_investigators ??
                0
              }
            />

            <WorkspaceMetric
              icon={GitBranch}
              label="Entities"
              value={
                stats?.entities ??
                0
              }
            />

            <WorkspaceMetric
              icon={Network}
              label="Relationships"
              value={
                stats?.relationships ??
                0
              }
            />

            <WorkspaceMetric
              icon={Upload}
              label="Evidence"
              value={
                stats?.evidence ??
                0
              }
            />

            <WorkspaceMetric
              icon={Activity}
              label="Updates"
              value={
                stats?.updates ??
                0
              }
            />

            <WorkspaceMetric
              icon={FileText}
              label="Reports"
              value={
                stats?.reports ??
                0
              }
            />
          </section>

          {/* =====================================================
              PRIMARY INVESTIGATION CONTROLS
          ===================================================== */}

          <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
            <div className="border-b border-[#143b28] px-5 py-4 sm:px-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#20dc73]">
                Investigation Tools
              </p>

              <h2 className="mt-1 text-lg font-semibold text-white">
                Active Workbench
              </h2>

              <p className="mt-1 text-sm leading-6 text-white/40">
                Move directly between the systems used to conduct
                and document this investigation.
              </p>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
              <WorkbenchLink
                href={`/cases/${caseId}/graph`}
                icon={GitBranch}
                title="Intelligence Graph"
                description="Build and examine entity relationships."
              />

              <WorkbenchLink
                href={`/dashboard/cases/${caseId}/evidence`}
                icon={Upload}
                title="Evidence"
                description="Review case evidence and forensic records."
              />

              <WorkbenchLink
                href={`/dashboard/cases/${caseId}/timeline`}
                icon={Activity}
                title="Timeline"
                description="Track investigative events and activity."
              />

              <WorkbenchLink
                href={`/dashboard/cases/${caseId}/reports`}
                icon={FileText}
                title="Reports"
                description="Prepare investigation findings and reports."
              />
            </div>
          </section>

          {/* =====================================================
              INVESTIGATION OVERVIEW
          ===================================================== */}

          <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">

            <div className="space-y-6">

              <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
                <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4 sm:px-6">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]">
                      Investigation Context
                    </p>

                    <h2 className="mt-1 text-lg font-semibold">
                      Investigation Overview
                    </h2>
                  </div>

                  <ShieldCheck className="h-5 w-5 text-[#20dc73]" />
                </div>

                <div className="p-5 sm:p-6">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-white/65">
                    {currentCase.description ||
                      "No investigation summary has been provided yet."}
                  </p>
                </div>
              </section>

              {/* =================================================
                  TIMELINE
              ================================================= */}

              <Timeline caseId={caseId} />

              {/* =================================================
                  EVIDENCE
              ================================================= */}

              <EvidencePanel
                caseId={caseId}
              />

              {/* =================================================
                  INVESTIGATION FOUNDATION
              ================================================= */}

              <InvestigationWorkspaceFoundation
                caseId={caseId}
              />

              {/* =================================================
                  REPORT BUILDER
              ================================================= */}

              <ReportBuilder
                caseId={caseId}
              />

              {/* =================================================
                  MESSAGES
              ================================================= */}

              <MessagePanel
                caseId={caseId}
              />

            </div>

            {/* =====================================================
                RIGHT SIDEBAR
            ===================================================== */}

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
                                    {member.full_name ||
                                      member.username ||
                                      member.email ||
                                      "Assigned member"}
                                  </p>

                                  <p className="mt-0.5 truncate text-xs text-white/35">
                                    {member.username ||
                                      member.email ||
                                      "Operator"}
                                  </p>

                                  <p className="mt-1 text-[10px] capitalize text-white/25">
                                    {labelValue(
                                      member.role,
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
                    value={labelValue(
                      currentCase.service_type,
                    )}
                  />

                  <DetailRow
                    label="Priority"
                    value={priority}
                    valueClassName={priorityTone(
                      currentCase.priority,
                    )}
                  />

                  <DetailRow
                    label="Payment"
                    value={labelValue(
                      currentCase.payment_status,
                    )}
                  />

                  <DetailRow
                    label="Started"
                    value={formatDate(
                      currentCase.started_at,
                    )}
                  />

                  <DetailRow
                    label="Estimated Completion"
                    value={formatDate(
                      currentCase.estimated_completion,
                    )}
                  />

                  <DetailRow
                    label="Last Updated"
                    value={formatDateTime(
                      currentCase.updated_at,
                    )}
                  />
                </div>
              </section>

              {/* GRAPH STATUS */}

              <section className="rounded-xl border border-[#143b28] bg-[#06110f] p-5">
                <div className="flex items-start gap-3">
                  <GitBranch className="mt-0.5 h-5 w-5 shrink-0 text-[#20dc73]" />

                  <div>
                    <h2 className="font-semibold">
                      Intelligence Graph
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-white/40">
                      {stats?.entities ?? 0} entities are linked
                      through{" "}
                      {stats?.relationships ?? 0} relationships
                      in this case.
                    </p>

                    <Link
                      href={`/cases/${caseId}/graph`}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#20dc73] hover:underline"
                    >
                      Open Graph
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </section>

              {/* WORKSPACE STATUS */}

              <section className="rounded-xl border border-[#143b28] bg-[#06110f] p-5">
                <div className="flex items-start gap-3">
                  {progress >= 100 ? (
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#20dc73]" />
                  ) : (
                    <Activity className="mt-0.5 h-5 w-5 shrink-0 text-[#d6b95c]" />
                  )}

                  <div>
                    <h2 className="font-semibold">
                      {progress >= 100
                        ? "Investigation Ready for Completion"
                        : "Investigation In Progress"}
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-white/40">
                      {progress >= 100
                        ? "The case has reached 100% operational progress."
                        : "Continue investigative activity, evidence review and reporting until the case is ready for completion."}
                    </p>
                  </div>
                </div>
              </section>

            </aside>
          </section>

          {/* FOOTER */}

          <footer className="flex flex-col gap-2 border-t border-[#143b28] pt-4 text-[10px] uppercase tracking-[0.12em] text-white/25 sm:flex-row sm:items-center sm:justify-between">
            <span>
              ShadowNode Investigation Operations
            </span>

            <span className="font-mono">
              Case ID: {caseId}
            </span>
          </footer>

        </div>
      </div>
      </main>
    </ClientNotificationProvider>
  )
}

function CaseMeta({
  label,
  value,
  valueClassName = "",
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-lg border border-[#143b28] bg-black/20 p-4">
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">
        {label}
      </p>

      <p
        className={`mt-2 truncate text-sm font-semibold ${
          valueClassName ||
          "text-white/75"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function WorkspaceMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-[#143b28] bg-[#06110f] p-4">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-[#20dc73]" />

        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/20">
          Case
        </span>
      </div>

      <p className="mt-4 text-xs uppercase tracking-[0.12em] text-white/40">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-white">
        {value}
      </p>
    </div>
  )
}

function WorkbenchLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: typeof GitBranch
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
          mono
            ? "font-mono"
            : ""
        } ${
          valueClassName ||
          ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}
