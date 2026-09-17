"use client"

import {
  Activity,
  AlertTriangle,
  Award,
  Bell,
  BriefcaseBusiness,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  MessageSquare,
  ReceiptText,
  ShieldCheck,
  Users,
  X,
} from "lucide-react"

import { useEffect, useState } from "react"
import Link from "next/link"

type Metric = {
  key: string
  label: string
  value: string
  helper?: string
  href?: string
  section?: "primary" | "attention" | "personal" | "oversight"
  icon?: keyof typeof namedIcons
}

type QueueItem = {
  id?: string
  type?: "case" | "request" | "report" | "activity"
  title: string
  detail: string
  status: string
  href?: string
  data?: Record<string, any>
}

const iconMap = [
  ShieldCheck,
  Clock,
  MessageSquare,
  FileText,
  Activity,
  Users,
  AlertTriangle,
]

const namedIcons = {
  activity: Activity,
  alert: AlertTriangle,
  award: Award,
  bell: Bell,
  briefcase: BriefcaseBusiness,
  clock: Clock,
  creditCard: CreditCard,
  fileText: FileText,
  graduationCap: GraduationCap,
  message: MessageSquare,
  receipt: ReceiptText,
  shield: ShieldCheck,
  users: Users,
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatValue(value: any): string {
  if (value === null || value === undefined || value === "") {
    return "Not provided"
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "None"

    return value
      .map((item) =>
        typeof item === "object"
          ? JSON.stringify(item)
          : String(item)
      )
      .join(", ")
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2)
  }

  if (
    typeof value === "string" &&
    !isNaN(Date.parse(value)) &&
    value.includes("T")
  ) {
    return new Date(value).toLocaleString()
  }

  return String(value)
}

function DetailField({
  label,
  value,
}: {
  label: string
  value: any
}) {
  return (
    <div className="rounded-md border border-[#143b28] bg-[#06110f] p-4">
      <p className="text-xs uppercase tracking-wider text-white/35">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-white/80">
        {formatValue(value)}
      </p>
    </div>
  )
}

function RequestSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-[#143b28] pt-5">
      <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">
        {title}
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        {children}
      </div>
    </section>
  )
}

