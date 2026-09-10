"use client"

import {
  Clock3,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import AssignTeamModal from "./AssignTeamModal"

type Assignment = {
  id: string
  case_id: string
  assigned_to: string | null
  assigned_to_profile_id: string | null
  assigned_by: string | null
  assigned_at: string | null
  removed_at: string | null
  username: string | null
  email: string | null
  role: string | null
  full_name: string | null
  assigned_by_username: string | null
}

type CaseAssignmentProps = {
  caseId: string
  canAssign?: boolean
}

function displayName(member: Assignment) {
  return (
    member.full_name?.trim() ||
    member.username?.trim() ||
    member.email?.trim() ||
    "Unnamed operator"
  )
}

function roleLabel(role: string | null) {
  if (!role) {
    return "operator"
  }

  return role.replace(/_/g, " ")
}

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown date"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Unknown date"
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function isActiveAssignment(assignment: Assignment) {
  return !assignment.removed_at
}

export default function CaseAssignment({
  caseId,
  canAssign = false,
}: CaseAssignmentProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const loadAssignments = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        setError(null)

        const response = await fetch(
          `/api/cases/${encodeURIComponent(caseId)}/team`,
          {
            credentials: "include",
            cache: "no-store",
          },
        )

        const result = (await response.json()) as
          | Assignment[]
          | {
              assignments?: Assignment[]
              team?: Assignment[]
              error?: string
            }

        if (!response.ok) {
          throw new Error(
            !Array.isArray(result) && result.error
              ? result.error
              : "Failed to load case assignments",
          )
        }

        let rows: Assignment[] = []

        if (Array.isArray(result)) {
          rows = result
        } else if (Array.isArray(result.assignments)) {
          rows = result.assignments
        } else if (Array.isArray(result.team)) {
          rows = result.team
        }

        setAssignments(rows)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load case assignments",
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [caseId],
  )

  useEffect(() => {
    loadAssignments()
  }, [loadAssignments])

  const activeAssignments = useMemo(
    () => assignments.filter(isActiveAssignment),
    [assignments],
  )

  const assignmentHistory = useMemo(
    () =>
      assignments
        .filter((assignment) => !isActiveAssignment(assignment))
        .sort((a, b) => {
          const aTime = a.removed_at
            ? new Date(a.removed_at).getTime()
            : 0
          const bTime = b.removed_at
            ? new Date(b.removed_at).getTime()
            : 0

          return bTime - aTime
        }),
    [assignments],
  )

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#20dc73]" />

            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#20dc73]">
              Case Operations
            </p>
          </div>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Case Team
          </h2>

          <p className="mt-1 text-sm text-white/45">
            Investigators and analysts currently assigned to this case.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadAssignments(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-md border border-[#254936] px-3 py-2 text-sm font-medium text-white/65 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>

          {canAssign ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-[#20dc73] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#3aee89]"
            >
              <UserPlus className="h-4 w-4" />
              Assign Operator
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-[#5f2828] bg-[#220d0d] px-4 py-3">
          <p className="text-sm text-[#ff8989]">{error}</p>

          <button
            type="button"
            onClick={() => loadAssignments(true)}
            className="shrink-0 rounded-md border border-[#7d3939] px-3 py-1.5 text-xs font-semibold text-[#ffb0b0] transition hover:bg-white/5"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="rounded-xl border border-[#143b28] bg-[#06110f]">
        <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Active Operators
            </h3>

            <p className="mt-1 text-xs text-white/35">
              {activeAssignments.length} active assignment
              {activeAssignments.length === 1 ? "" : "s"}
            </p>
          </div>

          <ShieldCheck className="h-5 w-5 text-[#20dc73]/70" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin text-[#20dc73]" />
            Loading case team...
          </div>
        ) : activeAssignments.length ? (
          <div className="divide-y divide-[#143b28]">
            {activeAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#20dc73]/30 bg-[#20dc73]/10">
                    <span className="text-sm font-bold text-[#20dc73]">
                      {displayName(assignment)
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">
                        {displayName(assignment)}
                      </p>

                      <span className="rounded border border-[#20dc73]/20 bg-[#071b12] px-2 py-0.5 text-[10px] capitalize tracking-wide text-[#62e79c]">
                        {roleLabel(assignment.role)}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-xs text-white/40">
                      {assignment.email ||
                        assignment.username ||
                        "No contact address"}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-white/25">
                    Assigned
                  </p>

                  <p className="mt-1 text-xs text-white/45">
                    {formatDate(assignment.assigned_at)}
                  </p>

                  {assignment.assigned_by_username ? (
                    <p className="mt-1 text-[11px] text-white/25">
                      By {assignment.assigned_by_username}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#204f38] bg-black/20">
              <Users className="h-5 w-5 text-white/20" />
            </div>

            <p className="mt-4 text-sm font-medium text-white/55">
              No active operators assigned
            </p>

            <p className="mt-1 text-xs text-white/30">
              Assign an investigator or analyst to begin case operations.
            </p>

            {canAssign ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-md border border-[#24543a] px-4 py-2 text-xs font-semibold text-[#62e79c] transition hover:bg-[#20dc73]/5"
              >
                <UserPlus className="h-4 w-4" />
                Assign Operator
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#143b28] bg-[#06110f]">
        <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <History className="h-4 w-4 text-white/45" />
              Assignment History
            </h3>

            <p className="mt-1 text-xs text-white/35">
              Previous assignments associated with this case.
            </p>
          </div>

          <Clock3 className="h-4 w-4 text-white/25" />
        </div>

        {assignmentHistory.length ? (
          <div className="divide-y divide-[#143b28]">
            {assignmentHistory.map((assignment) => (
              <div
                key={assignment.id}
                className="px-5 py-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/75">
                      {displayName(assignment)}
                    </p>

                    <p className="mt-1 text-xs capitalize text-white/35">
                      {roleLabel(assignment.role)}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs text-white/35">
                      Assigned{" "}
                      {formatDate(assignment.assigned_at)}
                    </p>

                    {assignment.removed_at ? (
                      <p className="mt-1 text-xs text-white/25">
                        Removed{" "}
                        {formatDate(assignment.removed_at)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-white/30">
              No previous assignment history.
            </p>
          </div>
        )}
      </div>

      <AssignTeamModal
        caseId={caseId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAssigned={() => {
          setModalOpen(false)
          loadAssignments(true)
        }}
      />
    </section>
  )
}