"use client"

import {
  Check,
  Clock3,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

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

  assignment_role: string | null
  status: string | null
  deadline: string | null
  notes: string | null

  accepted_at: string | null
  rejected_at: string | null
  rejection_reason: string | null

  user_id: string | null
}

type StaffMember = {
  id: string
  username: string
  email: string
  role: string
  status?: string | null
  profile_id?: string | null
  full_name?: string | null
  active_assignments?: number | string | null
  last_assigned_at?: string | null
}

type CaseAssignmentProps = {
  caseId: string
  canAssign?: boolean
  canApprove?: boolean
}

const ASSIGNMENT_ROLES = [
  "lead_investigator",
  "investigator",
  "analyst",
  "reviewer",
] as const

type AssignmentRole =
  (typeof ASSIGNMENT_ROLES)[number]

function displayName(
  member: Assignment,
) {
  return (
    member.full_name?.trim() ||
    member.username?.trim() ||
    member.email?.trim() ||
    "Unnamed operator"
  )
}

function roleLabel(
  role: string | null,
) {
  if (!role) {
    return "Operator"
  }

  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function statusLabel(
  status: string | null,
) {
  if (!status) {
    return "Unknown"
  }

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "Unknown date"
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown date"
  }

  return date.toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  )
}

function formatShortDate(
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

  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  )
}

function isPending(
  assignment: Assignment,
) {
  return (
    assignment.status ===
    "pending"
  )
}

function isApproved(
  assignment: Assignment,
) {
  return (
    assignment.status ===
      "approved" ||
    assignment.status ===
      "active" ||
    assignment.status ===
      "accepted" ||
    assignment.status ===
      "assigned"
  )
}

function isRejected(
  assignment: Assignment,
) {
  return (
    assignment.status ===
    "rejected"
  )
}

function isRemoved(
  assignment: Assignment,
) {
  return Boolean(
    assignment.removed_at,
  )
}