function RequestViewer({
  request,
  onClose,
}: {
  request: Record<string, any>
  onClose: () => void
}) {
  const excluded = new Set([
    "id",
    "user_id",
    "token",
    "ai_analysis",
    "supporting_links",
    "evidence_uploads",
  ])

  const generalFields = [
    "case_number",
    "title",
    "description",
    "service_type",
    "status",
    "priority",
    "timeline",
    "currency",
    "client_country",
    "preferred_currency",
    "created_at",
    "updated_at",
  ]

  const clientFields = [
    "client_username",
    "client_email",
    "contact_method",
    "communication_method",
    "communication_email",
    "communication_country_code",
    "communication_phone",
    "communication_whatsapp",
    "communication_signal",
  ]

  const investigationFields = [
    "investigation_objective",
    "investigation_depth",
    "confidentiality_level",
    "authorization_confirmed",
    "existing_information",
    "custom_description",
    "preferred_deadline",
  ]

  const subjectFields = [
    "subject_type",
    "subject_full_name",
    "subject_known_usernames",
    "subject_additional_usernames",
    "subject_emails",
    "subject_phone_numbers",
    "subject_location",
    "subject_organization",
    "subject_websites",
    "subject_company_name",
    "subject_company_website",
    "subject_company_country",
    "subject_company_industry",
    "subject_domain",
    "subject_url",
    "subject_ip_address",
    "subject_ip_addresses",
    "subject_domain_names",
    "subject_gaming_ids",
    "subject_cryptocurrency_wallets",
    "subject_vehicle_registration",
    "subject_approximate_age",
    "subject_height",
    "subject_weight",
    "subject_hair_color",
    "subject_eye_color",
    "subject_skin_tone",
    "subject_distinguishing_marks",
    "subject_nationality",
    "subject_languages_spoken",
    "subject_last_known_address",
    "subject_last_known_occupation",
  ]

const trainingFields = [
  "training_organization_name",
  "training_client_type",
  "training_participant_count",
  "training_skill_level",

  "training_audience",
  "custom_training_audience",

  "training_industry",

  "training_goal",
  "training_objective",
  "custom_training_objective",

  "training_topics_selected",
  "training_objectives",
  "training_custom_topic",

  "training_format",
  "training_duration",
  "custom_training_days",
  "custom_training_period",

  "training_materials",

  "training_expected_outcome",

  "training_preferred_start_date",
  "training_preferred_completion_date",
  "training_timeline_flexible",

  "training_additional_requirements",
]

  const quoteFields = [
    "ai_price_estimate",
    "approved_quote_amount",
    "approved_quote_currency",
    "approved_quote_notes",
    "approved_estimated_completion",
    "final_price",
    "price_notes",
    "quote_sent_at",
    "client_decision_at",
    "declined_reason",
    "quote_exchange_rate",
    "quote_base_currency",
    "quote_currency_converted_at",
    "approved_quote_base_amount",
  ]

  const reviewFields = [
    "admin_reviewed_by",
    "admin_reviewed_at",
    "admin_quote_action",
    "admin_quote_notes",
    "super_admin_reviewed_by",
    "super_admin_reviewed_at",
    "super_admin_quote_action",
    "super_admin_quote_notes",
  ]

  const renderFields = (fields: string[]) =>
    fields
      .filter((field) => field in request)
      .map((field) => (
        <DetailField
          key={field}
          label={formatLabel(field)}
          value={request[field]}
        />
      ))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-[#143b28] bg-[#020807] shadow-2xl">

        <header className="flex shrink-0 items-start justify-between border-b border-[#143b28] bg-[#06110f] px-5 py-4 sm:px-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Full Request
            </p>

            <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">
              {request.case_number || "Request"}
            </h2>

            <p className="mt-1 text-sm text-white/45">
              {request.title || "Investigation Request"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#143b28] p-2 text-white/60 transition hover:border-[#20dc73]/50 hover:text-white"
            aria-label="Close request"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-3 py-1.5 text-xs uppercase tracking-wider text-[#20dc73]">
              {request.status || "submitted"}
            </span>

            <span className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-wider text-white/60">
              {request.priority || "normal"} priority
            </span>

            {request.client_username && (
              <span className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                Client: {request.client_username}
              </span>
            )}
          </div>

          <div className="space-y-7">

            <RequestSection title="Request Overview">
              {renderFields(generalFields)}
            </RequestSection>

            <RequestSection title="Client & Communication">
              {renderFields(clientFields)}
            </RequestSection>

<RequestSection title="Investigation Details">
  {renderFields(investigationFields)}
</RequestSection>

{request.category === "osint" && (
  <>
    <RequestSection title="Subject Information">
      {renderFields(subjectFields)}
    </RequestSection>
  </>
)}

{request.category === "cybersecurity" && (
  <RequestSection title="Cybersecurity Training Information">
    {renderFields(trainingFields)}
  </RequestSection>
)}

            <RequestSection title="Quote & Financial Information">
              {renderFields(quoteFields)}
            </RequestSection>

            <RequestSection title="Administrator Review">
              {renderFields(reviewFields)}
            </RequestSection>

            <section className="border-t border-[#143b28] pt-5">
              <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">
                AI Analysis
              </h3>

              <pre className="overflow-x-auto rounded-md border border-[#143b28] bg-[#06110f] p-4 text-xs leading-6 text-white/65">
                {formatValue(
                  request.ai_analysis ||
                    {
                      ai_status: request.ai_status,
                      ai_complexity: request.ai_complexity,
                      ai_estimated_hours:
                        request.ai_estimated_hours,
                      ai_suggested_service:
                        request.ai_suggested_service,
                      ai_suggested_priority:
                        request.ai_suggested_priority,
                      ai_confidence:
                        request.ai_confidence,
                      ai_reasoning:
                        request.ai_reasoning,
                    }
                )}
              </pre>
            </section>

            {request.category === "osint" && (
  <section className="border-t border-[#143b28] pt-5">
    <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">
      Supporting Links
    </h3>

    {Array.isArray(request.supporting_links) &&
    request.supporting_links.length > 0 ? (
      <div className="space-y-2">
        {request.supporting_links.map(
          (link: any, index: number) => (
            <pre
              key={index}
              className="overflow-x-auto rounded-md border border-[#143b28] bg-[#06110f] p-3 text-xs text-white/60"
            >
              {formatValue(link)}
            </pre>
          )
        )}
      </div>
    ) : (
      <p className="text-sm text-white/40">
        No supporting links provided.
      </p>
    )}
  </section>
)}

           {request.category === "osint" && (
  <section className="border-t border-[#143b28] pt-5">
    <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">
      Evidence Uploads
    </h3>

    {Array.isArray(request.evidence_uploads) &&
    request.evidence_uploads.length > 0 ? (
      <div className="space-y-2">
        {request.evidence_uploads.map(
          (file: any, index: number) => (
            <pre
              key={index}
              className="overflow-x-auto rounded-md border border-[#143b28] bg-[#06110f] p-3 text-xs text-white/60"
            >
              {formatValue(file)}
            </pre>
          )
        )}
      </div>
    ) : (
      <p className="text-sm text-white/40">
        No evidence uploads provided.
      </p>
    )}
  </section>
)}

            <section className="border-t border-[#143b28] pt-5">
              <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">
                Complete Record
              </h3>

              <details className="rounded-md border border-[#143b28] bg-[#06110f]">
                <summary className="cursor-pointer px-4 py-3 text-sm text-white/60 hover:text-white">
                  Show raw request data
                </summary>

                <pre className="max-h-[500px] overflow-auto border-t border-[#143b28] p-4 text-xs leading-5 text-white/50">
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.entries(request).filter(
                        ([key]) => !excluded.has(key)
                      )
                    ),
                    null,
                    2
                  )}
                </pre>
              </details>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}

