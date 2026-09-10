"use client"

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  FileText,
  Flag,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react"

import Link from "next/link"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

type JsonPrimitive =
  | string
  | number
  | boolean
  | null

type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]: JsonValue
    }

type Message = {
  id: string
  sender_id: string
  sender_username: string | null
  sender_role: string | null
  message: string
  created_at: string
  read_at: string | null
}

type ClientSubmission = {
  id: string

  client_email: string | null
  contact_method: string | null
  is_anonymous: boolean | null

  service_type: string | null
  title: string | null
  description: string | null
  investigation_objective: string | null

  priority: string | null
  currency: string | null
  preferred_currency: string | null

  subject_type: string | null
  subject_full_name: string | null
  subject_known_usernames: string | null
  subject_emails: string | null
  subject_phone_numbers: string | null
  subject_location: string | null
  subject_organization: string | null
  subject_websites: string | null

  subject_company_name: string | null
  subject_company_website: string | null
  subject_company_country: string | null
  subject_company_industry: string | null

  subject_domain: string | null
  subject_url: string | null
  subject_ip_address: string | null
  subject_platform: string | null

  subject_approximate_age: string | null
  subject_height: string | null
  subject_weight: string | null
  subject_hair_color: string | null
  subject_eye_color: string | null
  subject_skin_tone: string | null
  subject_distinguishing_marks: string | null
  subject_nationality: string | null
  subject_languages_spoken: string | null

  subject_last_known_address: string | null
  subject_last_known_occupation: string | null

  subject_additional_usernames: string | null
  subject_gaming_ids: string | null
  subject_cryptocurrency_wallets: string | null
  subject_domain_names: string | null
  subject_ip_addresses: string | null
  subject_vehicle_registration: string | null

  existing_information: string | null
  investigation_depth: string | null
  confidentiality_level: string | null
  authorization_confirmed: boolean | null

  communication_method: string | null
  communication_email: string | null
  communication_country_code: string | null
  communication_phone: string | null
  communication_whatsapp: string | null
  communication_signal: string | null

  client_country: string | null
  timeline: string | null
  additional_notes: string | null

  supporting_links: JsonValue | null
  evidence_uploads: JsonValue | null
}

type ClientCasePayload = {
  case: {
    id: string
    case_number: string
    title: string
    status: string | null
    priority: string | null
    created_at: string
    progress: number
    objective: string | null
  }

  submission: ClientSubmission | null

  timeline: {
    id: string
    update_type: string | null
    title: string | null
    content: string | null
    created_at: string
  }[]

  reports: {
    id: string
    title: string | null
    file_url: string | null
    summary: string | null
    created_at: string
  }[]

  message_summary: {
    id: string
    case_id: string
    unread_count: number
    messages: Message[]
  } | null
}

function formatStatus(
  value: string | null | undefined,
) {
  if (!value) {
    return "Unknown"
  }

  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (char) => char.toUpperCase(),
    )
}

function formatPriority(
  value: string | null | undefined,
) {
  if (!value) {
    return "Normal"
  }

  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (char) => char.toUpperCase(),
    )
}

function formatRole(
  value: string | null | undefined,
) {
  if (!value) {
    return "Bureau"
  }

  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (char) => char.toUpperCase(),
    )
}

function formatLabel(
  value: string | null | undefined,
) {
  if (!value) {
    return ""
  }

  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (char) => char.toUpperCase(),
    )
}

function formatDate(value: string) {
  return new Date(
    value,
  ).toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  )
}

function formatDateTime(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  )
}

function hasValue(
  value:
    | string
    | number
    | boolean
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return false
  }

  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return false
  }

  return true
}

function SubmissionField({
  label,
  value,
}: {
  label: string
  value:
    | string
    | number
    | boolean
    | null
    | undefined
}) {
  if (!hasValue(value)) {
    return null
  }

  return (
    <div className="rounded-lg border border-white/5 bg-black/20 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm leading-6 text-white/65">
        {typeof value === "boolean"
          ? value
            ? "Confirmed"
            : "Not confirmed"
          : String(value)}
      </p>
    </div>
  )
}

function SubmissionSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-white/5 pt-5 first:border-t-0 first:pt-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]">
        {title}
      </p>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {children}
      </div>
    </section>
  )
}