export default function CaseAssignment({
  caseId,
  canAssign = false,
  canApprove = false,
}: CaseAssignmentProps) {
  const [
    assignments,
    setAssignments,
  ] = useState<
    Assignment[]
  >([])

  const [
    staff,
    setStaff,
  ] = useState<
    StaffMember[]
  >([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    refreshing,
    setRefreshing,
  ] = useState(false)

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null)

  const [
    actionError,
    setActionError,
  ] = useState<
    string | null
  >(null)

  const [
    assignmentFormOpen,
    setAssignmentFormOpen,
  ] = useState(false)

  const [
    assignmentRole,
    setAssignmentRole,
  ] = useState<
    AssignmentRole
  >("investigator")

  const [
    selectedUserId,
    setSelectedUserId,
  ] = useState("")

  const [
    deadline,
    setDeadline,
  ] = useState("")

  const [
    notes,
    setNotes,
  ] = useState("")

  const [
    rejectionAssignmentId,
    setRejectionAssignmentId,
  ] = useState<
    string | null
  >(null)

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("")

  const loadAssignments =
    useCallback(
      async (
        isRefresh = false,
      ) => {
        try {
          if (isRefresh) {
            setRefreshing(
              true,
            )
          } else {
            setLoading(
              true,
            )
          }

          setError(null)

          const response =
            await fetch(
              `/api/cases/${encodeURIComponent(
                caseId,
              )}/team`,
              {
                credentials:
                  "include",
                cache:
                  "no-store",
              },
            )

          const result =
            (await response.json()) as
              | Assignment[]
              | {
                  assignments?: Assignment[]
                  team?: Assignment[]
                  error?: string
                }

          if (
            !response.ok
          ) {
            throw new Error(
              !Array.isArray(
                result,
              ) &&
                result.error
                ? result.error
                : "Failed to load case assignments",
            )
          }

          let rows: Assignment[] =
            []

          if (
            Array.isArray(
              result,
            )
          ) {
            rows = result
          } else if (
            Array.isArray(
              result.assignments,
            )
          ) {
            rows =
              result.assignments
          } else if (
            Array.isArray(
              result.team,
            )
          ) {
            rows =
              result.team
          }

          setAssignments(
            rows,
          )
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load case assignments",
          )
        } finally {
          setLoading(false)
          setRefreshing(
            false,
          )
        }
      },
      [caseId],
    )

  const loadStaff =
    useCallback(
      async () => {
        if (!canAssign) {
          return
        }

        try {
          const response =
            await fetch(
              "/api/admin/cases",
              {
                credentials:
                  "include",
                cache:
                  "no-store",
              },
            )

          const result =
            (await response.json()) as {
              staff?: StaffMember[]
              error?: string
            }

          if (
            !response.ok
          ) {
            throw new Error(
              result.error ||
                "Failed to load operators",
            )
          }

          setStaff(
            Array.isArray(
              result.staff,
            )
              ? result.staff
              : [],
          )
        } catch (err) {
          setActionError(
            err instanceof Error
              ? err.message
              : "Failed to load operators",
          )
        }
      },
      [canAssign],
    )

  useEffect(() => {
    void loadAssignments()
    void loadStaff()
  }, [
    loadAssignments,
    loadStaff,
  ])

  const approvedAssignments =
    useMemo(
      () =>
        assignments.filter(
          (assignment) =>
            isApproved(
              assignment,
            ) &&
            !isRemoved(
              assignment,
            ),
        ),
      [assignments],
    )

  const pendingAssignments =
    useMemo(
      () =>
        assignments.filter(
          (assignment) =>
            isPending(
              assignment,
            ) &&
            !isRemoved(
              assignment,
            ),
        ),
      [assignments],
    )

  const rejectedAssignments =
    useMemo(
      () =>
        assignments.filter(
          (assignment) =>
            isRejected(
              assignment,
            ),
        ),
      [assignments],
    )

  const historyAssignments =
    useMemo(
      () =>
        assignments
          .filter(
            (assignment) =>
              isRemoved(
                assignment,
              ),
          )
          .sort(
            (a, b) => {
              const aTime =
                a.removed_at
                  ? new Date(
                      a.removed_at,
                    ).getTime()
                  : 0

              const bTime =
                b.removed_at
                  ? new Date(
                      b.removed_at,
                    ).getTime()
                  : 0

              return (
                bTime -
                aTime
              )
            },
          ),
      [assignments],
    )

  const availableStaff =
    useMemo(
      () =>
        staff.filter(
          (member) => {
            if (
              member.status &&
              member.status !==
                "active"
            ) {
              return false
            }

            return [
              "staff",
              "investigator",
              "analyst",
              "administrator",
              "super_administrator",
              "super-administrator",
            ].includes(member.role)
          },
        ),
      [
        staff,
        assignmentRole,
      ],
    )

  function resetAssignmentForm() {
    setSelectedUserId("")
    setDeadline("")
    setNotes("")
    setAssignmentRole(
      "investigator",
    )
    setAssignmentFormOpen(
      false,
    )
  }

  async function submitAssignment() {
    if (
      !selectedUserId
    ) {
      setActionError(
        "Select an operator before submitting the assignment.",
      )
      return
    }

    try {
      setActionLoading(
        true,
      )
      setActionError(null)

      const response =
        await fetch(
          "/api/admin/cases",
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              case_id:
                caseId,
              user_id:
                selectedUserId,
              assignment_role:
                assignmentRole,
              deadline:
                deadline ||
                null,
              notes:
                notes.trim() ||
                null,
            }),
          },
        )

      const result =
        (await response.json()) as {
          message?: string
          error?: string
        }

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ||
            "Assignment failed",
        )
      }

      resetAssignmentForm()

      await loadAssignments(
        true,
      )
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Assignment failed",
      )
    } finally {
      setActionLoading(
        false,
      )
    }
  }

  async function approveAssignment(
    assignmentId: string,
  ) {
    if (!canApprove) {
      return
    }

    try {
      setActionLoading(
        true,
      )
      setActionError(null)

      const response =
        await fetch(
          "/api/admin/cases",
          {
            method: "PATCH",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action:
                "approve_assignment",
              assignment_id:
                assignmentId,
            }),
          },
        )

      const result =
        (await response.json()) as {
          error?: string
        }

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ||
            "Assignment approval failed",
        )
      }

      await loadAssignments(
        true,
      )
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Assignment approval failed",
      )
    } finally {
      setActionLoading(
        false,
      )
    }
  }

  async function rejectAssignment(
    assignmentId: string,
  ) {
    const trimmed =
      rejectionReason.trim()

    if (!trimmed) {
      setActionError(
        "A rejection reason is required.",
      )
      return
    }

    try {
      setActionLoading(
        true,
      )
      setActionError(null)

      const response =
        await fetch(
          "/api/admin/cases",
          {
            method: "PATCH",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action:
                "reject_assignment",
              assignment_id:
                assignmentId,
              rejection_reason:
                trimmed,
            }),
          },
        )

      const result =
        (await response.json()) as {
          error?: string
        }

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ||
            "Assignment rejection failed",
        )
      }

      setRejectionAssignmentId(
        null,
      )
      setRejectionReason("")

      await loadAssignments(
        true,
      )
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Assignment rejection failed",
      )
    } finally {
      setActionLoading(
        false,
      )
    }
  }

  return (
    <section className="space-y-6">
      {/* ========================================================
          HEADER
          ======================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            Manage approved operators and review
            pending case assignments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              void loadAssignments(
                true,
              )
            }
            disabled={
              loading ||
              refreshing
            }
            className="inline-flex items-center gap-2 rounded-md border border-[#254936] px-3 py-2 text-sm font-medium text-white/65 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
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

          {canAssign ? (
            <button
              type="button"
              onClick={() => {
                setAssignmentFormOpen(
                  (value) => !value,
                )
                setActionError(null)
              }}
              className="inline-flex items-center gap-2 rounded-md bg-[#20dc73] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#3aee89]"
            >
              <UserPlus className="h-4 w-4" />

              {assignmentFormOpen
                ? "Close Assignment"
                : "Assign Operator"}
            </button>
          ) : null}
        </div>
      </div>

      {/* ========================================================
          ERRORS
          ======================================================== */}

      {error ? (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-[#5f2828] bg-[#220d0d] px-4 py-3">
          <p className="text-sm text-[#ff8989]">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadAssignments(
                true,
              )
            }
            className="shrink-0 rounded-md border border-[#7d3939] px-3 py-1.5 text-xs font-semibold text-[#ffb0b0] transition hover:bg-white/5"
          >
            Retry
          </button>
        </div>
      ) : null}

      {actionError ? (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
          <p className="text-sm text-amber-300/80">
            {actionError}
          </p>

          <button
            type="button"
            onClick={() =>
              setActionError(
                null,
              )
            }
            className="text-white/30 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* ========================================================
          ASSIGNMENT FORM
          ======================================================== */}

      {assignmentFormOpen &&
      canAssign ? (
        <div className="rounded-xl border border-[#20dc73]/15 bg-[#06110f] p-5">
          <div className="mb-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]/70">
              New Assignment
            </p>

            <h3 className="mt-1 text-lg font-semibold text-white">
              Assign Case Operator
            </h3>

            <p className="mt-1 text-xs leading-5 text-white/35">
              Administrator assignments require Super
              Administrator approval. Super Administrator
              assignments activate immediately.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-white/45">
                Assignment Role
              </label>

              <select
                value={
                  assignmentRole
                }
                onChange={(event) => {
                  setAssignmentRole(
                    event.target
                      .value as AssignmentRole,
                  )
                  setSelectedUserId(
                    "",
                  )
                }}
                className="h-11 w-full rounded-md border border-[#143b28] bg-black/30 px-3 text-sm text-white outline-none focus:border-[#20dc73]/50"
              >
                {ASSIGNMENT_ROLES.map(
                  (role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {roleLabel(
                        role,
                      )}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-white/45">
                Operator
              </label>

              <select
                value={
                  selectedUserId
                }
                onChange={(event) =>
                  setSelectedUserId(
                    event.target
                      .value,
                  )
                }
                className="h-11 w-full rounded-md border border-[#143b28] bg-black/30 px-3 text-sm text-white outline-none focus:border-[#20dc73]/50"
              >
                <option value="">
                  Select operator
                </option>

                {availableStaff.map(
                  (member) => (
                    <option
                      key={member.id}
                      value={member.id}
                    >
                      {
                        member.username
                      }{" "}
                      —{" "}
                      {
                        member.email
                      }
                    </option>
                  ),
                )}
              </select>

              {!availableStaff.length ? (
                <p className="mt-2 text-[11px] text-amber-300/60">
                  No active operators are available
                  for this role.
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-white/45">
                Deadline
              </label>

              <input
                type="date"
                value={deadline}
                onChange={(event) =>
                  setDeadline(
                    event.target
                      .value,
                  )
                }
                className="h-11 w-full rounded-md border border-[#143b28] bg-black/30 px-3 text-sm text-white outline-none focus:border-[#20dc73]/50"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-white/45">
                Assignment Notes
              </label>

              <input
                type="text"
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target
                      .value,
                  )
                }
                placeholder="Operational instructions..."
                className="h-11 w-full rounded-md border border-[#143b28] bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#20dc73]/50"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void submitAssignment()
              }
              disabled={
                actionLoading ||
                !selectedUserId ||
                !availableStaff.length
              }
              className="inline-flex items-center gap-2 rounded-md bg-[#20dc73] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}

              Submit Assignment
            </button>

            <button
              type="button"
              onClick={
                resetAssignmentForm
              }
              className="rounded-md border border-[#254936] px-4 py-2.5 text-sm text-white/55 transition hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* ========================================================
          SUMMARY
          ======================================================== */}

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Active"
          value={
            approvedAssignments.length
          }
          icon={
            <ShieldCheck className="h-4 w-4" />
          }
        />

        <SummaryCard
          label="Pending"
          value={
            pendingAssignments.length
          }
          icon={
            <Clock3 className="h-4 w-4" />
          }
        />

        <SummaryCard
          label="Rejected"
          value={
            rejectedAssignments.length
          }
          icon={
            <X className="h-4 w-4" />
          }
        />
      </div>

      {/* ========================================================
          ACTIVE OPERATORS
          ======================================================== */}

      <div className="rounded-xl border border-[#143b28] bg-[#06110f]">
        <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Active Operators
            </h3>

            <p className="mt-1 text-xs text-white/35">
              {approvedAssignments.length} active assignment
              {approvedAssignments.length ===
              1
                ? ""
                : "s"}
            </p>
          </div>

          <ShieldCheck className="h-5 w-5 text-[#20dc73]/70" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin text-[#20dc73]" />
            Loading case team...
          </div>
        ) : approvedAssignments.length ? (
          <div className="divide-y divide-[#143b28]">
            {approvedAssignments.map(
              (assignment) => (
                <div
                  key={
                    assignment.id
                  }
                  className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#20dc73]/30 bg-[#20dc73]/10">
                      <span className="text-sm font-bold text-[#20dc73]">
                        {displayName(
                          assignment,
                        )
                          .charAt(
                            0,
                          )
                          .toUpperCase()}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">
                          {displayName(
                            assignment,
                          )}
                        </p>

                        <StatusBadge
                          value={
                            assignment.assignment_role ||
                            assignment.role
                          }
                        />

                        <StatusBadge
                          value={
                            assignment.status
                          }
                          status
                        />
                      </div>

                      <p className="mt-1 truncate text-xs text-white/40">
                        {assignment.email ||
                          assignment.username ||
                          "No contact address"}
                      </p>

                      {assignment.notes ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/30">
                          {
                            assignment.notes
                          }
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/25">
                      Assigned
                    </p>

                    <p className="mt-1 text-xs text-white/45">
                      {formatDate(
                        assignment.assigned_at,
                      )}
                    </p>

                    {assignment.deadline ? (
                      <p className="mt-1 text-[11px] text-white/30">
                        Due{" "}
                        {formatShortDate(
                          assignment.deadline,
                        )}
                      </p>
                    ) : null}

                    {assignment.assigned_by_username ? (
                      <p className="mt-1 text-[11px] text-white/25">
                        By{" "}
                        {
                          assignment.assigned_by_username
                        }
                      </p>
                    ) : null}
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#204f38] bg-black/20">
              <Users className="h-5 w-5 text-white/20" />
            </div>

            <p className="mt-4 text-sm font-medium text-white/55">
              No approved operators
            </p>

            <p className="mt-1 text-xs text-white/30">
              Pending assignments appear below until approved.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================
          PENDING APPROVAL
          ======================================================== */}

      <div className="rounded-xl border border-amber-500/15 bg-[#06110f]">
        <div className="flex items-center justify-between border-b border-amber-500/10 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Pending Approval
            </h3>

            <p className="mt-1 text-xs text-white/35">
              Assignments awaiting Super Administrator review.
            </p>
          </div>

          <Clock3 className="h-5 w-5 text-amber-300/70" />
        </div>

        {pendingAssignments.length ? (
          <div className="divide-y divide-amber-500/10">
            {pendingAssignments.map(
              (assignment) => (
                <div
                  key={
                    assignment.id
                  }
                  className="px-5 py-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">
                          {displayName(
                            assignment,
                          )}
                        </p>

                        <StatusBadge
                          value={
                            assignment.assignment_role ||
                            assignment.role
                          }
                        />

                        <StatusBadge
                          value="pending"
                          status
                        />
                      </div>

                      <p className="mt-2 text-xs text-white/40">
                        Proposed{" "}
                        {formatDate(
                          assignment.assigned_at,
                        )}
                        {assignment.assigned_by_username
                          ? ` by ${assignment.assigned_by_username}`
                          : ""}
                      </p>

                      {assignment.deadline ? (
                        <p className="mt-1 text-xs text-white/30">
                          Deadline:{" "}
                          <span className="text-white/50">
                            {formatShortDate(
                              assignment.deadline,
                            )}
                          </span>
                        </p>
                      ) : null}

                      {assignment.notes ? (
                        <div className="mt-3 rounded-lg border border-white/7 bg-black/15 p-3 text-xs leading-5 text-white/45">
                          {
                            assignment.notes
                          }
                        </div>
                      ) : null}
                    </div>

                    {canApprove ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void approveAssignment(
                              assignment.id,
                            )
                          }
                          disabled={
                            actionLoading
                          }
                          className="inline-flex items-center gap-2 rounded-md bg-[#20dc73] px-3.5 py-2 text-xs font-bold text-black transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {actionLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectionAssignmentId(
                              assignment.id,
                            )
                            setRejectionReason(
                              "",
                            )
                            setActionError(
                              null,
                            )
                          }}
                          disabled={
                            actionLoading
                          }
                          className="inline-flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/[0.03] px-3.5 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/[0.08] disabled:opacity-40"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {canApprove &&
                  rejectionAssignmentId ===
                    assignment.id ? (
                    <div className="mt-4 rounded-lg border border-red-500/10 bg-red-500/[0.025] p-4">
                      <label className="mb-2 block text-xs font-medium text-red-300/75">
                        Rejection Reason
                      </label>

                      <textarea
                        value={
                          rejectionReason
                        }
                        onChange={(
                          event,
                        ) =>
                          setRejectionReason(
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="Explain why this assignment should not be approved..."
                        className="min-h-[95px] w-full rounded-md border border-red-500/15 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-red-500/40"
                      />

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void rejectAssignment(
                              assignment.id,
                            )
                          }
                          disabled={
                            actionLoading
                          }
                          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-red-500 disabled:opacity-40"
                        >
                          {actionLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          Confirm Rejection
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectionAssignmentId(
                              null,
                            )
                            setRejectionReason(
                              "",
                            )
                          }}
                          className="rounded-md border border-white/10 px-3.5 py-2 text-xs text-white/50 hover:bg-white/5"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-white/30">
              No assignments are waiting for approval.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================
          REJECTED ASSIGNMENTS
          ======================================================== */}

      {rejectedAssignments.length ? (
        <div className="rounded-xl border border-red-500/10 bg-[#06110f]">
          <div className="border-b border-red-500/10 px-5 py-4">
            <h3 className="text-sm font-semibold text-white">
              Rejected Assignments
            </h3>

            <p className="mt-1 text-xs text-white/30">
              Assignment proposals that were rejected.
            </p>
          </div>

          <div className="divide-y divide-red-500/10">
            {rejectedAssignments.map(
              (assignment) => (
                <div
                  key={
                    assignment.id
                  }
                  className="px-5 py-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-white/70">
                          {displayName(
                            assignment,
                          )}
                        </p>

                        <StatusBadge
                          value={
                            assignment.assignment_role ||
                            assignment.role
                          }
                        />

                        <StatusBadge
                          value="rejected"
                          status
                        />
                      </div>

                      {assignment.rejection_reason ? (
                        <p className="mt-2 max-w-2xl text-xs leading-5 text-red-300/55">
                          {
                            assignment.rejection_reason
                          }
                        </p>
                      ) : null}
                    </div>

                    <p className="text-[11px] text-white/25">
                      {formatDate(
                        assignment.rejected_at,
                      )}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}

      {/* ========================================================
          HISTORY
          ======================================================== */}

      <div className="rounded-xl border border-[#143b28] bg-[#06110f]">
        <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <History className="h-4 w-4 text-white/45" />
              Assignment History
            </h3>

            <p className="mt-1 text-xs text-white/35">
              Previously removed operators.
            </p>
          </div>

          <Clock3 className="h-4 w-4 text-white/25" />
        </div>

        {historyAssignments.length ? (
          <div className="divide-y divide-[#143b28]">
            {historyAssignments.map(
              (assignment) => (
                <div
                  key={
                    assignment.id
                  }
                  className="px-5 py-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/70">
                        {displayName(
                          assignment,
                        )}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className="text-xs text-white/30">
                          {roleLabel(
                            assignment.assignment_role ||
                              assignment.role,
                          )}
                        </span>

                        <span className="text-xs text-white/20">
                          Removed
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs text-white/35">
                        Assigned{" "}
                        {formatDate(
                          assignment.assigned_at,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-white/25">
                        Removed{" "}
                        {formatDate(
                          assignment.removed_at,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-white/30">
              No previous assignment history.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[#143b28] bg-[#06110f] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
          {label}
        </p>

        <div className="text-[#20dc73]/60">
          {icon}
        </div>
      </div>

      <p className="mt-2 text-2xl font-bold text-[#20dc73]">
        {value}
      </p>
    </div>
  )
}

function StatusBadge({
  value,
  status = false,
}: {
  value?: string | null
  status?: boolean
}) {
  const normalized =
    value?.toLowerCase()

  let classes =
    "border-white/10 bg-white/[0.03] text-white/45"

  if (status) {
    if (
      normalized ===
      "pending"
    ) {
      classes =
        "border-amber-500/25 bg-amber-500/10 text-amber-300"
    } else if (
      normalized ===
        "approved" ||
      normalized ===
        "active" ||
      normalized ===
        "accepted" ||
      normalized ===
        "assigned"
    ) {
      classes =
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
    } else if (
      normalized ===
      "rejected"
    ) {
      classes =
        "border-red-500/25 bg-red-500/10 text-red-300"
    }
  } else {
    const role =
      normalized

    if (
      role ===
        "lead_investigator" ||
      role ===
        "investigator"
    ) {
      classes =
        "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
    } else if (
      role ===
      "analyst"
    ) {
      classes =
        "border-cyan-500/20 bg-cyan-500/5 text-cyan-300"
    } else if (
      role ===
      "reviewer"
    ) {
      classes =
        "border-blue-500/20 bg-blue-500/5 text-blue-300"
    }
  }

  return (
    <span
      className={`rounded border px-2 py-0.5 text-[10px] capitalize tracking-wide ${classes}`}
    >
      {status
        ? statusLabel(
            value || null,
          )
        : roleLabel(
            value || null,
          )}
    </span>
  )
}
