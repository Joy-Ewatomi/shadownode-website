"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle2,
  Clock3,
  FileSearch,
  GitBranch,
  ShieldCheck,
  Sparkles,
  UserCheck,
  XCircle,
} from "lucide-react"

type AuditActor = {
  id: string
  username: string | null
  email: string | null
  role: string | null
}

type AuditEvent = {
  id: string
  request_id: string
  action: string
  actor: AuditActor | null
  details: Record<string, unknown> | null
  created_at: string
}

type HistoryResponse = {
  success: boolean
  request?: {
    id: string
    case_number: string | null
    title: string | null
    status: string
    created_at: string
    updated_at: string
  }
  total?: number
  history?: AuditEvent[]
  error?: string
}

type Props = {
  requestId: string
}

function formatAction(action: string) {
  const labels: Record<string, string> = {
    ai_estimate_generated: "AI Estimate Generated",

    client_request_created:
      "Request Created",

    request_submitted_for_super_admin_review:
      "Submitted for Super Administrator Review",

    administrator_submitted_quote_for_super_admin_review:
      "Quote Submitted for Super Administrator Review",

    administrator_adjusted_quote_for_super_admin_review:
      "Administrator Adjusted Quote",

    super_admin_approved_final_quote:
      "Super Administrator Approved Final Quote",

    super_admin_adjusted_quote:
      "Super Administrator Adjusted Quote",

    super_admin_rejected_quote:
      "Super Administrator Rejected Quote",

    super_admin_reviewed_quote:
      "Super Administrator Reviewed Quote",

    quote_sent:
      "Quote Sent",

    client_requested_quote_review:
      "Client Requested Quote Review",

    negotiation_requested:
      "Negotiation Requested",

    administrator_responded_to_negotiation:
      "Administrator Responded to Negotiation",
  }

  return (
    labels[action] ||
    action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) =>
        character.toUpperCase(),
      )
  )
}

function formatRole(role: string | null | undefined) {
  if (!role) return "Unknown"

  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    )
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function getEventIcon(action: string) {
  if (action === "ai_estimate_generated") {
    return Sparkles
  }

  if (
    action.includes("super_admin") ||
    action.includes("final_quote")
  ) {
    return ShieldCheck
  }

  if (action.includes("administrator")) {
    return UserCheck
  }

  if (
    action.includes("negotiation") ||
    action.includes("quote")
  ) {
    return GitBranch
  }

  if (action.includes("created")) {
    return FileSearch
  }

  if (
    action.includes("rejected") ||
    action.includes("declined")
  ) {
    return XCircle
  }

  return Clock3
}

function getEventIconClass(action: string) {
  if (action === "ai_estimate_generated") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
  }

  if (
    action.includes("super_admin") ||
    action.includes("final_quote")
  ) {
    return "border-purple-400/30 bg-purple-400/10 text-purple-300"
  }

  if (action.includes("administrator")) {
    return "border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"
  }

  if (action.includes("negotiation")) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-300"
  }

  if (
    action.includes("rejected") ||
    action.includes("declined")
  ) {
    return "border-red-400/30 bg-red-400/10 text-red-300"
  }

  return "border-white/10 bg-white/5 text-white/60"
}

function formatDetailValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—"
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function DetailGrid({
  details,
}: {
  details: Record<string, unknown>
}) {
  const entries = Object.entries(details)

  if (entries.length === 0) {
    return null
  }

  return (
    <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => {
        const isObject =
          typeof value === "object" &&
          value !== null

        return (
          <div
            key={key}
            className={[
              "min-w-0 rounded border border-white/10 bg-black/20 p-3",
              isObject ? "sm:col-span-2" : "",
            ].join(" ")}
          >
            <p className="break-words font-mono text-[10px] uppercase tracking-[0.15em] text-white/35">
              {key.replace(/_/g, " ")}
            </p>

            {isObject ? (
              <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-white/65">
                {formatDetailValue(value)}
              </pre>
            ) : (
              <p className="mt-1 break-words text-sm text-white/75">
                {formatDetailValue(value)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function RequestGovernanceTimeline({
  requestId,
}: Props) {
  const [history, setHistory] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadHistory() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/admin/requests/history?requestId=${encodeURIComponent(
          requestId,
        )}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      )

      const data =
        (await response.json()) as HistoryResponse

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load request history.",
        )
      }

      setHistory(data.history || [])
    } catch (loadError) {
      console.error(
        "REQUEST GOVERNANCE TIMELINE ERROR:",
        loadError,
      )

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load request history.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [requestId])

  return (
    <section className="min-w-0 rounded-md border border-[#143b28] bg-[#06110f]">
      <div className="border-b border-[#143b28] px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#20dc73]">
          Governance
        </p>

        <h2 className="mt-1 break-words text-lg font-semibold text-white">
          Request History
        </h2>

        <p className="mt-1 break-words text-xs text-white/40">
          Chronological audit trail for this request.
        </p>
      </div>

      <div className="p-5">
        {loading && (
          <div className="flex items-center gap-3 text-sm text-white/50">
            <Clock3 className="h-4 w-4 animate-pulse" />
            Loading governance history...
          </div>
        )}

        {!loading && error && (
          <div className="rounded border border-red-400/20 bg-red-400/5 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

              <div className="min-w-0">
                <p className="font-medium text-red-300">
                  Unable to load history
                </p>

                <p className="mt-1 break-words text-sm text-red-300/60">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading &&
          !error &&
          history.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FileSearch className="h-8 w-8 text-white/20" />

              <p className="mt-3 text-sm text-white/50">
                No governance events recorded yet.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          history.length > 0 && (
            <div className="relative">
              <div className="absolute bottom-5 left-[17px] top-5 w-px bg-[#143b28]" />

              <div className="space-y-7">
                {history.map((event, index) => {
                  const Icon =
                    getEventIcon(event.action)

                  const iconClass =
                    getEventIconClass(event.action)

                  const isLatest =
                    index === history.length - 1

                  return (
                    <article
                      key={event.id}
                      className="relative flex min-w-0 gap-4"
                    >
                      <div
                        className={[
                          "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                          iconClass,
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1 pb-1">
                        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <h3 className="break-words text-sm font-semibold text-white">
                              {formatAction(
                                event.action,
                              )}
                            </h3>

                            <p className="mt-1 break-words text-xs text-white/40">
                              {event.actor?.username ||
                                event.actor?.email ||
                                "System"}
                              {" · "}
                              {formatRole(
                                event.actor?.role,
                              )}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {isLatest && (
                              <span className="rounded border border-[#20dc73]/20 bg-[#20dc73]/5 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#20dc73]">
                                Latest
                              </span>
                            )}

                            <time
                              dateTime={
                                event.created_at
                              }
                              className="font-mono text-[10px] text-white/30"
                            >
                              {formatDate(
                                event.created_at,
                              )}
                            </time>
                          </div>
                        </div>

                        {event.details && (
                          <DetailGrid
                            details={event.details}
                          />
                        )}

                        {event.action ===
                          "request_submitted_for_super_admin_review" &&
                          event.details?.new_status ===
                            "pending_super_admin_review" && (
                            <div className="mt-4 flex items-center gap-2 rounded border border-purple-400/20 bg-purple-400/5 px-3 py-2">
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-purple-300" />

                              <p className="break-words text-xs text-purple-200/70">
                                Administrator handoff completed.
                                This request is now awaiting
                                Super Administrator review.
                              </p>
                            </div>
                          )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )}
      </div>
    </section>
  )
}