export default function RoleDashboard({
  role,
  eyebrow,
  title,
  description,
  metrics,
  queueTitle,
  queueItems,
}: {
  role: string
  eyebrow: string
  title: string
  description: string
  metrics: Metric[]
  queueTitle: string
  queueItems: QueueItem[]
}) {
  const [data, setData] = useState<Record<string, string | number> | null>(
    null
  )

  const [activity, setActivity] = useState<QueueItem[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState("")

  const [selectedRequest, setSelectedRequest] =
    useState<Record<string, any> | null>(null)

useEffect(() => {
  async function loadDashboard() {
    if (role !== "client" && role !== "investigator") {
      setLoading(false)
      return
    }

    try {
      const endpoint =
        role === "client"
          ? "/api/client/dashboard"
          : "/api/investigator/dashboard"

      const res = await fetch(endpoint, {
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error("Dashboard unavailable")
      }

      const json = await res.json()

      setData(json.stats || {})

      if (role === "investigator") {
        setActivity(json.requests || [])
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Dashboard unavailable"
      )
    } finally {
      setLoading(false)
    }
  }

  loadDashboard()
}, [role])

useEffect(() => {
  async function loadActivity() {
    if (role !== "client") return

    try {
      const res = await fetch("/api/client/activity", {
        credentials: "include",
        cache: "no-store",
      })

      if (!res.ok) {
        const errorText = await res.text()

        console.error(
          "CLIENT ACTIVITY API ERROR:",
          res.status,
          errorText
        )

        throw new Error(
          `Failed to load client activity (${res.status})`
        )
      }

      const json = await res.json()

      console.log("CLIENT ACTIVITY:", json)

      setActivity(
        Array.isArray(json) ? json : []
      )
    } catch (error) {
      console.error(
        "CLIENT ACTIVITY FETCH ERROR:",
        error
      )

      setActivity([])
    }
  }

  loadActivity()
}, [role])

 const displayQueue =
  role === "client"
    ? activity
    : role === "investigator"
      ? activity
      : queueItems
    
  return (
    <div className="space-y-6">

      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
          {eyebrow}
        </p>

        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          {title}
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-white/55">
          {description}
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {(["primary", "attention", "personal", "oversight"] as const).map(
        (section) => {
          const sectionMetrics = metrics.filter(
            (metric) => (metric.section || "primary") === section,
          )

          if (!sectionMetrics.length) return null

          return (
            <section key={section} className="space-y-3">
              {section !== "primary" ? (
                <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">
                  {section === "attention"
                    ? "Attention Required"
                    : section === "personal"
                      ? "My Work"
                      : "Organization Oversight"}
                </h2>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {sectionMetrics.map((metric, index) => {
                  const Icon = metric.icon
                    ? namedIcons[metric.icon]
                    : iconMap[index % iconMap.length]

                  const value =
                    role === "client"
                      ? data?.[metric.key] ?? metric.value ?? 0
                      : metric.value

                  const card = (
                    <div className="h-full rounded-md border border-[#143b28] bg-[#06110f] p-5 transition hover:border-[#20dc73]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73]/70">
                      <Icon className="h-5 w-5 text-[#20dc73]" />

                      <p className="mt-4 text-xl font-bold text-white sm:text-2xl">
                        {value}
                      </p>

                      <p className="mt-2 text-sm text-white/50">
                        {metric.label}
                      </p>

                      <p className="mt-1 text-xs text-white/40">
                        {metric.helper}
                      </p>
                    </div>
                  )

                  return metric.href ? (
                    <Link
                      key={`${metric.label}-${index}`}
                      href={metric.href}
                      aria-label={`${metric.label}: ${value}`}
                    >
                      {card}
                    </Link>
                  ) : (
                    <div key={`${metric.label}-${index}`}>{card}</div>
                  )
                })}
              </div>
            </section>
          )
        },
      )}

    {queueTitle && (
  <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
    <div className="flex h-[24rem] min-w-0 max-w-full flex-col overflow-hidden rounded-md border border-[#143b28] bg-[#06110f] sm:h-[28rem]">
      <div className="shrink-0 border-b border-[#143b28] px-5 py-4">
        <h2 className="font-semibold text-white">
          {queueTitle}
        </h2>
      </div>

      <div className="min-h-0 min-w-0 flex-1 divide-y divide-[#143b28] overflow-y-auto overscroll-contain">
        {loading && role === "client" ? (
          <div className="px-5 py-8 text-sm text-white/50">
            Loading dashboard...
          </div>
        ) : displayQueue.length === 0 ? (
          <div className="px-5 py-8 text-sm text-white/50">
            No requests or activity found.
          </div>
        ) : (
          displayQueue.map((item, index) => (
            <div
              key={
                item.id
                  ? `${item.type || "item"}-${item.id}`
                  : `${item.title}-${item.status}-${index}`
              }
              className="flex min-w-0 max-w-full flex-col gap-4 overflow-hidden px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 max-w-full flex-1 overflow-hidden">
                <p className="min-w-0 max-w-full break-words text-sm font-medium text-white [overflow-wrap:anywhere]">
                  {item.title}
                </p>

                <p className="mt-1 min-w-0 max-w-full whitespace-normal break-words text-sm leading-6 text-white/45 [overflow-wrap:anywhere]">
                  {item.detail}
                </p>
              </div>

              <div className="flex max-w-full shrink-0 flex-wrap items-center gap-3">
                <span className="max-w-full break-words rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs text-[#20dc73] [overflow-wrap:anywhere]">
                  {item.status}
                </span>

                {role !== "client" && item.data && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRequest(item.data || null)
                    }
                    className="shrink-0 rounded-md border border-[#20dc73]/30 px-3 py-1.5 text-xs font-medium text-[#20dc73] transition hover:bg-[#20dc73]/10"
                  >
                    View Full Request
                  </button>
                )}

                {item.href && (
                  <Link
                    href={item.href}
                    className="shrink-0 rounded-md border border-[#20dc73]/30 px-3 py-1.5 text-xs font-medium text-[#20dc73] transition hover:bg-[#20dc73]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73]"
                    aria-label={`Open ${item.title}`}
                  >
                    Open
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>

    <aside className="min-w-0 max-w-full overflow-hidden rounded-md border border-[#143b28] bg-[#06110f] p-5 xl:sticky xl:top-6 xl:self-start">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">
        Security Notice
      </p>

      <p className="mt-3 break-words text-sm leading-6 text-white/58 [overflow-wrap:anywhere]">
        SHADOWNODE Operations Bureau maintains secure investigation
        workflows. Quotes, cases, reports and communication updates
        appear here as they are processed.
      </p>
    </aside>
  </section>
)}
    </div>
  )
}
