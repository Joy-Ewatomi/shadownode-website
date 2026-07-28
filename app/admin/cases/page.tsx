"use client"

import { useEffect, useMemo, useState } from "react"
import { Archive, CalendarClock, FileText, Search, ShieldCheck, Trash2, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const WORKFLOW_STATUSES = [
  "request_received",
  "admin_review",
  "case_created",
  "priority_assigned",
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
] as const

const STATUS_LABELS: Record<string, string> = {
  submitted: "Request Received",
  active: "Investigation In Progress",
  completed: "Delivered",
  archived: "Archived",
  request_received: "Request Received",
  admin_review: "Admin Review",
  case_created: "Case Created",
  priority_assigned: "Priority Assigned",
  investigator_assigned: "Investigator Assigned",
  analyst_assigned: "Analyst Assigned",
  case_accepted: "Case Accepted",
  investigation_in_progress: "Investigation In Progress",
  awaiting_client: "Awaiting Client",
  under_internal_review: "Under Internal Review",
  final_report_generated: "Final Report Generated",
  delivered: "Delivered",
  closed: "Closed",
}

const PRIORITIES = ["low", "normal", "high", "critical"]
const ASSIGNMENT_ROLES = ["investigator", "analyst", "forensic_examiner"]

type Staff = {
  id: string
  username: string
  email: string
  role: string
}

type CaseItem = {
  id: string
  case_number: string
  title: string
  service_type: string
  status: string
  priority: string
  description?: string
  estimated_completion?: string
  created_at: string
  assignments?: Array<{
    id: string
    user_id: string
    username: string
    user_role: string
    assignment_role: string
    status: string
    deadline?: string
    notes?: string
    accepted_at?: string
    rejected_at?: string
    rejection_reason?: string
  }>
}

export default function AdminCases() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")
  const [form, setForm] = useState({
    title: "",
    status: "admin_review",
    priority: "normal",
    deadline: "",
    assignmentRole: "investigator",
    userId: "",
    assignmentDeadline: "",
    assignmentNotes: "",
    note: "",
  })

  async function load() {
    const res = await fetch("/api/admin/cases", { credentials: "include" })
    if (res.status === 401) {
      window.location.href = "/login"
      return
    }
    if (res.status === 403) {
      window.location.href = "/403"
      return
    }
    const data = await res.json()
    setCases(data.cases || [])
    setStaff(data.staff || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const selectedCase = cases.find((item) => item.id === selectedId) || cases[0]

  useEffect(() => {
    if (!selectedCase) return
    setSelectedId(selectedCase.id)
    setForm((current) => ({
      ...current,
      title: selectedCase.title || "",
      status: selectedCase.status || "admin_review",
      priority: selectedCase.priority || "normal",
      deadline: selectedCase.estimated_completion?.slice(0, 10) || "",
    }))
  }, [selectedCase?.id])

  const filteredCases = useMemo(() => {
    const needle = query.toLowerCase().trim()
    if (!needle) return cases
    return cases.filter((item) =>
      [item.case_number, item.title, item.service_type, item.status, item.priority]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle)),
    )
  }, [cases, query])

  const metrics = {
    total: cases.length,
    active: cases.filter((item) => !["closed", "archived", "completed"].includes(item.status)).length,
    critical: cases.filter((item) => item.priority === "critical").length,
    review: cases.filter((item) => ["admin_review", "under_internal_review", "submitted"].includes(item.status)).length,
  }

  const metricCards = [
    { label: "Total Cases", value: metrics.total, Icon: ShieldCheck },
    { label: "Active Missions", value: metrics.active, Icon: UserCheck },
    { label: "Critical Priority", value: metrics.critical, Icon: CalendarClock },
    { label: "Review Queue", value: metrics.review, Icon: Search },
  ]

  async function updateCase(action = "update_case") {
    if (!selectedCase) return
    setSaving(true)
    await fetch("/api/admin/cases", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id: selectedCase.id,
        title: form.title,
        status: form.status,
        priority: form.priority,
        estimated_completion: form.deadline || null,
        note: form.note,
        action,
      }),
    })
    setForm((current) => ({ ...current, note: "" }))
    await load()
    setSaving(false)
  }

  async function assign() {
    if (!selectedCase || !form.userId) return
    setSaving(true)
    await fetch("/api/admin/cases", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id: selectedCase.id,
        user_id: form.userId,
        assignment_role: form.assignmentRole,
        deadline: form.assignmentDeadline || null,
        notes: form.assignmentNotes || null,
      }),
    })
    setForm((current) => ({ ...current, userId: "", assignmentDeadline: "", assignmentNotes: "" }))
    await load()
    setSaving(false)
  }

  async function archiveOrDelete(action: "archive" | "delete") {
    if (!selectedCase) return
    setSaving(true)
    await fetch(`/api/admin/cases?case_id=${selectedCase.id}&action=${action}`, {
      method: "DELETE",
      credentials: "include",
    })
    await load()
    setSaving(false)
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#020604] text-[#20dc73]">Loading Mission Control...</div>
  }

  return (
    <main className="min-h-screen bg-[#020604] p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-[#143b28] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Administrator Command Center</p>
            <h1 className="mt-2 text-3xl font-bold">Mission Control</h1>
            <p className="mt-1 text-sm text-white/55">Create, triage, assign, close, archive, and audit active investigations.</p>
          </div>
          <Button className="bg-[#20dc73] text-black hover:bg-[#7bf69f]">
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          {metricCards.map(({ label, value, Icon }) => (
            <div key={label} className="rounded-md border border-[#143b28] bg-[#06110f] p-4">
              <Icon className="mb-3 h-5 w-5 text-[#20dc73]" />
              <p className="text-xs uppercase tracking-[0.16em] text-white/45">{label}</p>
              <p className="mt-1 text-2xl font-bold text-[#20dc73]">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-md border border-[#143b28] bg-[#06110f] px-3 py-2">
              <Search className="h-4 w-4 text-[#20dc73]" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search case, service, priority, status..." className="border-0 bg-transparent text-white shadow-none focus-visible:ring-0" />
            </div>

            <div className="space-y-3">
              {filteredCases.map((caseItem) => (
                <button
                  key={caseItem.id}
                  onClick={() => setSelectedId(caseItem.id)}
                  className={`w-full rounded-md border p-4 text-left transition ${selectedCase?.id === caseItem.id ? "border-[#20dc73] bg-[#0a1b12]" : "border-[#143b28] bg-[#06110f] hover:border-[#20dc73]/60"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm text-[#20dc73]">{caseItem.case_number}</p>
                      <h2 className="mt-1 font-semibold">{caseItem.title}</h2>
                    </div>
                    <span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs text-[#20dc73]">{STATUS_LABELS[caseItem.status] || caseItem.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/50">
                    <span>{caseItem.service_type}</span>
                    <span>Priority: {caseItem.priority}</span>
                    <span>{new Date(caseItem.created_at).toLocaleDateString()}</span>
                    <span>{caseItem.assignments?.length || 0} assigned</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <aside className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
            {selectedCase ? (
              <div className="space-y-5">
                <div>
                  <p className="font-mono text-sm text-[#20dc73]">{selectedCase.case_number}</p>
                  <h2 className="mt-1 text-xl font-bold">Operational Controls</h2>
                </div>

                <label className="block text-sm text-white/60">
                  Case Title
                  <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 border-[#143b28] bg-black text-white" />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-white/60">
                    Workflow
                    <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-2 h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white">
                      {WORKFLOW_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm text-white/60">
                    Priority
                    <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="mt-2 h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white">
                      {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                    </select>
                  </label>
                </div>

                <label className="block text-sm text-white/60">
                  Deadline
                  <Input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} className="mt-2 border-[#143b28] bg-black text-white" />
                </label>

                <label className="block text-sm text-white/60">
                  Transition Note
                  <Textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Internal audit note..." className="mt-2 min-h-24 border-[#143b28] bg-black text-white" />
                </label>

                <Button disabled={saving} onClick={() => updateCase()} className="w-full bg-[#20dc73] text-black hover:bg-[#7bf69f]">Save Case State</Button>

                <div className="border-t border-[#143b28] pt-5">
                  <h3 className="font-semibold">Assignment Desk</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <select value={form.assignmentRole} onChange={(event) => setForm({ ...form, assignmentRole: event.target.value })} className="h-10 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white">
                      {ASSIGNMENT_ROLES.map((role) => <option key={role} value={role}>{role.replace("_", " ")}</option>)}
                    </select>
                    <select value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} className="h-10 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white">
                      <option value="">Select operator</option>
                      {staff.map((user) => <option key={user.id} value={user.id}>{user.username} ({user.role})</option>)}
                    </select>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Input type="date" value={form.assignmentDeadline} onChange={(event) => setForm({ ...form, assignmentDeadline: event.target.value })} className="border-[#143b28] bg-black text-white" />
                    <Input value={form.assignmentNotes} onChange={(event) => setForm({ ...form, assignmentNotes: event.target.value })} placeholder="Assignment notes" className="border-[#143b28] bg-black text-white" />
                  </div>
                  <Button disabled={saving || !form.userId} onClick={assign} variant="outline" className="mt-3 w-full border-[#20dc73]/50 text-[#20dc73] hover:bg-[#20dc73]/10">Assign Operator</Button>
                </div>

                <div className="border-t border-[#143b28] pt-5">
                  <h3 className="font-semibold">Current Assignments</h3>
                  <div className="mt-3 space-y-2">
                    {(selectedCase.assignments || []).map((assignment) => (
                      <div key={assignment.id} className="rounded-md border border-[#143b28] bg-black/40 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-white">{assignment.username}</p>
                          <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">{assignment.status}</span>
                        </div>
                        <p className="mt-1 text-xs text-white/50">{assignment.assignment_role.replace("_", " ")} {assignment.deadline ? `• due ${new Date(assignment.deadline).toLocaleDateString()}` : ""}</p>
                        {assignment.notes ? <p className="mt-2 text-sm text-white/65">{assignment.notes}</p> : null}
                        {assignment.rejection_reason ? <p className="mt-2 text-sm text-red-300">Rejected: {assignment.rejection_reason}</p> : null}
                      </div>
                    ))}
                    {!selectedCase.assignments?.length ? <p className="text-sm text-white/45">No active assignments recorded.</p> : null}
                  </div>
                </div>

                <div className="grid gap-3 border-t border-[#143b28] pt-5 sm:grid-cols-3">
                  <Button disabled={saving} onClick={() => updateCase("close_case")} variant="outline" className="border-white/20 text-white hover:bg-white/10">Close Case</Button>
                  <Button disabled={saving} onClick={() => archiveOrDelete("archive")} variant="outline" className="border-white/20 text-white hover:bg-white/10"><Archive className="mr-2 h-4 w-4" />Archive</Button>
                  <Button disabled={saving} onClick={() => archiveOrDelete("delete")} variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                </div>
              </div>
            ) : (
              <p className="text-white/50">No cases are currently available.</p>
            )}
          </aside>
        </section>
      </div>
    </main>
  )
}
