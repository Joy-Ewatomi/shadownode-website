"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  AlertCircle,
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Link2,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const WORKFLOW_STATUSES = [
  "request_received",
  "admin_review",
  "case_created",
  "priority_assigned",
  "awaiting_assignment",
  "investigator_assigned",
  "analyst_assigned",
  "case_accepted",
  "investigation_in_progress",
  "awaiting_client",
  "under_internal_review",
  "final_report_generated",
  "delivered",
  "closed",
  "archived",
]

const STATUS_LABELS: Record<string, string> = {
  request_received: "Request Received",
  submitted: "Request Received",
  admin_review: "Admin Review",
  case_created: "Case Created",
  priority_assigned: "Priority Assigned",
  awaiting_assignment: "Awaiting Assignment",
  investigator_assigned: "Investigator Assigned",
  analyst_assigned: "Analyst Assigned",
  case_accepted: "Case Accepted",
  investigation_in_progress: "Investigation In Progress",
  active: "Investigation In Progress",
  awaiting_client: "Awaiting Client",
  under_internal_review: "Internal Review",
  final_report_generated: "Final Report Generated",
  delivered: "Delivered",
  completed: "Completed",
  closed: "Closed",
  archived: "Archived",
}

const PRIORITIES = [
  "low",
  "normal",
  "high",
  "critical",
]

const ASSIGNMENT_ROLES = [
  "investigator",
  "analyst",
  "administrator",
  "super_administrator",
] as const

type AssignmentRole =
  (typeof ASSIGNMENT_ROLES)[number]

type Staff = {
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

type Assignment = {
  id: string
  assigned_to: string
  user_id?: string | null
  username?: string | null
  email?: string | null
  user_role?: string | null
  assignment_role?: string | null
  status?: string | null
  deadline?: string | null
  notes?: string | null
  accepted_at?: string | null
  rejected_at?: string | null
  rejection_reason?: string | null
  assigned_by?: string | null
  assigned_by_username?: string | null
  assigned_at?: string | null
  removed_at?: string | null
}

type CaseItem = {
  id: string
  case_number: string
  title: string
  description?: string | null
  service_type?: string | null
  status?: string | null
  priority?: string | null
  assigned_to?: string | null
  client_profile_id?: string | null
  case_user_id?: string | null
  organization_id?: string | null
  budget?: number | string | null
  estimated_completion?: string | null
  completed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  progress?: number | null
  payment_status?: string | null
  started_at?: string | null
  final_report_url?: string | null

  request_id?: string | null
  request_user_id?: string | null
  client_email?: string | null
  contact_method?: string | null
  token?: string | null
  is_anonymous?: boolean | null

  request_case_number?: string | null
  request_title?: string | null
  request_description?: string | null
  request_service_type?: string | null

  final_price?: number | string | null
  price_notes?: string | null
  ai_analysis?: string | null
  currency?: string | null
  ai_price_estimate?: number | string | null
  converted_case_id?: string | null
  ai_status?: string | null
  ai_complexity?: string | null
  ai_estimated_hours?: number | string | null
  ai_suggested_service?: string | null
  request_priority?: string | null
  ai_confidence?: number | string | null
  ai_reasoning?: string | null

  approved_quote_amount?: number | string | null
  approved_quote_currency?: string | null
  approved_quote_notes?: string | null
  approved_estimated_completion?: string | null
  quote_sent_at?: string | null
  client_decision_at?: string | null
  declined_reason?: string | null

  investigation_objective?: string | null

  subject_type?: string | null
  subject_full_name?: string | null
  subject_known_usernames?: string | null
  subject_emails?: string | null
  subject_phone_numbers?: string | null
  subject_location?: string | null
  subject_organization?: string | null
  subject_websites?: string | null

  subject_company_name?: string | null
  subject_company_website?: string | null
  subject_company_country?: string | null
  subject_company_industry?: string | null

  subject_domain?: string | null
  subject_url?: string | null
  subject_ip_address?: string | null
  subject_platform?: string | null

  existing_information?: string | null
  investigation_depth?: string | null
  confidentiality_level?: string | null
  authorization_confirmed?: boolean | null

  communication_method?: string | null

  subject_approximate_age?: string | null
  subject_height?: string | null
  subject_weight?: string | null
  subject_hair_color?: string | null
  subject_eye_color?: string | null
  subject_skin_tone?: string | null
  subject_distinguishing_marks?: string | null
  subject_nationality?: string | null
  subject_languages_spoken?: string | null
  subject_last_known_address?: string | null
  subject_last_known_occupation?: string | null
  subject_additional_usernames?: string | null
  subject_gaming_ids?: string | null
  subject_cryptocurrency_wallets?: string | null
  subject_domain_names?: string | null
  subject_ip_addresses?: string | null
  subject_vehicle_registration?: string | null

  supporting_links?: unknown

  client_username?: string | null

  assignments?: Assignment[]
}

type ApiResponse = {
  cases?: CaseItem[]
  staff?: Staff[]
  error?: string
  message?: string
}

function formatLabel(value?: string | null) {
  if (!value) return "—"

  return value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function formatDate(value?: string | null) {
  if (!value) return "—"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
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

function formatDateTime(value?: string | null) {
  if (!value) return "—"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  )
}

function formatMoney(
  value?: number | string | null,
  currency?: string | null,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—"
  }

  const numericValue =
    Number(value)

  if (!Number.isFinite(numericValue)) {
    return String(value)
  }

  return `${currency || ""} ${numericValue.toLocaleString()}`
}

function parseLinks(
  value: unknown,
): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string"
          ? item
          : item &&
              typeof item ===
                "object" &&
              "url" in item &&
              typeof (
                item as {
                  url?: unknown
                }
              ).url ===
                "string"
            ? String(
                (
                  item as {
                    url: string
                  }
                ).url,
              )
            : null,
      )
      .filter(
        (
          item,
        ): item is string =>
          Boolean(item),
      )
  }

  if (
    typeof value === "string"
  ) {
    return value
      .split(/\r?\n/)
      .map((item) =>
        item.trim(),
      )
      .filter(Boolean)
  }

  return []
}