function JsonList({
  value,
}: {
  value: JsonValue | null | undefined
}) {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return (
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/60">
        {String(value)}
      </p>
    )
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return null
    }

    return (
      <div className="space-y-1.5">
        {value.map(
          (item, index) => (
            <div
              key={`${index}-${JSON.stringify(
                item,
              )}`}
              className="rounded-md border border-white/5 bg-black/20 px-3 py-2 text-xs text-white/55"
            >
              {typeof item ===
                "string" ||
              typeof item ===
                "number" ||
              typeof item ===
                "boolean"
                ? String(item)
                : JSON.stringify(
                    item,
                    null,
                    2,
                  )}
            </div>
          ),
        )}
      </div>
    )
  }

  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-white/5 bg-black/20 p-3 text-xs leading-5 text-white/50">
      {JSON.stringify(
        value,
        null,
        2,
      )}
    </pre>
  )
}

export default function ClientCasePortal({
  caseId,
}: {
  caseId: string
}) {
  const [data, setData] =
    useState<ClientCasePayload | null>(
      null,
    )

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState("")

  const [draft, setDraft] =
    useState("")

  const [sending, setSending] =
    useState(false)

  const load =
    useCallback(
      async (
        silent = false,
      ) => {
        if (silent) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        try {
          const response =
            await fetch(
              `/api/client/cases/${encodeURIComponent(
                caseId,
              )}`,
              {
                credentials:
                  "include",
                cache:
                  "no-store",
              },
            )

          const payload =
            await response
              .json()
              .catch(
                () => null,
              )

          if (!response.ok) {
            throw new Error(
              payload?.error ||
                "Case unavailable",
            )
          }

          setData(
            payload as ClientCasePayload,
          )

          setError("")
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Case unavailable",
          )
        } finally {
          setLoading(false)
          setRefreshing(false)
        }
      },
      [caseId],
    )

  useEffect(() => {
    void load()
  }, [load])

  // ==========================================================
  // MARK MESSAGES READ
  // ==========================================================

  useEffect(() => {
    const conversationId =
      data?.message_summary?.id

    if (!conversationId) {
      return
    }

    void fetch(
      "/api/messages",
      {
        method: "PATCH",
        credentials:
          "include",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          conversation_id:
            conversationId,
        }),
      },
    ).catch(
      () => undefined,
    )
  }, [
    data?.message_summary?.id,
  ])

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  const sendMessage =
    useCallback(
      async () => {
        const text =
          draft.trim()

        if (
          !text ||
          !data?.case.id ||
          sending
        ) {
          return
        }

        setSending(true)

        try {
          const response =
            await fetch(
              "/api/messages",
              {
                method: "POST",
                credentials:
                  "include",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  conversation_id:
                    data
                      .message_summary
                      ?.id,
                  case_id:
                    data.case.id,
                  message: text,
                }),
              },
            )

          const payload =
            await response
              .json()
              .catch(
                () => null,
              )

          if (!response.ok) {
            throw new Error(
              payload?.error ||
                "Message could not be sent",
            )
          }

          setDraft("")

          await load(true)
        } catch (
          sendError
        ) {
          console.error(
            "CLIENT CASE MESSAGE ERROR",
            sendError,
          )
        } finally {
          setSending(false)
        }
      },
      [
        data,
        draft,
        load,
        sending,
      ],
    )

  const progress =
    useMemo(
      () =>
        Math.max(
          0,
          Math.min(
            100,
            Number(
              data?.case
                .progress ??
                0,
            ),
          ),
        ),
      [
        data?.case
          .progress,
      ],
    )

  const status =
    formatStatus(
      data?.case.status,
    )

  const priority =
    formatPriority(
      data?.case.priority,
    )

  const updates =
    useMemo(
      () =>
        [
          ...(data?.timeline ??
            []),
        ].slice(0, 5),
      [data?.timeline],
    )

  const messages =
    data?.message_summary
      ?.messages ??
    []

  const submission =
    data?.submission ??
    null

  if (loading) {
    return (
      <main className="space-y-4">
        <section className="rounded-xl border border-[#143b28] bg-[#06110f] p-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 animate-spin text-[#20dc73]" />

            <div>
              <p className="text-sm font-semibold text-white">
                Loading case
              </p>

              <p className="mt-1 text-xs text-white/35">
                Retrieving case information...
              </p>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (
    error ||
    !data
  ) {
    return (
      <main className="space-y-4">
        <section className="rounded-xl border border-red-500/20 bg-[#06110f] p-6">
          <p className="text-sm font-semibold text-white">
            Case unavailable
          </p>

          <p className="mt-2 text-sm text-red-200/70">
            {error ||
              "This case could not be loaded."}
          </p>

          <button
            type="button"
            onClick={() =>
              void load()
            }
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 pb-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard/client/cases"
              className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35 transition hover:text-[#20dc73]"
            >
              <ArrowLeft className="h-3 w-3" />
              Cases
            </Link>

            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#20dc73]/20 bg-[#20dc73]/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#20dc73]">
                  <CircleDot className="h-2.5 w-2.5 fill-current" />
                  {status}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  <Flag className="h-2.5 w-2.5" />
                  {priority}
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {data.case.title}
              </h1>

              <p className="mt-1 font-mono text-[11px] text-white/30">
                {data.case.case_number}
              </p>
            </div>
          </div>

          <div className="w-full max-w-xs lg:w-64">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  Investigation progress
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {progress}%
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void load(true)
                }
                disabled={
                  refreshing
                }
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#143b28] px-3 text-xs font-semibold text-white/45 transition hover:text-white disabled:opacity-40"
              >
                <RefreshCw
                  className={
                    refreshing
                      ? "h-3.5 w-3.5 animate-spin"
                      : "h-3.5 w-3.5"
                  }
                />
                Refresh
              </button>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[#20dc73] transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          SNAPSHOT
      ====================================================== */}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#143b28] bg-[#06110f] px-4 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#20dc73]" />

            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
              Service
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-white">
            {formatLabel(
              submission?.service_type,
            ) ||
              data.case.title}
          </p>
        </div>

        <div className="rounded-xl border border-[#143b28] bg-[#06110f] px-4 py-4">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-[#20dc73]" />

            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
              Priority
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-white">
            {priority}
          </p>
        </div>

        <div className="rounded-xl border border-[#143b28] bg-[#06110f] px-4 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#20dc73]" />

            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
              Opened
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-white">
            {formatDate(
              data.case.created_at,
            )}
          </p>
        </div>
      </section>

      {/* ======================================================
          FULL CLIENT OVERVIEW
      ====================================================== */}

      <section className="rounded-xl border border-[#143b28] bg-[#06110f] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#20dc73]/20 bg-[#20dc73]/5">
            <FileText className="h-4 w-4 text-[#20dc73]" />
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]">
              Overview
            </p>

            <h2 className="mt-1 text-base font-semibold text-white">
              Your submitted investigation
            </h2>
          </div>
        </div>

        {!submission ? (
          <div className="mt-5 rounded-lg border border-white/5 bg-black/20 p-6 text-sm text-white/35">
            The original request information is
            not available for this case.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* REQUEST */}

            <SubmissionSection title="Request">
              <SubmissionField
                label="Service Type"
                value={formatLabel(
                  submission.service_type,
                )}
              />

              <SubmissionField
                label="Request Title"
                value={
                  submission.title
                }
              />

              <SubmissionField
                label="Priority"
                value={formatLabel(
                  submission.priority,
                )}
              />

              <SubmissionField
                label="Investigation Depth"
                value={formatLabel(
                  submission.investigation_depth,
                )}
              />

              <SubmissionField
                label="Confidentiality"
                value={formatLabel(
                  submission.confidentiality_level,
                )}
              />

              <SubmissionField
                label="Timeline"
                value={
                  submission.timeline
                }
              />

              <SubmissionField
                label="Client Country"
                value={
                  submission.client_country
                }
              />

              <SubmissionField
                label="Preferred Currency"
                value={
                  submission.preferred_currency
                }
              />

              <SubmissionField
                label="Request Contact Method"
                value={
                  submission.contact_method
                }
              />

              <SubmissionField
                label="Anonymous Request"
                value={
                  submission.is_anonymous
                }
              />
            </SubmissionSection>

            {/* OBJECTIVE */}

            <SubmissionSection title="Investigation Objective">
              <div className="sm:col-span-2 rounded-lg border border-[#20dc73]/10 bg-[#20dc73]/[0.025] p-4">
                <p className="whitespace-pre-wrap text-sm leading-7 text-white/65">
                  {submission.investigation_objective ||
                    "No objective recorded."}
                </p>
              </div>
            </SubmissionSection>

            {/* SUBJECT */}

            <SubmissionSection title="Subject Information">
              <SubmissionField
                label="Subject Type"
                value={formatLabel(
                  submission.subject_type,
                )}
              />

              <SubmissionField
                label="Full Name"
                value={
                  submission.subject_full_name
                }
              />

              <SubmissionField
                label="Known Usernames"
                value={
                  submission.subject_known_usernames
                }
              />

              <SubmissionField
                label="Emails"
                value={
                  submission.subject_emails
                }
              />

              <SubmissionField
                label="Phone Numbers"
                value={
                  submission.subject_phone_numbers
                }
              />

              <SubmissionField
                label="Location"
                value={
                  submission.subject_location
                }
              />

              <SubmissionField
                label="Organization"
                value={
                  submission.subject_organization
                }
              />

              <SubmissionField
                label="Websites"
                value={
                  submission.subject_websites
                }
              />

              <SubmissionField
                label="Domain"
                value={
                  submission.subject_domain
                }
              />

              <SubmissionField
                label="URL"
                value={
                  submission.subject_url
                }
              />

              <SubmissionField
                label="IP Address"
                value={
                  submission.subject_ip_address
                }
              />

              <SubmissionField
                label="Platform"
                value={
                  submission.subject_platform
                }
              />
            </SubmissionSection>

            {/* COMPANY */}

            {(hasValue(
              submission.subject_company_name,
            ) ||
              hasValue(
                submission.subject_company_website,
              ) ||
              hasValue(
                submission.subject_company_country,
              ) ||
              hasValue(
                submission.subject_company_industry,
              )) && (
              <SubmissionSection title="Company Information">
                <SubmissionField
                  label="Company Name"
                  value={
                    submission.subject_company_name
                  }
                />

                <SubmissionField
                  label="Company Website"
                  value={
                    submission.subject_company_website
                  }
                />

                <SubmissionField
                  label="Company Country"
                  value={
                    submission.subject_company_country
                  }
                />

                <SubmissionField
                  label="Industry"
                  value={
                    submission.subject_company_industry
                  }
                />
              </SubmissionSection>
            )}

            {/* ADDITIONAL SUBJECT DETAILS */}

            {(hasValue(
              submission.subject_approximate_age,
            ) ||
              hasValue(
                submission.subject_height,
              ) ||
              hasValue(
                submission.subject_weight,
              ) ||
              hasValue(
                submission.subject_hair_color,
              ) ||
              hasValue(
                submission.subject_eye_color,
              ) ||
              hasValue(
                submission.subject_skin_tone,
              ) ||
              hasValue(
                submission.subject_distinguishing_marks,
              ) ||
              hasValue(
                submission.subject_nationality,
              ) ||
              hasValue(
                submission.subject_languages_spoken,
              )) && (
              <SubmissionSection title="Additional Subject Details">
                <SubmissionField
                  label="Approximate Age"
                  value={
                    submission.subject_approximate_age
                  }
                />

                <SubmissionField
                  label="Height"
                  value={
                    submission.subject_height
                  }
                />

                <SubmissionField
                  label="Weight"
                  value={
                    submission.subject_weight
                  }
                />

                <SubmissionField
                  label="Hair Color"
                  value={
                    submission.subject_hair_color
                  }
                />

                <SubmissionField
                  label="Eye Color"
                  value={
                    submission.subject_eye_color
                  }
                />

                <SubmissionField
                  label="Skin Tone"
                  value={
                    submission.subject_skin_tone
                  }
                />

                <SubmissionField
                  label="Distinguishing Marks"
                  value={
                    submission.subject_distinguishing_marks
                  }
                />

                <SubmissionField
                  label="Nationality"
                  value={
                    submission.subject_nationality
                  }
                />

                <SubmissionField
                  label="Languages Spoken"
                  value={
                    submission.subject_languages_spoken
                  }
                />
              </SubmissionSection>
            )}

            {/* HISTORICAL / IDENTIFIER DATA */}

            {(hasValue(
              submission.subject_last_known_address,
            ) ||
              hasValue(
                submission.subject_last_known_occupation,
              ) ||
              hasValue(
                submission.subject_additional_usernames,
              ) ||
              hasValue(
                submission.subject_gaming_ids,
              ) ||
              hasValue(
                submission.subject_cryptocurrency_wallets,
              ) ||
              hasValue(
                submission.subject_domain_names,
              ) ||
              hasValue(
                submission.subject_ip_addresses,
              ) ||
              hasValue(
                submission.subject_vehicle_registration,
              )) && (
              <SubmissionSection title="Additional Identifiers & History">
                <SubmissionField
                  label="Last Known Address"
                  value={
                    submission.subject_last_known_address
                  }
                />

                <SubmissionField
                  label="Last Known Occupation"
                  value={
                    submission.subject_last_known_occupation
                  }
                />

                <SubmissionField
                  label="Additional Usernames"
                  value={
                    submission.subject_additional_usernames
                  }
                />

                <SubmissionField
                  label="Gaming IDs"
                  value={
                    submission.subject_gaming_ids
                  }
                />

                <SubmissionField
                  label="Cryptocurrency Wallets"
                  value={
                    submission.subject_cryptocurrency_wallets
                  }
                />

                <SubmissionField
                  label="Domain Names"
                  value={
                    submission.subject_domain_names
                  }
                />

                <SubmissionField
                  label="IP Addresses"
                  value={
                    submission.subject_ip_addresses
                  }
                />

                <SubmissionField
                  label="Vehicle Registration"
                  value={
                    submission.subject_vehicle_registration
                  }
                />
              </SubmissionSection>
            )}

            {/* EXISTING INFORMATION */}

            {hasValue(
              submission.existing_information,
            ) && (
              <SubmissionSection title="Existing Information">
                <div className="sm:col-span-2">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-white/55">
                    {
                      submission.existing_information
                    }
                  </p>
                </div>
              </SubmissionSection>
            )}

            {/* AUTHORIZATION */}

            <SubmissionSection title="Authorization">
              <SubmissionField
                label="Authorization Confirmed"
                value={
                  submission.authorization_confirmed
                }
              />
            </SubmissionSection>

            {/* COMMUNICATION */}

            <SubmissionSection title="Communication">
              <SubmissionField
                label="Communication Method"
                value={formatLabel(
                  submission.communication_method,
                )}
              />

              <SubmissionField
                label="Email"
                value={
                  submission.communication_email ||
                  submission.client_email
                }
              />

              <SubmissionField
                label="Country Code"
                value={
                  submission.communication_country_code
                }
              />

              <SubmissionField
                label="Phone"
                value={
                  submission.communication_phone
                }
              />

              <SubmissionField
                label="WhatsApp"
                value={
                  submission.communication_whatsapp
                }
              />

              <SubmissionField
                label="Signal"
                value={
                  submission.communication_signal
                }
              />
            </SubmissionSection>

            {/* SUPPORTING LINKS */}

            {submission.supporting_links !==
              null &&
              submission.supporting_links !==
                undefined && (
                <SubmissionSection title="Supporting Links">
                  <div className="sm:col-span-2">
                    <JsonList
                      value={
                        submission.supporting_links
                      }
                    />
                  </div>
                </SubmissionSection>
              )}

            {/* EVIDENCE */}

            {submission.evidence_uploads !==
              null &&
              submission.evidence_uploads !==
                undefined && (
                <SubmissionSection title="Submitted Evidence">
                  <div className="sm:col-span-2">
                    <JsonList
                      value={
                        submission.evidence_uploads
                      }
                    />
                  </div>
                </SubmissionSection>
              )}

            {/* NOTES */}

            {hasValue(
              submission.additional_notes,
            ) && (
              <SubmissionSection title="Additional Notes">
                <div className="sm:col-span-2">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-white/55">
                    {
                      submission.additional_notes
                    }
                  </p>
                </div>
              </SubmissionSection>
            )}
          </div>
        )}
      </section>

      {/* ======================================================
          ACTIVITY + REPORTS
      ====================================================== */}

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border border-[#143b28] bg-[#06110f] p-5 sm:p-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]">
              Activity
            </p>

            <h2 className="mt-1 text-base font-semibold text-white">
              Recent case updates
            </h2>
          </div>

          <div className="mt-5">
            {updates.length > 0 ? (
              <div className="space-y-4">
                {updates.map(
                  (update) => (
                    <div
                      key={
                        update.id
                      }
                      className="flex gap-3"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#143b28] bg-black/20">
                        {update.update_type ===
                        "payment" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#20dc73]" />
                        ) : (
                          <CircleDot className="h-3.5 w-3.5 text-[#20dc73]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-medium text-white/75">
                            {update.title ||
                              "Case update"}
                          </p>

                          <time className="text-[10px] text-white/25">
                            {formatDateTime(
                              update.created_at,
                            )}
                          </time>
                        </div>

                        {update.content && (
                          <p className="mt-1.5 text-xs leading-5 text-white/40">
                            {
                              update.content
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-white/5 bg-black/20 p-7 text-center">
                <CircleDot className="mx-auto h-5 w-5 text-white/15" />

                <p className="mt-2 text-sm text-white/35">
                  No updates have been recorded yet.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[#143b28] bg-[#06110f] p-5 sm:p-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]">
              Reports
            </p>

            <h2 className="mt-1 text-base font-semibold text-white">
              Published intelligence
            </h2>
          </div>

          <div className="mt-5">
            {data.reports.length >
            0 ? (
              <div className="space-y-2.5">
                {data.reports.map(
                  (report) => (
                    <div
                      key={
                        report.id
                      }
                      className="rounded-lg border border-white/5 bg-black/20 p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#20dc73]" />

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white/75">
                            {report.title ||
                              "Investigation Report"}
                          </p>

                          <p className="mt-1 text-[10px] text-white/25">
                            Published{" "}
                            {formatDate(
                              report.created_at,
                            )}
                          </p>

                          {report.summary && (
                            <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/40">
                              {
                                report.summary
                              }
                            </p>
                          )}

                          {report.file_url && (
                            <a
                              href={
                                report.file_url
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#20dc73] hover:text-white"
                            >
                              Open report →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-white/5 bg-black/20 p-7 text-center">
                <FileText className="mx-auto h-5 w-5 text-white/15" />

                <p className="mt-2 text-sm text-white/35">
                  No published reports yet.
                </p>

                <p className="mt-1 text-xs text-white/20">
                  Reports will appear here when released to you.
                </p>
              </div>
            )}
          </div>
        </section>
      </section>

      {/* ======================================================
          SECURE MESSAGES
      ====================================================== */}

      <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
        <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#20dc73]/20 bg-[#20dc73]/5">
              <ShieldCheck className="h-4 w-4 text-[#20dc73]" />
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]">
                Secure Channel
              </p>

              <h2 className="mt-1 text-base font-semibold text-white">
                Case communication
              </h2>
            </div>
          </div>

          {data.message_summary &&
            data.message_summary
              .unread_count >
              0 && (
              <span className="rounded-full bg-[#20dc73] px-2 py-1 text-[10px] font-bold text-black">
                {
                  data.message_summary
                    .unread_count
                }{" "}
                unread
              </span>
            )}
        </div>

        <div className="max-h-[24rem] overflow-y-auto px-5 py-4 sm:px-6">
          {messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map(
                (message) => {
                  const isClient =
                    message.sender_role ===
                    "client"

                  return (
                    <article
                      key={
                        message.id
                      }
                      className={
                        isClient
                          ? "ml-auto max-w-2xl rounded-xl border border-[#20dc73]/15 bg-[#20dc73]/5 p-3.5"
                          : "max-w-2xl rounded-xl border border-white/5 bg-black/20 p-3.5"
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white/70">
                            {isClient
                              ? "You"
                              : message.sender_username ||
                                "ShadowNode Bureau"}
                          </p>

                          {!isClient &&
                            message.sender_role && (
                              <p className="mt-0.5 text-[10px] text-[#20dc73]/60">
                                {formatRole(
                                  message.sender_role,
                                )}
                              </p>
                            )}
                        </div>

                        <time className="shrink-0 text-[10px] text-white/20">
                          {formatDateTime(
                            message.created_at,
                          )}
                        </time>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/60">
                        {
                          message.message
                        }
                      </p>
                    </article>
                  )
                },
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <ShieldCheck className="mx-auto h-6 w-6 text-white/15" />

              <p className="mt-2 text-sm text-white/35">
                No messages yet.
              </p>

              <p className="mt-1 text-xs text-white/20">
                Send a message to communicate with your investigation team.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-[#143b28] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <textarea
              value={draft}
              onChange={(event) =>
                setDraft(
                  event.target
                    .value,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                    "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault()
                  void sendMessage()
                }
              }}
              placeholder="Write a message to the investigation team..."
              className="min-h-[3.5rem] flex-1 resize-none rounded-lg border border-[#143b28] bg-black/20 px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#20dc73]/50"
            />

            <button
              type="button"
              onClick={() =>
                void sendMessage()
              }
              disabled={
                !draft.trim() ||
                sending
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#20dc73] px-5 text-xs font-bold text-black transition hover:bg-[#62e79c] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Send
                </>
              )}
            </button>
          </div>

          <p className="mt-2 text-[10px] text-white/20">
            Messages are associated with this case and shared with authorized members of the case team.
          </p>
        </div>
      </section>
    </main>
  )
}