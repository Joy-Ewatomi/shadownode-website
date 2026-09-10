"use client"

import Timeline from "@/components/cases/Timeline"
import MessagePanel from "@/components/cases/MessagePanel"
import EvidencePanel from "@/components/evidence/EvidencePanel"
import InvestigationWorkspaceFoundation from "@/components/investigation/InvestigationWorkspaceFoundation"
import ReportBuilder from "@/components/reports/ReportBuilder"
import {
  AlertTriangle,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

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

  return Number.isFinite(parsed) ? parsed : 0
}

function labelValue(value: string | null | undefined) {
  if (!value) {
    return "—"
  }

  return value.replace(/_/g, " ")
}

export default function InvestigatorCaseWorkspace() {
  const params = useParams()
  const caseId = String(params.id)

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

        const response = await fetch(
          `/api/cases/${encodeURIComponent(caseId)}/dashboard`,
          {
            credentials: "include",
            cache: "no-store",
          },
        )

        const result = (await response.json()) as
          | DashboardData
          | { error?: string }

        if (!response.ok) {
          throw new Error(
            !("case" in result) && result.error
              ? result.error
              : "Failed to load case workspace",
          )
        }

        if (
          !("case" in result) ||
          !result.case ||
          !result.stats
        ) {
          throw new Error(
            "The case workspace returned an invalid response.",
          )
        }

        setData(result)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load case workspace",
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

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-white/45">
          <Loader2 className="h-5 w-5 animate-spin text-[#20dc73]" />
          Loading case workspace...
        </div>
      </main>
    )
  }

  if (error || !data || !currentCase) {
    return (
      <main className="space-y-6">
        <section className="rounded-xl border border-[#5f2828] bg-[#220d0d] p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#ff8989]" />

            <div>
              <h1 className="font-semibold text-white">
                Case Workspace Unavailable
              </h1>

              <p className="mt-2 text-sm text-[#ff9f9f]">
                {error ||
                  "The case workspace could not be loaded."}
              </p>

              <button
                type="button"
                onClick={() => loadDashboard()}
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
    Math.max(0, numberValue(currentCase.progress)),
  )

  return (
    <main className="space-y-6">
      <header className="rounded-xl border border-[#143b28] bg-[#06110f] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">
                Case Operations
              </p>

              <span className="rounded border border-[#20dc73]/20 bg-[#071b12] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[#62e79c]">
                {labelValue(currentCase.status)}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-bold text-white">
              {currentCase.title || "Case Operations Workspace"}
            </h1>

            <p className="mt-1 font-mono text-xs text-white/35">
              {currentCase.case_number || caseId}
            </p>

            {currentCase.description ? (
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/50">
                {currentCase.description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-[#254936] px-4 py-2 text-sm font-medium text-white/65 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh Workspace
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CaseMeta
            label="Service"
            value={labelValue(currentCase.service_type)}
          />

          <CaseMeta
            label="Priority"
            value={labelValue(currentCase.priority)}
          />

          <CaseMeta
            label="Payment"
            value={labelValue(currentCase.payment_status)}
          />

          <CaseMeta
            label="Assigned Operator"
            value={
              currentCase.assigned_to?.username ||
              "Unassigned"
            }
          />
        </div>

        <div className="mt-5 rounded-lg border border-[#143b28] bg-black/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-white/30">
                Case Progress
              </p>

              <p className="mt-1 text-lg font-bold text-white">
                {progress}%
              </p>
            </div>

            <p className="text-xs text-white/35">
              {progress >= 100
                ? "Completed"
                : "Operational progress"}
            </p>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-[#20dc73] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <WorkspaceCard
          icon={ShieldCheck}
          label="Assignments"
          value={stats?.assigned_investigators ?? 0}
        />

        <WorkspaceCard
          icon={Upload}
          label="Evidence"
          value={stats?.evidence ?? 0}
        />

        <WorkspaceCard
          icon={FileText}
          label="Updates"
          value={stats?.updates ?? 0}
        />

        <WorkspaceCard
          icon={MessageSquare}
          label="Notes"
          value={stats?.notes ?? 0}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Timeline caseId={caseId} />

        <aside className="space-y-4">
          <div className="rounded-xl border border-[#143b28] bg-[#06110f] p-5">
            <h2 className="font-semibold text-white">
              Workspace Overview
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/45">
              This workspace brings together the operational
              timeline, evidence, intelligence graph,
              reports, team activity, and case communication.
            </p>
          </div>

          <div className="rounded-xl border border-[#143b28] bg-[#06110f] p-5">
            <h2 className="font-semibold text-white">
              Evidence
            </h2>

            <p className="mt-2 text-sm text-white/45">
              {stats?.evidence ?? 0} evidence file
              {stats?.evidence === 1 ? "" : "s"} currently
              linked to this case.
            </p>
          </div>

          <div className="rounded-xl border border-[#143b28] bg-[#06110f] p-5">
            <h2 className="font-semibold text-white">
              Intelligence Graph
            </h2>

            <p className="mt-2 text-sm text-white/45">
              {stats?.entities ?? 0} entities and{" "}
              {stats?.relationships ?? 0} relationships are
              currently represented in the investigation graph.
            </p>
          </div>

          <div className="rounded-xl border border-[#143b28] bg-[#06110f] p-5">
            <h2 className="font-semibold text-white">
              Reports
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/45">
              Draft, review, and final reporting tools remain
              connected to the investigation workspace.
            </p>
          </div>
        </aside>
      </section>

      <EvidencePanel caseId={caseId} />

      <InvestigationWorkspaceFoundation
        caseId={caseId}
      />

      <ReportBuilder caseId={caseId} />

      <MessagePanel caseId={caseId} />
    </main>
  )
}

function CaseMeta({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-[#143b28] bg-black/20 p-4">
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-semibold capitalize text-white/75">
        {value}
      </p>
    </div>
  )
}

function WorkspaceCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-[#143b28] bg-[#06110f] p-5">
      <Icon className="h-5 w-5 text-[#20dc73]" />

      <p className="mt-4 text-sm text-white/50">
        {label}
      </p>

      <p className="mt-1 text-3xl font-bold text-[#20dc73]">
        {value}
      </p>
    </div>
  )
}