function statusClass(
  status?: string | null,
) {
  const normalized =
    status?.toLowerCase()

  if (
    normalized ===
      "closed" ||
    normalized ===
      "completed" ||
    normalized ===
      "delivered" ||
    normalized ===
      "approved"
  ) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }

  if (
    normalized ===
      "critical" ||
    normalized ===
      "rejected"
  ) {
    return "border-red-500/30 bg-red-500/10 text-red-300"
  }

  if (
    normalized ===
      "pending" ||
    normalized ===
      "awaiting_assignment" ||
    normalized ===
      "awaiting_client"
  ) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300"
  }

  return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
}

function roleClass(
  role?: string | null,
) {
  const normalized =
    role?.toLowerCase()

  if (
    normalized ===
    "super_administrator"
  ) {
    return "border-purple-500/30 bg-purple-500/10 text-purple-300"
  }

  if (
    normalized ===
    "administrator"
  ) {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300"
  }

  if (
    normalized ===
    "analyst"
  ) {
    return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value?: unknown
  mono?: boolean
}) {
  const display =
    value === null ||
    value === undefined ||
    value === ""
      ? "—"
      : String(value)

  return (
    <div className="grid gap-1 border-b border-white/5 py-3 sm:grid-cols-[180px_1fr]">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
        {label}
      </div>

      <div
        className={`break-words text-sm leading-6 text-white/80 ${
          mono
            ? "font-mono text-xs"
            : ""
        }`}
      >
        {display}
      </div>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="text-emerald-400">
          {icon}
        </div>

        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/80">
          {title}
        </h3>
      </div>

      {children}
    </section>
  )
}

export default function AdminCasesPage() {
  const [cases, setCases] =
    useState<CaseItem[]>([])

  const [staff, setStaff] =
    useState<Staff[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState("")

  const [
    refreshing,
    setRefreshing,
  ] = useState(false)

  const [
    search,
    setSearch,
  ] = useState("")

  const [
    selectedCaseId,
    setSelectedCaseId,
  ] = useState<
    string | null
  >(null)

  const [
    expandedCaseId,
    setExpandedCaseId,
  ] = useState<
    string | null
  >(null)

  const [
    selectedAssignmentId,
    setSelectedAssignmentId,
  ] = useState<
    string | null
  >(null)

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false)

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("")

  const [
    assignmentUserId,
    setAssignmentUserId,
  ] = useState("")

  const [
    assignmentRole,
    setAssignmentRole,
  ] = useState<
    AssignmentRole
  >("investigator")

  const [
    assignmentDeadline,
    setAssignmentDeadline,
  ] = useState("")

  const [
    assignmentNotes,
    setAssignmentNotes,
  ] = useState("")

  const [
    editTitle,
    setEditTitle,
  ] = useState("")

  const [
    editStatus,
    setEditStatus,
  ] = useState("")

  const [
    editPriority,
    setEditPriority,
  ] = useState("normal")

  const [
    editDeadline,
    setEditDeadline,
  ] = useState("")

  const [
    editNote,
    setEditNote,
  ] = useState("")

  const [
    showAssignmentForm,
    setShowAssignmentForm,
  ] = useState(false)

  const loadCases =
    useCallback(
      async (
        showRefresh = false,
      ) => {
        try {
          if (showRefresh) {
            setRefreshing(true)
          } else {
            setLoading(true)
          }

          setError("")

          const response =
            await fetch(
              "/api/admin/cases",
              {
                method: "GET",
                cache: "no-store",
              },
            )

          if (
            response.status ===
            401
          ) {
            window.location.href =
              "/login"
            return
          }

          if (
            response.status ===
            403
          ) {
            window.location.href =
              "/403"
            return
          }

          const data =
            (await response.json()) as ApiResponse

          if (
            !response.ok
          ) {
            throw new Error(
              data.error ||
                "Failed loading cases",
            )
          }

          setCases(
            data.cases ||
              [],
          )

          setStaff(
            data.staff ||
              [],
          )
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed loading cases",
          )
        } finally {
          setLoading(false)
          setRefreshing(false)
        }
      },
      [],
    )

  useEffect(() => {
    void loadCases()
  }, [loadCases])

  const filteredCases =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase()

      if (!term) {
        return cases
      }

      return cases.filter(
        (item) => {
          const haystack =
            [
              item.case_number,
              item.title,
              item.description,
              item.service_type,
              item.status,
              item.priority,
              item.investigation_objective,
              item.subject_full_name,
              item.subject_company_name,
              item.client_username,
              item.client_email,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()

          return haystack.includes(
            term,
          )
        },
      )
    }, [
      cases,
      search,
    ])

  const metrics =
    useMemo(() => {
      const active =
        cases.filter(
          (item) =>
            item.status ===
              "active" ||
            item.status ===
              "investigation_in_progress",
        ).length

      const completed =
        cases.filter(
          (item) =>
            item.status ===
              "completed" ||
            item.status ===
              "delivered" ||
            item.status ===
              "closed",
        ).length

      const awaitingAssignment =
        cases.filter(
          (item) =>
            item.status ===
            "awaiting_assignment",
        ).length

      const critical =
        cases.filter(
          (item) =>
            item.priority ===
            "critical",
        ).length

      const pendingAssignments =
        cases.reduce(
          (
            total,
            item,
          ) =>
            total +
            (item.assignments ||
              []).filter(
                (assignment) =>
                  assignment.status ===
                  "pending",
              ).length,
          0,
        )

      return {
        total: cases.length,
        active,
        completed,
        awaitingAssignment,
        critical,
        pendingAssignments,
      }
    }, [cases])

  const selectedCase =
    selectedCaseId
      ? cases.find(
          (item) =>
            item.id ===
            selectedCaseId,
        ) || null
      : null

  const selectedAssignment =
    selectedCase &&
    selectedAssignmentId
      ? (
          selectedCase.assignments ||
          []
        ).find(
          (assignment) =>
            assignment.id ===
            selectedAssignmentId,
        ) || null
      : null

  useEffect(() => {
    if (!selectedCase) {
      return
    }

    setEditTitle(
      selectedCase.title ||
        "",
    )

    setEditStatus(
      selectedCase.status ||
        "",
    )

    setEditPriority(
      selectedCase.priority ||
        "normal",
    )

    setEditDeadline(
      selectedCase.estimated_completion
        ? String(
            selectedCase.estimated_completion,
          ).slice(0, 10)
        : "",
    )

    setEditNote("")
  }, [selectedCase])

  const submitCaseUpdate =
    async () => {
      if (
        !selectedCase
      ) {
        return
      }

      try {
        setActionLoading(true)
        setError("")

        const response =
          await fetch(
            "/api/admin/cases",
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                case_id:
                  selectedCase.id,
                title:
                  editTitle,
                status:
                  editStatus,
                priority:
                  editPriority,
                estimated_completion:
                  editDeadline ||
                  null,
                note:
                  editNote ||
                  null,
                action:
                  "update_case",
              }),
            },
          )

        const data =
          (await response.json()) as ApiResponse

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Case update failed",
          )
        }

        await loadCases(true)
        setEditNote("")
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Case update failed",
        )
      } finally {
        setActionLoading(
          false,
        )
      }
    }

  const assignOperator =
    async () => {
      if (
        !selectedCase ||
        !assignmentUserId
      ) {
        return
      }

      try {
        setActionLoading(true)
        setError("")

        const response =
          await fetch(
            "/api/admin/cases",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                case_id:
                  selectedCase.id,
                user_id:
                  assignmentUserId,
                assignment_role:
                  assignmentRole,
                deadline:
                  assignmentDeadline ||
                  null,
                notes:
                  assignmentNotes ||
                  null,
              }),
            },
          )

        const data =
          (await response.json()) as ApiResponse

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Assignment failed",
          )
        }

        setAssignmentUserId("")
        setAssignmentDeadline("")
        setAssignmentNotes("")
        setShowAssignmentForm(
          false,
        )

        await loadCases(true)
      } catch (err) {
        setError(
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

  const approveAssignment =
    async (
      assignmentId: string,
    ) => {
      try {
        setActionLoading(true)
        setError("")

        const response =
          await fetch(
            "/api/admin/cases",
            {
              method: "PATCH",
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

        const data =
          (await response.json()) as ApiResponse

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Assignment approval failed",
          )
        }

        setSelectedAssignmentId(
          null,
        )

        await loadCases(true)
      } catch (err) {
        setError(
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

  const rejectAssignment =
    async (
      assignmentId: string,
    ) => {
      if (
        !rejectionReason.trim()
      ) {
        setError(
          "Enter a rejection reason before rejecting the assignment.",
        )
        return
      }

      try {
        setActionLoading(true)
        setError("")

        const response =
          await fetch(
            "/api/admin/cases",
            {
              method: "PATCH",
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
                  rejectionReason.trim(),
              }),
            },
          )

        const data =
          (await response.json()) as ApiResponse

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Assignment rejection failed",
          )
        }

        setSelectedAssignmentId(
          null,
        )
        setRejectionReason("")

        await loadCases(true)
      } catch (err) {
        setError(
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

  const archiveCase =
    async () => {
      if (
        !selectedCase
      ) {
        return
      }

      if (
        !window.confirm(
          `Archive ${selectedCase.case_number}?`,
        )
      ) {
        return
      }

      try {
        setActionLoading(true)
        setError("")

        const response =
          await fetch(
            `/api/admin/cases?case_id=${encodeURIComponent(
              selectedCase.id,
            )}&action=archive`,
            {
              method: "DELETE",
            },
          )

        const data =
          (await response.json()) as ApiResponse

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Case archive failed",
          )
        }

        await loadCases(true)

        setSelectedCaseId(
          null,
        )
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Case archive failed",
        )
      } finally {
        setActionLoading(
          false,
        )
      }
    }

  const deleteCase =
    async () => {
      if (
        !selectedCase
      ) {
        return
      }

      if (
        !window.confirm(
          `Permanently delete ${selectedCase.case_number}? This cannot be undone.`,
        )
      ) {
        return
      }

      try {
        setActionLoading(true)
        setError("")

        const response =
          await fetch(
            `/api/admin/cases?case_id=${encodeURIComponent(
              selectedCase.id,
            )}&action=delete`,
            {
              method: "DELETE",
            },
          )

        const data =
          (await response.json()) as ApiResponse

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Case deletion failed",
          )
        }

        await loadCases(true)

        setSelectedCaseId(
          null,
        )
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Case deletion failed",
        )
      } finally {
        setActionLoading(
          false,
        )
      }
    }

  const selectedRoleStaff =
    useMemo(() => {
      return staff.filter(
        (member) => {
          if (
            assignmentRole ===
            "super_administrator"
          ) {
            return (
              member.role ===
                "super_administrator" ||
              member.role ===
                "super-administrator"
            )
          }

          return (
            member.role ===
            assignmentRole
          )
        },
      )
    }, [
      staff,
      assignmentRole,
    ])

  const assignmentStats =
    useMemo(() => {
      if (
        !selectedCase
      ) {
        return {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
        }
      }

      const assignments =
        selectedCase.assignments ||
        []

      return {
        total:
          assignments.length,
        pending:
          assignments.filter(
            (assignment) =>
              assignment.status ===
              "pending",
          ).length,
        approved:
          assignments.filter(
            (assignment) =>
              assignment.status ===
                "approved" ||
              assignment.status ===
                "active" ||
              assignment.status ===
                "accepted" ||
              assignment.status ===
                "assigned",
          ).length,
        rejected:
          assignments.filter(
            (assignment) =>
              assignment.status ===
              "rejected",
          ).length,
      }
    }, [selectedCase])

  return (
    <div className="min-h-screen bg-[#000604] text-white">
      <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-emerald-400/70">
              <Shield className="h-3.5 w-3.5" />
              Administrator Command Center
            </div>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Case Mission Control
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
              Review client submissions, control
              operational case state, and manage
              investigator and analyst assignments
              without exposing internal operations to
              the client portal.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void loadCases(true)
            }
            disabled={loading || refreshing}
            className="w-full border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06] sm:w-auto"
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Operations
          </Button>
        </div>

        {/* ====================================================
            ERROR
            ==================================================== */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              {error}
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="text-white/40 hover:text-white/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ====================================================
            METRICS
            ==================================================== */}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[
            {
              label: "Total Cases",
              value: metrics.total,
              icon: FileText,
            },
            {
              label: "Active",
              value: metrics.active,
              icon: Shield,
            },
            {
              label: "Awaiting Assignment",
              value:
                metrics.awaitingAssignment,
              icon: UserPlus,
            },
            {
              label: "Pending Approvals",
              value:
                metrics.pendingAssignments,
              icon: Clock3,
            },
            {
              label: "Critical",
              value: metrics.critical,
              icon: AlertCircle,
            },
            {
              label: "Completed",
              value: metrics.completed,
              icon: Check,
            },
          ].map(
            ({
              label,
              value,
              icon: Icon,
            }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <Icon className="h-4 w-4 text-emerald-400/60" />

                  <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                    Ops
                  </span>
                </div>

                <div className="text-2xl font-semibold">
                  {value}
                </div>

                <div className="mt-1 text-xs text-white/35">
                  {label}
                </div>
              </div>
            ),
          )}
        </div>

        {/* ====================================================
            SEARCH
            ==================================================== */}

        <div className="mb-5 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />

            <Input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search case number, title, client, objective, subject, service..."
              className="h-11 border-white/10 bg-white/[0.025] pl-10 text-white placeholder:text-white/25"
            />
          </div>

          <div className="flex items-center rounded-xl border border-white/8 bg-white/[0.02] px-4 text-xs text-white/35">
            {filteredCases.length} result
            {filteredCases.length ===
            1
              ? ""
              : "s"}
          </div>
        </div>

        {/* ====================================================
            MAIN LAYOUT
            ==================================================== */}

        {loading ? (
          <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02]">
            <div className="flex items-center gap-3 text-sm text-white/45">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
              Loading case operations...
            </div>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(520px,0.95fr)]">
            {/* ==================================================
                CASE LIST
                ================================================== */}

            <div className="rounded-2xl border border-white/8 bg-white/[0.02]">
              <div className="border-b border-white/8 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">
                      Active Case Registry
                    </h2>

                    <p className="mt-1 text-xs text-white/30">
                      Full operational case index
                    </p>
                  </div>

                  <Users className="h-4 w-4 text-white/25" />
                </div>
              </div>

              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredCases.length ===
                0 ? (
                  <div className="flex min-h-[400px] items-center justify-center px-6 text-center">
                    <div>
                      <FileText className="mx-auto mb-3 h-8 w-8 text-white/15" />
                      <div className="text-sm text-white/50">
                        No cases found.
                      </div>
                      <div className="mt-1 text-xs text-white/25">
                        Try a different search term.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-white/6">
                    {filteredCases.map(
                      (item) => {
                        const expanded =
                          expandedCaseId ===
                          item.id

                        const selected =
                          selectedCaseId ===
                          item.id

                        const assignments =
                          item.assignments ||
                          []

                        const pendingCount =
                          assignments.filter(
                            (
                              assignment,
                            ) =>
                              assignment.status ===
                              "pending",
                          ).length

                        return (
                          <div
                            key={item.id}
                            className={
                              selected
                                ? "bg-emerald-500/[0.045]"
                                : "bg-transparent"
                            }
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCaseId(
                                  item.id,
                                )

                                if (
                                  expanded
                                ) {
                                  setExpandedCaseId(
                                    null,
                                  )
                                } else {
                                  setExpandedCaseId(
                                    item.id,
                                  )
                                }

                                setSelectedAssignmentId(
                                  null,
                                )
                              }}
                              className="w-full px-5 py-4 text-left transition hover:bg-white/[0.03]"
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 shrink-0 text-white/25">
                                  {expanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                      <div className="font-mono text-[11px] text-emerald-400/70">
                                        {item.case_number}
                                      </div>

                                      <div className="mt-1 truncate text-sm font-medium text-white/85">
                                        {item.title}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <span
                                        className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${statusClass(
                                          item.status,
                                        )}`}
                                      >
                                        {formatLabel(
                                          STATUS_LABELS[
                                            item.status ||
                                              ""
                                          ] ||
                                            item.status,
                                        )}
                                      </span>

                                      <span
                                        className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${
                                          item.priority ===
                                          "critical"
                                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                                            : item.priority ===
                                                "high"
                                              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                              : "border-white/10 bg-white/[0.03] text-white/45"
                                        }`}
                                      >
                                        {formatLabel(
                                          item.priority,
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-3 grid gap-2 text-xs text-white/35 sm:grid-cols-3">
                                    <div>
                                      Client:{" "}
                                      <span className="text-white/55">
                                        {item.client_username ||
                                          item.client_email ||
                                          "Unknown"}
                                      </span>
                                    </div>

                                    <div>
                                      Service:{" "}
                                      <span className="text-white/55">
                                        {formatLabel(
                                          item.service_type,
                                        )}
                                      </span>
                                    </div>

                                    <div>
                                      Progress:{" "}
                                      <span className="text-white/55">
                                        {item.progress ??
                                          0}
                                        %
                                      </span>
                                    </div>
                                  </div>

                                  {pendingCount >
                                    0 && (
                                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-300/80">
                                      <Clock3 className="h-3 w-3" />
                                      {pendingCount} pending
                                      assignment
                                      {pendingCount ===
                                      1
                                        ? ""
                                        : "s"}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>

                            {expanded && (
                              <div className="border-t border-white/6 px-5 pb-5 pt-1">
                                <div className="grid gap-1 sm:grid-cols-2">
                                  <DetailRow
                                    label="Created"
                                    value={formatDateTime(
                                      item.created_at,
                                    )}
                                  />

                                  <DetailRow
                                    label="Estimated Completion"
                                    value={formatDate(
                                      item.estimated_completion,
                                    )}
                                  />

                                  <DetailRow
                                    label="Payment"
                                    value={formatLabel(
                                      item.payment_status,
                                    )}
                                  />

                                  <DetailRow
                                    label="Investigation Objective"
                                    value={
                                      item.investigation_objective ||
                                      "Not supplied"
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      },
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ==================================================
                DETAIL PANEL
                ================================================== */}

            <div className="xl:sticky xl:top-6 xl:self-start">
              {!selectedCase ? (
                <div className="flex min-h-[620px] items-center justify-center rounded-2xl border border-dashed border-white/8 bg-white/[0.02] px-8 text-center">
                  <div className="max-w-sm">
                    <Shield className="mx-auto mb-4 h-10 w-10 text-white/10" />
                    <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
                      Select a Case
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-white/25">
                      Select a case from the registry
                      to inspect the complete client
                      submission, operational state,
                      assignments, and controls.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-48px)] overflow-y-auto rounded-2xl border border-white/8 bg-white/[0.02]">
                  {/* ==========================================
                      DETAIL HEADER
                      ========================================== */}

                  <div className="border-b border-white/8 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] text-emerald-400/70">
                          {selectedCase.case_number}
                        </div>

                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                          {selectedCase.title}
                        </h2>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusClass(
                              selectedCase.status,
                            )}`}
                          >
                            {STATUS_LABELS[
                              selectedCase.status ||
                                ""
                            ] ||
                              formatLabel(
                                selectedCase.status,
                              )}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/45">
                            {formatLabel(
                              selectedCase.service_type,
                            )}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/45">
                            {formatLabel(
                              selectedCase.payment_status,
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 lg:min-w-[245px]">
                        <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3 text-center">
                          <div className="text-lg font-semibold">
                            {selectedCase.progress ??
                              0}
                            %
                          </div>
                          <div className="text-[9px] uppercase tracking-[0.14em] text-white/25">
                            Progress
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3 text-center">
                          <div className="text-lg font-semibold">
                            {
                              assignmentStats.total
                            }
                          </div>
                          <div className="text-[9px] uppercase tracking-[0.14em] text-white/25">
                            Assignments
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3 text-center">
                          <div className="text-lg font-semibold">
                            {
                              assignmentStats.pending
                            }
                          </div>
                          <div className="text-[9px] uppercase tracking-[0.14em] text-white/25">
                            Pending
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 p-5">
                    {/* ========================================
                        OPERATIONAL CONTROLS
                        ======================================== */}

                    <Section
                      title="Operational Controls"
                      icon={
                        <Shield className="h-4 w-4" />
                      }
                    >
                      <div className="grid gap-4">
                        <div>
                          <label className="mb-2 block text-xs text-white/40">
                            Case Title
                          </label>

                          <Input
                            value={editTitle}
                            onChange={(event) =>
                              setEditTitle(
                                event.target
                                  .value,
                              )
                            }
                            className="border-white/10 bg-black/20 text-white"
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-xs text-white/40">
                              Workflow Status
                            </label>

                            <select
                              value={editStatus}
                              onChange={(event) =>
                                setEditStatus(
                                  event.target
                                    .value,
                                )
                              }
                              className="h-10 w-full rounded-md border border-white/10 bg-[#07100b] px-3 text-sm text-white outline-none"
                            >
                              {WORKFLOW_STATUSES.map(
                                (
                                  status,
                                ) => (
                                  <option
                                    key={
                                      status
                                    }
                                    value={
                                      status
                                    }
                                  >
                                    {STATUS_LABELS[
                                      status
                                    ] ||
                                      formatLabel(
                                        status,
                                      )}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-xs text-white/40">
                              Priority
                            </label>

                            <select
                              value={editPriority}
                              onChange={(event) =>
                                setEditPriority(
                                  event.target
                                    .value,
                                )
                              }
                              className="h-10 w-full rounded-md border border-white/10 bg-[#07100b] px-3 text-sm text-white outline-none"
                            >
                              {PRIORITIES.map(
                                (
                                  priority,
                                ) => (
                                  <option
                                    key={
                                      priority
                                    }
                                    value={
                                      priority
                                    }
                                  >
                                    {formatLabel(
                                      priority,
                                    )}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs text-white/40">
                            Estimated Completion
                          </label>

                          <Input
                            type="date"
                            value={editDeadline}
                            onChange={(event) =>
                              setEditDeadline(
                                event.target
                                  .value,
                              )
                            }
                            className="border-white/10 bg-black/20 text-white"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs text-white/40">
                            Operational Note
                          </label>

                          <Textarea
                            value={editNote}
                            onChange={(event) =>
                              setEditNote(
                                event.target
                                  .value,
                              )
                            }
                            placeholder="Add an internal operational note..."
                            className="min-h-[90px] border-white/10 bg-black/20 text-white placeholder:text-white/20"
                          />
                        </div>

                        <Button
                          type="button"
                          onClick={() =>
                            void submitCaseUpdate()
                          }
                          disabled={
                            actionLoading
                          }
                          className="bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                          {actionLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Save Case State
                        </Button>
                      </div>
                    </Section>

                    {/* ========================================
                        CLIENT REQUEST
                        ======================================== */}

                    <Section
                      title="Original Client Submission"
                      icon={
                        <FileText className="h-4 w-4" />
                      }
                    >
                      <div className="space-y-4">
                        <DetailRow
                          label="Client"
                          value={
                            selectedCase.client_username ||
                            selectedCase.client_email
                          }
                        />

                        <DetailRow
                          label="Client Email"
                          value={
                            selectedCase.client_email
                          }
                        />

                        <DetailRow
                          label="Contact Method"
                          value={
                            selectedCase.contact_method
                          }
                        />

                        <DetailRow
                          label="Anonymous Request"
                          value={
                            selectedCase.is_anonymous
                              ? "Yes"
                              : "No"
                          }
                        />

                        <DetailRow
                          label="Request Title"
                          value={
                            selectedCase.request_title
                          }
                        />

                        <DetailRow
                          label="Service Requested"
                          value={
                            selectedCase.request_service_type ||
                            selectedCase.service_type
                          }
                        />

                        <div className="border-b border-white/5 py-3">
                          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-400/55">
                            Investigation Objective
                          </div>

                          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.035] p-4 text-sm leading-7 text-white/80">
                            {selectedCase.investigation_objective ||
                              "No investigation objective was supplied."}
                          </div>
                        </div>

                        <DetailRow
                          label="Original Description"
                          value={
                            selectedCase.request_description ||
                            selectedCase.description
                          }
                        />

                        <DetailRow
                          label="Existing Information"
                          value={
                            selectedCase.existing_information
                          }
                        />

                        <DetailRow
                          label="Investigation Depth"
                          value={
                            selectedCase.investigation_depth
                          }
                        />

                        <DetailRow
                          label="Confidentiality"
                          value={
                            selectedCase.confidentiality_level
                          }
                        />

                        <DetailRow
                          label="Authorization Confirmed"
                          value={
                            selectedCase.authorization_confirmed
                              ? "Yes"
                              : "No"
                          }
                        />
                      </div>
                    </Section>

                    {/* ========================================
                        SUBJECT
                        ======================================== */}

                    <Section
                      title="Subject Information"
                      icon={
                        <UserCheck className="h-4 w-4" />
                      }
                    >
                      <div>
                        <DetailRow
                          label="Subject Type"
                          value={
                            selectedCase.subject_type
                          }
                        />

                        <DetailRow
                          label="Full Name"
                          value={
                            selectedCase.subject_full_name
                          }
                        />

                        <DetailRow
                          label="Known Usernames"
                          value={
                            selectedCase.subject_known_usernames
                          }
                        />

                        <DetailRow
                          label="Emails"
                          value={
                            selectedCase.subject_emails
                          }
                        />

                        <DetailRow
                          label="Phone Numbers"
                          value={
                            selectedCase.subject_phone_numbers
                          }
                        />

                        <DetailRow
                          label="Location"
                          value={
                            selectedCase.subject_location
                          }
                        />

                        <DetailRow
                          label="Organization"
                          value={
                            selectedCase.subject_organization
                          }
                        />

                        <DetailRow
                          label="Websites"
                          value={
                            selectedCase.subject_websites
                          }
                        />

                        <DetailRow
                          label="Platform"
                          value={
                            selectedCase.subject_platform
                          }
                        />

                        <DetailRow
                          label="Domain"
                          value={
                            selectedCase.subject_domain
                          }
                        />

                        <DetailRow
                          label="URL"
                          value={
                            selectedCase.subject_url
                          }
                        />

                        <DetailRow
                          label="IP Address"
                          value={
                            selectedCase.subject_ip_address
                          }
                        />

                        <DetailRow
                          label="Approximate Age"
                          value={
                            selectedCase.subject_approximate_age
                          }
                        />

                        <DetailRow
                          label="Nationality"
                          value={
                            selectedCase.subject_nationality
                          }
                        />

                        <DetailRow
                          label="Languages"
                          value={
                            selectedCase.subject_languages_spoken
                          }
                        />

                        <DetailRow
                          label="Last Known Address"
                          value={
                            selectedCase.subject_last_known_address
                          }
                        />

                        <DetailRow
                          label="Last Known Occupation"
                          value={
                            selectedCase.subject_last_known_occupation
                          }
                        />

                        <DetailRow
                          label="Additional Usernames"
                          value={
                            selectedCase.subject_additional_usernames
                          }
                        />

                        <DetailRow
                          label="Gaming IDs"
                          value={
                            selectedCase.subject_gaming_ids
                          }
                        />

                        <DetailRow
                          label="Crypto Wallets"
                          value={
                            selectedCase.subject_cryptocurrency_wallets
                          }
                        />

                        <DetailRow
                          label="Domain Names"
                          value={
                            selectedCase.subject_domain_names
                          }
                        />

                        <DetailRow
                          label="IP Addresses"
                          value={
                            selectedCase.subject_ip_addresses
                          }
                        />

                        <DetailRow
                          label="Vehicle Registration"
                          value={
                            selectedCase.subject_vehicle_registration
                          }
                        />
                      </div>
                    </Section>

                    {/* ========================================
                        COMPANY
                        ======================================== */}

                    {(selectedCase.subject_company_name ||
                      selectedCase.subject_company_website ||
                      selectedCase.subject_company_country ||
                      selectedCase.subject_company_industry) && (
                      <Section
                        title="Company Information"
                        icon={
                          <Users className="h-4 w-4" />
                        }
                      >
                        <DetailRow
                          label="Company"
                          value={
                            selectedCase.subject_company_name
                          }
                        />

                        <DetailRow
                          label="Website"
                          value={
                            selectedCase.subject_company_website
                          }
                        />

                        <DetailRow
                          label="Country"
                          value={
                            selectedCase.subject_company_country
                          }
                        />

                        <DetailRow
                          label="Industry"
                          value={
                            selectedCase.subject_company_industry
                          }
                        />
                      </Section>
                    )}

                    {/* ========================================
                        COMMUNICATION
                        ======================================== */}

                    <Section
                      title="Communication & Intake"
                      icon={
                        <MessageSquare className="h-4 w-4" />
                      }
                    >
                      <DetailRow
                        label="Communication Method"
                        value={
                          selectedCase.communication_method
                        }
                      />

                      <DetailRow
                        label="Client Contact"
                        value={
                          selectedCase.client_email
                        }
                      />

                      <DetailRow
                        label="Request Token"
                        value={
                          selectedCase.token
                        }
                        mono
                      />
                    </Section>

                    {/* ========================================
                        QUOTE / PAYMENT
                        ======================================== */}

                    <Section
                      title="Commercial State"
                      icon={
                        <Clock3 className="h-4 w-4" />
                      }
                    >
                      <DetailRow
                        label="Payment Status"
                        value={
                          selectedCase.payment_status
                        }
                      />

                      <DetailRow
                        label="Approved Quote"
                        value={formatMoney(
                          selectedCase.approved_quote_amount,
                          selectedCase.approved_quote_currency ||
                            selectedCase.currency,
                        )}
                      />

                      <DetailRow
                        label="Original Final Price"
                        value={formatMoney(
                          selectedCase.final_price,
                          selectedCase.currency,
                        )}
                      />

                      <DetailRow
                        label="AI Price Estimate"
                        value={formatMoney(
                          selectedCase.ai_price_estimate,
                          selectedCase.currency,
                        )}
                      />

                      <DetailRow
                        label="AI Complexity"
                        value={
                          selectedCase.ai_complexity
                        }
                      />

                      <DetailRow
                        label="AI Confidence"
                        value={
                          selectedCase.ai_confidence !==
                            null &&
                          selectedCase.ai_confidence !==
                            undefined
                            ? `${selectedCase.ai_confidence}`
                            : "—"
                        }
                      />

                      <DetailRow
                        label="Quote Sent"
                        value={formatDateTime(
                          selectedCase.quote_sent_at,
                        )}
                      />

                      <DetailRow
                        label="Client Decision"
                        value={formatDateTime(
                          selectedCase.client_decision_at,
                        )}
                      />

                      {selectedCase.declined_reason && (
                        <DetailRow
                          label="Declined Reason"
                          value={
                            selectedCase.declined_reason
                          }
                        />
                      )}
                    </Section>

                    {/* ========================================
                        SUPPORTING LINKS
                        ======================================== */}

                    {parseLinks(
                      selectedCase.supporting_links,
                    ).length >
                      0 && (
                      <Section
                        title="Supporting Links"
                        icon={
                          <Link2 className="h-4 w-4" />
                        }
                      >
                        <div className="space-y-2">
                          {parseLinks(
                            selectedCase.supporting_links,
                          ).map(
                            (
                              link,
                              index,
                            ) => (
                              <a
                                key={`${link}-${index}`}
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-lg border border-white/7 bg-black/15 px-3 py-2 text-xs text-cyan-300 transition hover:border-cyan-500/20 hover:bg-cyan-500/5"
                              >
                                <Link2 className="h-3.5 w-3.5 shrink-0" />
                                <span className="break-all">
                                  {link}
                                </span>
                              </a>
                            ),
                          )}
                        </div>
                      </Section>
                    )}

                    {/* ========================================
                        AI ANALYSIS
                        ======================================== */}

                    {(selectedCase.ai_analysis ||
                      selectedCase.ai_reasoning) && (
                      <Section
                        title="AI Analysis"
                        icon={
                          <AlertCircle className="h-4 w-4" />
                        }
                      >
                        {selectedCase.ai_analysis && (
                          <div className="mb-4">
                            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
                              Analysis
                            </div>

                            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/7 bg-black/20 p-4 text-xs leading-6 text-white/60">
                              {
                                selectedCase.ai_analysis
                              }
                            </pre>
                          </div>
                        )}

                        {selectedCase.ai_reasoning && (
                          <div>
                            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
                              Reasoning
                            </div>

                            <div className="rounded-xl border border-white/7 bg-black/20 p-4 text-xs leading-6 text-white/60">
                              {
                                selectedCase.ai_reasoning
                              }
                            </div>
                          </div>
                        )}
                      </Section>
                    )}

                    {/* ========================================
                        ASSIGNMENT DESK
                        ======================================== */}

                    <Section
                      title="Assignment Desk"
                      icon={
                        <UserPlus className="h-4 w-4" />
                      }
                    >
                      <div className="mb-4 grid grid-cols-4 gap-2">
                        <div className="rounded-xl border border-white/7 bg-white/[0.02] p-3">
                          <div className="text-lg font-semibold">
                            {
                              assignmentStats.total
                            }
                          </div>
                          <div className="text-[9px] uppercase tracking-[0.12em] text-white/25">
                            Total
                          </div>
                        </div>

                        <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-3">
                          <div className="text-lg font-semibold text-amber-300">
                            {
                              assignmentStats.pending
                            }
                          </div>
                          <div className="text-[9px] uppercase tracking-[0.12em] text-white/25">
                            Pending
                          </div>
                        </div>

                        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-3">
                          <div className="text-lg font-semibold text-emerald-300">
                            {
                              assignmentStats.approved
                            }
                          </div>
                          <div className="text-[9px] uppercase tracking-[0.12em] text-white/25">
                            Active
                          </div>
                        </div>

                        <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-3">
                          <div className="text-lg font-semibold text-red-300">
                            {
                              assignmentStats.rejected
                            }
                          </div>
                          <div className="text-[9px] uppercase tracking-[0.12em] text-white/25">
                            Rejected
                          </div>
                        </div>
                      </div>

                      {!showAssignmentForm ? (
                        <Button
                          type="button"
                          onClick={() =>
                            setShowAssignmentForm(
                              true,
                            )
                          }
                          className="w-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Assign Operator
                        </Button>
                      ) : (
                        <div className="space-y-4 rounded-xl border border-white/8 bg-black/15 p-4">
                          <div>
                            <label className="mb-2 block text-xs text-white/40">
                              Assignment Role
                            </label>

                            <select
                              value={
                                assignmentRole
                              }
                              onChange={(
                                event,
                              ) => {
                                setAssignmentRole(
                                  event.target
                                    .value as AssignmentRole,
                                )
                                setAssignmentUserId(
                                  "",
                                )
                              }}
                              className="h-10 w-full rounded-md border border-white/10 bg-[#07100b] px-3 text-sm text-white outline-none"
                            >
                              {ASSIGNMENT_ROLES.map(
                                (
                                  role,
                                ) => (
                                  <option
                                    key={
                                      role
                                    }
                                    value={
                                      role
                                    }
                                  >
                                    {formatLabel(
                                      role,
                                    )}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-xs text-white/40">
                              Operator
                            </label>

                            <select
                              value={
                                assignmentUserId
                              }
                              onChange={(
                                event,
                              ) =>
                                setAssignmentUserId(
                                  event.target
                                    .value,
                                )
                              }
                              className="h-10 w-full rounded-md border border-white/10 bg-[#07100b] px-3 text-sm text-white outline-none"
                            >
                              <option value="">
                                Select operator
                              </option>

                              {selectedRoleStaff.map(
                                (
                                  member,
                                ) => (
                                  <option
                                    key={
                                      member.id
                                    }
                                    value={
                                      member.id
                                    }
                                  >
                                   {member.full_name || member.username} — {member.role}
                                  </option>
                                ),
                              )}
                            </select>

                            {selectedRoleStaff.length ===
                              0 && (
                              <p className="mt-2 text-[11px] text-amber-300/65">
                                No active operators
                                are available for this
                                role.
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="mb-2 block text-xs text-white/40">
                              Deadline
                            </label>

                            <Input
                              type="date"
                              value={
                                assignmentDeadline
                              }
                              onChange={(
                                event,
                              ) =>
                                setAssignmentDeadline(
                                  event.target
                                    .value,
                                )
                              }
                              className="border-white/10 bg-black/20 text-white"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs text-white/40">
                              Assignment Notes
                            </label>

                            <Textarea
                              value={
                                assignmentNotes
                              }
                              onChange={(
                                event,
                              ) =>
                                setAssignmentNotes(
                                  event.target
                                    .value,
                                )
                              }
                              placeholder="Instructions for the assigned operator..."
                              className="min-h-[85px] border-white/10 bg-black/20 text-white placeholder:text-white/20"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowAssignmentForm(
                                  false,
                                )
                                setAssignmentUserId(
                                  "",
                                )
                                setAssignmentNotes(
                                  "",
                                )
                                setAssignmentDeadline(
                                  "",
                                )
                              }}
                              className="border-white/10 bg-transparent text-white/55 hover:bg-white/[0.04]"
                            >
                              Cancel
                            </Button>

                            <Button
                              type="button"
                              onClick={() =>
                                void assignOperator()
                              }
                              disabled={
                                actionLoading ||
                                !assignmentUserId
                              }
                              className="bg-emerald-600 text-white hover:bg-emerald-500"
                            >
                              {actionLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <UserPlus className="mr-2 h-4 w-4" />
                              )}
                              Submit Assignment
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 space-y-2">
                        {(
                          selectedCase.assignments ||
                          []
                        ).length ===
                        0 ? (
                          <div className="rounded-xl border border-dashed border-white/8 px-4 py-6 text-center text-xs text-white/25">
                            No assignments yet.
                          </div>
                        ) : (
                          (
                            selectedCase.assignments ||
                            []
                          ).map(
                            (
                              assignment,
                            ) => (
                              <div
                                key={
                                  assignment.id
                                }
                                className="rounded-xl border border-white/7 bg-white/[0.018] p-4"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-medium text-white/80">
                                        {assignment.username ||
                                          assignment.email ||
                                          "Unknown operator"}
                                      </span>

                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] ${roleClass(
                                          assignment.assignment_role ||
                                            assignment.user_role,
                                        )}`}
                                      >
                                        {formatLabel(
                                          assignment.assignment_role ||
                                            assignment.user_role,
                                        )}
                                      </span>

                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] ${statusClass(
                                          assignment.status,
                                        )}`}
                                      >
                                        {formatLabel(
                                          assignment.status,
                                        )}
                                      </span>
                                    </div>

                                    <div className="mt-2 text-[11px] text-white/30">
                                      Assigned{" "}
                                      {formatDateTime(
                                        assignment.assigned_at,
                                      )}
                                      {assignment.assigned_by_username
                                        ? ` by ${assignment.assigned_by_username}`
                                        : ""}
                                    </div>

                                    {assignment.deadline && (
                                      <div className="mt-1 text-[11px] text-white/35">
                                        Deadline:{" "}
                                        <span className="text-white/55">
                                          {formatDate(
                                            assignment.deadline,
                                          )}
                                        </span>
                                      </div>
                                    )}

                                    {assignment.notes && (
                                      <div className="mt-3 rounded-lg border border-white/6 bg-black/15 px-3 py-2 text-xs leading-5 text-white/50">
                                        {
                                          assignment.notes
                                        }
                                      </div>
                                    )}

                                    {assignment.rejection_reason && (
                                      <div className="mt-3 rounded-lg border border-red-500/10 bg-red-500/[0.03] px-3 py-2 text-xs leading-5 text-red-300/70">
                                        Rejection:{" "}
                                        {
                                          assignment.rejection_reason
                                        }
                                      </div>
                                    )}
                                  </div>

                                  {assignment.status ===
                                    "pending" && (
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedAssignmentId(
                                            assignment.id,
                                          )
                                          void approveAssignment(
                                            assignment.id,
                                          )
                                        }}
                                        disabled={
                                          actionLoading
                                        }
                                        className="bg-emerald-600 text-white hover:bg-emerald-500"
                                      >
                                        <Check className="mr-1.5 h-3.5 w-3.5" />
                                        Approve
                                      </Button>

                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          setSelectedAssignmentId(
                                            selectedAssignmentId ===
                                              assignment.id
                                              ? null
                                              : assignment.id,
                                          )
                                        }
                                        className="border-red-500/20 bg-transparent text-red-300 hover:bg-red-500/5"
                                      >
                                        <X className="mr-1.5 h-3.5 w-3.5" />
                                        Reject
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {selectedAssignmentId ===
                                  assignment.id &&
                                  assignment.status ===
                                    "pending" && (
                                  <div className="mt-4 border-t border-white/7 pt-4">
                                    <label className="mb-2 block text-xs text-white/40">
                                      Rejection Reason
                                    </label>

                                    <Textarea
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
                                      placeholder="Explain why this assignment is being rejected..."
                                      className="min-h-[90px] border-white/10 bg-black/20 text-white placeholder:text-white/20"
                                    />

                                    <div className="mt-3 flex gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                          void rejectAssignment(
                                            assignment.id,
                                          )
                                        }
                                        disabled={
                                          actionLoading
                                        }
                                        className="bg-red-600 text-white hover:bg-red-500"
                                      >
                                        {actionLoading ? (
                                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <X className="mr-2 h-3.5 w-3.5" />
                                        )}
                                        Confirm Rejection
                                      </Button>

                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedAssignmentId(
                                            null,
                                          )
                                          setRejectionReason(
                                            "",
                                          )
                                        }}
                                        className="border-white/10 bg-transparent text-white/50 hover:bg-white/[0.04]"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ),
                          )
                        )}
                      </div>
                    </Section>

                    {/* ========================================
                        CASE METADATA
                        ======================================== */}

                    <Section
                      title="Case Metadata"
                      icon={
                        <FileText className="h-4 w-4" />
                      }
                    >
                      <DetailRow
                        label="Case ID"
                        value={
                          selectedCase.id
                        }
                        mono
                      />

                      <DetailRow
                        label="Request ID"
                        value={
                          selectedCase.request_id
                        }
                        mono
                      />

                      <DetailRow
                        label="Organization ID"
                        value={
                          selectedCase.organization_id
                        }
                        mono
                      />

                      <DetailRow
                        label="Created"
                        value={formatDateTime(
                          selectedCase.created_at,
                        )}
                      />

                      <DetailRow
                        label="Started"
                        value={formatDateTime(
                          selectedCase.started_at,
                        )}
                      />

                      <DetailRow
                        label="Completed"
                        value={formatDateTime(
                          selectedCase.completed_at,
                        )}
                      />

                      <DetailRow
                        label="Updated"
                        value={formatDateTime(
                          selectedCase.updated_at,
                        )}
                      />
                    </Section>

                    {/* ========================================
                        DANGER ZONE
                        ======================================== */}

                    <Section
                      title="Case Lifecycle"
                      icon={
                        <Archive className="h-4 w-4" />
                      }
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            void archiveCase()
                          }
                          disabled={
                            actionLoading ||
                            selectedCase.status ===
                              "archived"
                          }
                          className="border-amber-500/15 bg-amber-500/[0.03] text-amber-300 hover:bg-amber-500/[0.08]"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive Case
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            void deleteCase()
                          }
                          disabled={
                            actionLoading
                          }
                          className="border-red-500/15 bg-red-500/[0.03] text-red-300 hover:bg-red-500/[0.08]"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Case
                        </Button>
                      </div>
                    </Section>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}