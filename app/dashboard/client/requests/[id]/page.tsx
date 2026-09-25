"use client"

import {
  useEffect,
  useState,
} from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import MarkResourceNotificationsRead from "@/components/notifications/MarkResourceNotificationsRead"
import CustomRequestAdditionalInformation from "@/components/requests/CustomRequestAdditionalInformation"
import CommercialHistoryPanel from "@/components/requests/CommercialHistoryPanel"

type ClientRequest = {
  [key: string]: unknown

  id: string
  case_number?: string | null
  title?: string | null
  description?: string | null
  investigation_objective?: string | null
  service_type?: string | null
  supporting_links?: unknown
  evidence_files?: unknown
  status?: string | null
  client_facing_status_explanation?: string | null

  subject_type?: string | null
  subject_name?: string | null

  training_goal?: string | null
  training_topics?: string | null
  training_details?: Record<string, unknown> | null

  training_audience?: string | null
  custom_training_audience?: string | null
  training_topics_selected?: string[]
  training_format?: string | null
  training_duration?: string | null
  training_materials?: string[]
  training_assessment_required?: boolean
  training_labs_required?: boolean
  expected_outcomes?: string | null

  preferred_currency?: string | null

  approved_quote_amount?: number | string | null
  approved_quote_currency?: string | null
  approved_quote_notes?: string | null

  approved_estimated_start?: string | null
  approved_estimated_completion?: string | null

  training_additional_requirements?: string | null
  additional_notes?: string | null

  training_preferred_start_date?: string | null
  training_preferred_completion_date?: string | null

  original_quote_amount?: number | string | null
  original_quote_currency?: string | null
  quote_exchange_rate?: number | string | null

  quote_sent_at?: string | null
  client_decision_at?: string | null
  declined_reason?: string | null

  created_at?: string | null
  updated_at?: string | null

    commercial_history?: React.ComponentProps<typeof CommercialHistoryPanel>["history"]

  client_negotiation?: {
    id: string
    request_id: string
    round_number: number
    status: string
    requested_budget: number | null
    currency: string | null
    reason: string | null
    notes: string | null
    quote_version_id: string | null
    quote_version_number: number | null
    created_at: string | null
    updated_at: string | null
  } | null

  // =======================================================
  // CYBERSECURITY TRAINING
  // =======================================================

  training_organization_name?: string | null
  training_client_type?: string | null
  training_participant_count?: string | number | null
  training_skill_level?: string | null

  training_industry?: string | null

  training_objectives?: string[] | null
  training_custom_objective?: string | null

  training_custom_topic?: string | null

  training_compliance?: string[] | null

  training_certificate?: string | null

  training_expected_outcome?: string | null
  training_timeline_flexible?: boolean | null

  training_budget?: string | number | null
  training_budget_range?: string | null

  training_location_country?: string | null
  training_location_state?: string | null
  training_location_city?: string | null
  training_location_venue?: string | null

  training_custom_request?: string | null

  // =======================================================
  // OSINT
  // =======================================================

  investigation_depth?: string | null
  urgency?: string | null
  priority?: string | null
  osint_completion_date?: string | null

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

  subject_additional_usernames?: string | null
  subject_gaming_ids?: string | null
  subject_cryptocurrency_wallets?: string | null
  subject_domain_names?: string | null
  subject_ip_addresses?: string | null
  subject_vehicle_registration?: string | null

  existing_information?: string | null
}

type ActionType =
  | "accept"
  | "decline"
  | "negotiate"
  | null

function formatMoney(
  amount: number | string | null | undefined,
  currency: string | null | undefined,
) {
  const numericAmount = Number(amount)

  if (!Number.isFinite(numericAmount)) {
    return `${currency || "USD"} 0.00`
  }

  return `${currency || "USD"} ${numericAmount.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`
}

function formatDate(
  value: string | null | undefined,
) {
  if (!value) {
    return "To be confirmed"
  }

  const raw = String(value).trim()

  if (!raw) {
    return "To be confirmed"
  }

  const match =
    raw.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (match) {
    const [, year, month, day] = match

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    )

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(
        "en-GB",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        },
      )
    }
  }

  

  const timestamp = new Date(raw)

  if (!Number.isNaN(timestamp.getTime())) {
    return timestamp.toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    )
  }

  return "To be confirmed"
}

function getStatusLabel(status: string) {
  switch (status) {
    case "quote_sent":
      return "Quote Sent"

    case "revised_quote_sent":
      return "Revised Quote"

    case "client_decision_pending":
    case "awaiting_client_acceptance":
      return "Awaiting Your Decision"

    case "accepted":
      return "Accepted"

    case "declined":
      return "Declined"

    case "negotiation_requested":
    case "quote_review_requested":
      return "Negotiation Requested"

    case "pending_bureau_review":
    case "submitted":
    case "pending_review":
    case "pending_admin_review":
      return "Pending Bureau Review"

    default:
      return status
        ? status.replaceAll("_", " ")
        : "Unknown Status"
  }
}

function getNegotiationStatusLabel(
  status: string | null | undefined,
) {
  switch (
    String(status || "")
      .trim()
      .toLowerCase()
  ) {
    case "requested":
      return "Submitted to Administrator"

    case "reviewing":
      return "Under Administrator Review"

    case "approved":
      return "Negotiation Approved"

    case "rejected":
      return "Negotiation Rejected"

    case "revised_quote_sent":
      return "Revised Quote Sent"

    case "closed":
      return "Closed"

    default:
      return (
        status
          ?.replaceAll("_", " ")
          .replace(
            /^\w/,
            (character) =>
              character.toUpperCase(),
          ) ||
        "Unknown"
      )
  }
}

function isEmptyValue(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return true
  }

  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return true
  }

  if (
    Array.isArray(value) &&
    value.length === 0
  ) {
    return true
  }

  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  ) {
    return true
  }

  return false
}

const wrapText =
  "[overflow-wrap:anywhere] break-words whitespace-pre-wrap"


export default function ClientRequestDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [request, setRequest] =
    useState<ClientRequest | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")

  const [action, setAction] =
    useState<ActionType>(null)

  const [submitting, setSubmitting] =
    useState(false)

  const [actionError, setActionError] =
    useState("")

  const [actionSuccess, setActionSuccess] =
    useState("")

  const [rejectReason, setRejectReason] =
    useState("")

  const [negotiationAmount, setNegotiationAmount] =
    useState("")

  const [negotiationReason, setNegotiationReason] =
    useState("")

  const [negotiationNotes, setNegotiationNotes] =
    useState("")

  const searchParams =
    useSearchParams()

  /*
   * =========================================================
   * RESOLVE REQUEST ID
   * =========================================================
   */
  useEffect(() => {
    let cancelled = false

    async function resolveRequestId() {
      try {
        const resolved = await params

        if (!cancelled) {
          await loadRequest(
            resolved.id,
            cancelled,
          )
        }
      } catch (err) {
        console.error(
          "REQUEST PARAMETER ERROR",
          err,
        )

        if (!cancelled) {
          setError(
            "Unable to determine the request.",
          )
          setLoading(false)
        }
      }
    }

    resolveRequestId()

    return () => {
      cancelled = true
    }
  }, [params])

  /*
   * =========================================================
   * LOAD REQUEST
   * =========================================================
   */
  async function loadRequest(
    requestId: string,
    cancelled = false,
  ) {
    try {
      setLoading(true)
      setError("")

      const res = await fetch(
        `/api/client/requests/${encodeURIComponent(
          requestId,
        )}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      )

      const responseText =
        await res.text()

      let data: unknown = null

      if (responseText.trim()) {
        try {
          data = JSON.parse(
            responseText,
          )
        } catch {
          console.error(
            "REQUEST API RETURNED NON-JSON:",
            responseText,
          )
        }
      }

      if (!res.ok) {
        if (!cancelled) {
          const errorMessage =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Request not found"

          setError(errorMessage)
        }

        return
      }

      const requestData =
        typeof data === "object" &&
        data !== null &&
        "request" in data
          ? data.request
          : data

      if (
        !requestData ||
        typeof requestData !== "object"
      ) {
        if (!cancelled) {
          setError(
            "Request not found",
          )
        }

        return
      }

      if (!cancelled) {
        setRequest(
          requestData as ClientRequest,
        )
      }
    } catch (err) {
      console.error(
        "LOAD REQUEST ERROR",
        err,
      )

      if (!cancelled) {
        setError(
          "Failed to load request.",
        )
      }
    } finally {
      if (!cancelled) {
        setLoading(false)
      }
    }
  }

/*
 * =========================================================
 * MARK NOTIFICATION AS READ
 * =========================================================
 *
 * When the client opens this request from a notification,
 * the notification ID is carried in the URL:
 *
 * /dashboard/client/requests/[id]?notificationId=XXXX
 *
 * We mark ONLY that notification as read.
 *
 * This does not mark every notification for this request
 * as read. It marks the exact notification that was opened.
 * =========================================================
 */
useEffect(() => {
  const notificationId =
    searchParams.get("notificationId")

  if (!notificationId) {
    return
  }

  const id = notificationId.trim()

  if (!id) {
    return
  }

  async function markNotificationRead() {
    try {
      const response = await fetch(
        `/api/notifications/${encodeURIComponent(id)}/read`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      )

      if (!response.ok) {
        console.error(
          "FAILED TO MARK NOTIFICATION AS READ:",
          response.status,
        )

        return
      }

      console.log(
        "NOTIFICATION MARKED AS READ:",
        id,
      )
    } catch (error) {
      console.error(
        "MARK NOTIFICATION READ ERROR:",
        error,
      )
    }
  }

  markNotificationRead()
}, [searchParams])

  /*
   * =========================================================
   * QUOTE ACTION
   * =========================================================
   */
  async function submitQuoteAction() {
    if (!request || !action) {
      return
    }

    if (submitting) {
      return
    }

    setSubmitting(true)
    setActionError("")
    setActionSuccess("")

    try {
      const resolved = await params

      let body: Record<string, unknown> = {
        action,
      }

      /*
       * DECLINE
       */
      if (action === "decline") {
        const reason =
          rejectReason.trim()

        if (!reason) {
          setActionError(
            "Please provide a reason for rejecting this quote.",
          )
          setSubmitting(false)
          return
        }

        body = {
          action: "decline",
          reason,
        }
      }

      /*
       * NEGOTIATE
       */
      if (action === "negotiate") {
        const amount =
          Number(
            negotiationAmount.trim(),
          )

        const reason =
          negotiationReason.trim()

        const notes =
          negotiationNotes.trim()

        const currentQuote =
          Number(
            request.approved_quote_amount,
          )

        if (
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          setActionError(
            "Please enter a valid proposed amount.",
          )
          setSubmitting(false)
          return
        }

        if (!reason) {
          setActionError(
            "Please provide a reason for the negotiation request.",
          )
          setSubmitting(false)
          return
        }

        if (
          Number.isFinite(currentQuote) &&
          amount === currentQuote
        ) {
          setActionError(
            "Your proposed amount is the same as the current quote. Please enter a different amount.",
          )
          setSubmitting(false)
          return
        }

        body = {
          action: "negotiate",

          requested_budget:
            amount,

          currency:
            request.approved_quote_currency ||
            request.preferred_currency ||
            "NGN",

          reason,

          notes,
        }
      }

      /*
       * SEND DECISION
       */
      const res = await fetch(
        `/api/client/requests/${encodeURIComponent(
          resolved.id,
        )}/decision`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },
          body: JSON.stringify(body),
        },
      )

      const responseText =
        await res.text()

      let data: any = null

      if (responseText.trim()) {
        try {
          data = JSON.parse(
            responseText,
          )
        } catch {
          console.error(
            "QUOTE API RETURNED NON-JSON:",
            responseText,
          )

          if (!res.ok) {
            throw new Error(
              responseText ||
                `Request failed with status ${res.status}.`,
            )
          }
        }
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Unable to process quote action. (${res.status})`,
        )
      }

      /*
       * UPDATE REQUEST FROM API
       */
      if (data?.request) {
        setRequest(
          data.request as ClientRequest,
        )
      } else if (data?.id) {
        setRequest(
          data as ClientRequest,
        )
      } else {
        setRequest(
          (previous) => {
            if (!previous) {
              return previous
            }

            if (
              action === "negotiate"
            ) {
              return {
                ...previous,
                status:
                  "quote_review_requested",
              }
            }

            if (
              action === "decline"
            ) {
              return {
                ...previous,
                status:
                  "declined",
                declined_reason:
                  rejectReason.trim(),
              }
            }

            if (
              action === "accept"
            ) {
              return {
                ...previous,
                status:
                  "accepted",
              }
            }

            return previous
          },
        )
      }

      /*
       * SUCCESS
       */
      if (action === "accept") {
        setActionSuccess(
          "Quote accepted successfully.",
        )
      }

      if (action === "decline") {
        setActionSuccess(
          "Quote declined successfully.",
        )
      }

      if (action === "negotiate") {
        setActionSuccess(
          "Your negotiation request has been submitted.",
        )
      }

      setAction(null)

      setRejectReason("")
      setNegotiationAmount("")
      setNegotiationReason("")
      setNegotiationNotes("")
    } catch (err) {
      console.error(
        "CLIENT QUOTE ACTION ERROR",
        err,
      )

      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to process quote action.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */
  if (loading) {
    return (
      <div className="w-full min-w-0 p-6 text-sm text-white/45">
        Loading request...
      </div>
    )
  }

  /*
   * =========================================================
   * ERROR
   * =========================================================
   */
  if (!request || error) {
    return (
      <div className="w-full min-w-0 p-6 text-sm text-red-200">
        {error ||
          "Request not found"}
      </div>
    )
  }

  /*
   * =========================================================
   * STATUS
   * =========================================================
   */
  const status =
    String(
      request.status || "",
    ).toLowerCase()

  const isPendingBureauReview =
    status ===
      "pending_bureau_review" ||
    status === "submitted" ||
    status ===
      "pending_review" ||
    status ===
      "pending_admin_review"

  const isQuoteSent =
    status === "quote_sent" ||
    status ===
      "revised_quote_sent" ||
    status ===
      "client_decision_pending" ||
    status ===
      "awaiting_client_acceptance"

  const isAccepted =
    status === "accepted"

  const isDeclined =
    status === "declined"

  const isNegotiation =
    status ===
      "quote_review_requested" ||
    status ===
      "negotiation_requested"

  const canDecide =
    isQuoteSent &&
    !isAccepted &&
    !isDeclined

  /*
   * =========================================================
   * CYBERSECURITY TRAINING DETECTION
   * =========================================================
   */
  const normalizedServiceType =
    String(
      request.service_type || "",
    )
      .trim()
      .toLowerCase()

const isCybersecurityTraining =
  normalizedServiceType === "custom_training" ||
  normalizedServiceType === "cybersecurity_training" ||
  normalizedServiceType === "custom training" ||
  normalizedServiceType === "cybersecurity training" ||
  normalizedServiceType === "digital_safety"
      

  const clientCurrency =
    request.approved_quote_currency ||
    request.preferred_currency ||
    "NGN"

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */
  return (
    <main className="w-full min-w-0 max-w-full overflow-x-hidden p-4 text-white sm:p-6">
      <MarkResourceNotificationsRead
        resourceType="request"
        resourceId={request.id}
      />

      {/* ===================================================
          HEADER
      =================================================== */}
      <header className="w-full min-w-0 space-y-3 border-b border-[#143b28] pb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-[#20dc73]">
          Client Request
        </p>

        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
          <h1
            className={`min-w-0 max-w-full text-2xl font-bold sm:text-3xl ${wrapText}`}
          >
            {request.title ||
              request.service_type ||
              "Request"}
          </h1>

          {request.case_number && (
            <span className="shrink-0 rounded border border-[#143b28] bg-black/30 px-3 py-1 text-xs text-white/50">
              {request.case_number}
            </span>
          )}
        </div>

        <p className="text-sm text-white/45">
          Review the information submitted with your request.
        </p>
      </header>

      {(normalizedServiceType === "custom_service" || normalizedServiceType === "custom") &&
        status === "more_information_required" && (
          <CustomRequestAdditionalInformation
            requestId={request.id}
            explanation={request.client_facing_status_explanation}
          />
        )}

      {/* ===================================================
          SUCCESS
      =================================================== */}
      {actionSuccess && (
        <div className="mt-6 w-full min-w-0 rounded-lg border border-[#20dc73]/30 bg-[#20dc73]/5 p-4 text-sm text-[#20dc73]">
          <p className={wrapText}>
            {actionSuccess}
          </p>
        </div>
      )}

      {/* ===================================================
          ERROR
      =================================================== */}
      {actionError && (
        <div className="mt-6 w-full min-w-0 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
          <p className={wrapText}>
            {actionError}
          </p>
        </div>
      )}

      {/* ===================================================
          REQUEST SUMMARY
      =================================================== */}
      <section className="mt-6 w-full min-w-0 max-w-full rounded-lg border border-[#143b28] bg-[#06110f] p-4 sm:p-6">

        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
            Request
          </p>

          <h2 className="mt-1 text-xl font-semibold">
            Request Summary
          </h2>

          <div className="mt-4 h-px bg-[#143b28]" />
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">

          {/* REQUEST TITLE */}
          <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Request Title
            </p>

            <p
              className={`mt-2 text-sm font-semibold text-white ${wrapText}`}
            >
              {request.title ||
                "Not provided"}
            </p>
          </div>

          {/* CASE NUMBER */}
          <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Case Number
            </p>

            <p
              className={`mt-2 text-sm font-semibold text-white ${wrapText}`}
            >
              {request.case_number ||
                "Not assigned"}
            </p>
          </div>

          {/* SERVICE */}
          <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Service
            </p>

            <p
              className={`mt-2 text-sm font-semibold text-white ${wrapText}`}
            >
              {request.service_type ||
                "Not specified"}
            </p>
          </div>

          {/* STATUS */}
          <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Status
            </p>

            <p className="mt-2 text-sm font-semibold capitalize text-white">
              {getStatusLabel(status)}
            </p>
          </div>

          {/* =================================================
              REQUEST DESCRIPTION
          ================================================= */}
          {(request.description ||
            request.investigation_objective ||
            request.training_goal ||
            request.training_topics ||
            request.training_custom_request ||
            request.training_additional_requirements) && (
            <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4 lg:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Request Description
              </p>

              <div
                className={`mt-3 text-sm leading-7 text-white/70 ${wrapText}`}
              >
                {isCybersecurityTraining ? (
                  <div className="space-y-2">
                    {request.training_goal && (
                      <p>
                        <span className="font-semibold text-white/85">
                          Training goal:
                        </span>{" "}
                        {request.training_goal}
                      </p>
                    )}

                    {request.training_topics && (
                      <p>
                        <span className="font-semibold text-white/85">
                          Training topics:
                        </span>{" "}
                        {request.training_topics}
                      </p>
                    )}

                    {request.training_objectives &&
                      request.training_objectives.length >
                        0 && (
                        <p>
                          <span className="font-semibold text-white/85">
                            Learning objectives:
                          </span>{" "}
                          {request.training_objectives.join(
                            ", ",
                          )}
                        </p>
                      )}

                    {request.training_custom_objective && (
                      <p>
                        <span className="font-semibold text-white/85">
                          Learning objective:
                        </span>{" "}
                        {
                          request.training_custom_objective
                        }
                      </p>
                    )}

                    {request.training_custom_topic && (
                      <p>
                        <span className="font-semibold text-white/85">
                          Custom topic:
                        </span>{" "}
                        {
                          request.training_custom_topic
                        }
                      </p>
                    )}

                    {request.training_additional_requirements && (
                      <p>
                        <span className="font-semibold text-white/85">
                          Additional requirements:
                        </span>{" "}
                        {
                          request.training_additional_requirements
                        }
                      </p>
                    )}
                  </div>
                ) : (
                  request.description ||
                  request.investigation_objective ||
                  "No description provided."
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===================================================
          PENDING BUREAU REVIEW
      =================================================== */}
      {isPendingBureauReview && (
        <section className="mt-6 w-full min-w-0 rounded-lg border border-[#143b28] bg-[#06110f] p-5 sm:p-6">
          <div className="flex min-w-0 items-start gap-4">

            <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]" />

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300">
                Pending Bureau Review
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Your request is under review
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/55">
                Your request has been received and is currently being reviewed by the ShadowNode Bureau.
              </p>
            </div>

          </div>
        </section>
      )}

      {/* ===================================================
          CYBERSECURITY TRAINING
          ---------------------------------------------------
          IMPORTANT:
          Do NOT repeat:
          - Objectives
          - Topics
          - Audience
          - Assessment
          - Labs
          - Expected Outcomes
          - Additional Requirements
          - Additional Notes
          
          Those are already represented in Request Summary.
      =================================================== */}
      {isCybersecurityTraining && (
        <>
          {/* =================================================
              TRAINING ORGANIZATION
          ================================================= */}
          <section className="mt-6 w-full min-w-0 max-w-full rounded-lg border border-[#143b28] bg-[#06110f] p-4 sm:p-6">

            <div className="mb-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
                Cybersecurity Training
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Training Organization
              </h2>

              <div className="mt-4 h-px bg-[#143b28]" />
            </div>

            <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">

              {/* CLIENT TYPE */}
              {request.training_client_type && (
                <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Client Type
                  </p>

                  <p
                    className={`mt-2 text-sm font-semibold text-white ${wrapText}`}
                  >
                    {request.training_client_type}
                  </p>
                </div>
              )}

              {/* PARTICIPANT COUNT */}
              {!isEmptyValue(
                request.training_participant_count,
              ) && (
                <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Participant Count
                  </p>

                  <p className="mt-2 text-sm font-semibold text-white">
                    {String(
                      request.training_participant_count,
                    )}
                  </p>
                </div>
              )}

              {/* SKILL LEVEL */}
              {request.training_skill_level && (
                <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Participant Skill Level
                  </p>

                  <p
                    className={`mt-2 text-sm font-semibold text-white ${wrapText}`}
                  >
                    {request.training_skill_level}
                  </p>
                </div>
              )}

              {/* ORGANIZATION */}
              {request.training_organization_name && (
                <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4 lg:col-span-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Organization
                  </p>

                  <p
                    className={`mt-2 text-sm font-semibold text-white ${wrapText}`}
                  >
                    {request.training_organization_name}
                  </p>
                </div>
              )}

              {/* INDUSTRY */}
              {request.training_industry && (
                <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Industry
                  </p>

                  <p
                    className={`mt-2 text-sm font-semibold text-white ${wrapText}`}
                  >
                    {request.training_industry}
                  </p>
                </div>
              )}

            </div>
          </section>

          {/* =================================================
              TRAINING TIMELINE
          ================================================= */}
          <section className="mt-6 w-full min-w-0 max-w-full rounded-lg border border-[#143b28] bg-[#06110f] p-4 sm:p-6">

            <div className="mb-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
                Cybersecurity Training
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Training Timeline
              </h2>

              <div className="mt-4 h-px bg-[#143b28]" />
            </div>

            <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">

              {/* START DATE */}
              {request.training_preferred_start_date && (
                <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Preferred Start Date
                  </p>

                  <p className="mt-2 text-sm font-semibold text-white">
                    {formatDate(
                      request.training_preferred_start_date,
                    )}
                  </p>
                </div>
              )}

              {/* COMPLETION DATE */}
              {request.training_preferred_completion_date && (
                <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Preferred Completion Date
                  </p>

                  <p className="mt-2 text-sm font-semibold text-white">
                    {formatDate(
                      request.training_preferred_completion_date,
                    )}
                  </p>
                </div>
              )}

              {/* FLEXIBILITY */}
              {!isEmptyValue(
                request.training_timeline_flexible,
              ) && (
                <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Timeline Flexible
                  </p>

                  <p className="mt-2 text-sm font-semibold text-white">
                    {request.training_timeline_flexible
                      ? "Yes"
                      : "No"}
                  </p>
                </div>
              )}

            </div>
          </section>
        </>
      )}

      {/* ===================================================
          OSINT INVESTIGATION
      =================================================== */}
      {!isCybersecurityTraining && (
        <section className="mt-6 w-full min-w-0 max-w-full rounded-lg border border-[#143b28] bg-[#06110f] p-4 sm:p-6">

          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              OSINT Investigation
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Investigation Details
            </h2>

            <div className="mt-4 h-px bg-[#143b28]" />
          </div>

          <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">

            {/* INVESTIGATION OBJECTIVE */}
            {request.investigation_objective && (
              <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4 lg:col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                  Investigation Objective
                </p>

                <p
                  className={`mt-2 text-sm leading-7 text-white/70 ${wrapText}`}
                >
                  {request.investigation_objective}
                </p>
              </div>
            )}

            {/* INVESTIGATION DEPTH */}
            {request.investigation_depth && (
              <div className="rounded border border-[#143b28] bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                  Investigation Depth
                </p>

                <p className="mt-2 text-sm font-semibold text-white">
                  {request.investigation_depth}
                </p>
              </div>
            )}

            {/* PRIORITY */}
            {(request.priority ||
              request.urgency) && (
              <div className="rounded border border-[#143b28] bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                  Priority
                </p>

                <p className="mt-2 text-sm font-semibold text-white">
                  {String(
                    request.priority ||
                      request.urgency,
                  )}
                </p>
              </div>
            )}

            {/* COMPLETION DATE */}
            {request.osint_completion_date && (
              <div className="rounded border border-[#143b28] bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                  Requested Completion Date
                </p>

                <p className="mt-2 text-sm font-semibold text-white">
                  {formatDate(
                    String(
                      request.osint_completion_date,
                    ),
                  )}
                </p>
              </div>
            )}

          </div>

          {/* =================================================
              SUBJECT / TARGET
          ================================================= */}
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Subject / Target
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">

              {request.subject_full_name && (
                <div className="rounded border border-[#143b28] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Full Name
                  </p>

                  <p
                    className={`mt-2 text-sm font-semibold ${wrapText}`}
                  >
                    {request.subject_full_name}
                  </p>
                </div>
              )}

              {request.subject_known_usernames && (
                <div className="rounded border border-[#143b28] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Known Usernames
                  </p>

                  <p
                    className={`mt-2 text-sm text-white/70 ${wrapText}`}
                  >
                    {request.subject_known_usernames}
                  </p>
                </div>
              )}

              {request.subject_emails && (
                <div className="rounded border border-[#143b28] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Email Addresses
                  </p>

                  <p
                    className={`mt-2 text-sm text-white/70 ${wrapText}`}
                  >
                    {request.subject_emails}
                  </p>
                </div>
              )}

              {request.subject_phone_numbers && (
                <div className="rounded border border-[#143b28] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Phone Numbers
                  </p>

                  <p
                    className={`mt-2 text-sm text-white/70 ${wrapText}`}
                  >
                    {request.subject_phone_numbers}
                  </p>
                </div>
              )}

              {request.subject_location && (
                <div className="rounded border border-[#143b28] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Location
                  </p>

                  <p
                    className={`mt-2 text-sm text-white/70 ${wrapText}`}
                  >
                    {request.subject_location}
                  </p>
                </div>
              )}

              {request.subject_organization && (
                <div className="rounded border border-[#143b28] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Organization
                  </p>

                  <p
                    className={`mt-2 text-sm text-white/70 ${wrapText}`}
                  >
                    {request.subject_organization}
                  </p>
                </div>
              )}

              {request.subject_websites && (
                <div className="rounded border border-[#143b28] bg-black/30 p-4 lg:col-span-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Websites
                  </p>

                  <p
                    className={`mt-2 text-sm text-white/70 ${wrapText}`}
                  >
                    {request.subject_websites}
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* =================================================
              COMPANY
          ================================================= */}
          {(request.subject_company_name ||
            request.subject_company_website ||
            request.subject_company_country ||
            request.subject_company_industry) && (
            <div className="mt-6">

              <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
                Company Information
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">

                {request.subject_company_name && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Company Name
                    </p>

                    <p
                      className={`mt-2 text-sm font-semibold ${wrapText}`}
                    >
                      {request.subject_company_name}
                    </p>
                  </div>
                )}

                {request.subject_company_website && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Company Website
                    </p>

                    <p
                      className={`mt-2 text-sm text-white/70 ${wrapText}`}
                    >
                      {request.subject_company_website}
                    </p>
                  </div>
                )}

                {request.subject_company_country && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Company Country
                    </p>

                    <p className="mt-2 text-sm text-white/70">
                      {request.subject_company_country}
                    </p>
                  </div>
                )}

                {request.subject_company_industry && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Industry
                    </p>

                    <p
                      className={`mt-2 text-sm text-white/70 ${wrapText}`}
                    >
                      {request.subject_company_industry}
                    </p>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* =================================================
              DIGITAL IDENTIFIERS
          ================================================= */}
          {(request.subject_domain ||
            request.subject_url ||
            request.subject_ip_address ||
            request.subject_platform) && (
            <div className="mt-6">

              <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
                Digital Identifiers
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">

                {request.subject_domain && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Domain
                    </p>

                    <p
                      className={`mt-2 text-sm text-white/70 ${wrapText}`}
                    >
                      {request.subject_domain}
                    </p>
                  </div>
                )}

                {request.subject_url && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      URL
                    </p>

                    <p
                      className={`mt-2 text-sm text-white/70 ${wrapText}`}
                    >
                      {request.subject_url}
                    </p>
                  </div>
                )}

                {request.subject_ip_address && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      IP Address
                    </p>

                    <p
                      className={`mt-2 text-sm text-white/70 ${wrapText}`}
                    >
                      {request.subject_ip_address}
                    </p>
                  </div>
                )}

                {request.subject_platform && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Platform
                    </p>

                    <p
                      className={`mt-2 text-sm text-white/70 ${wrapText}`}
                    >
                      {request.subject_platform}
                    </p>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* =================================================
              ADDITIONAL IDENTIFIERS
          ================================================= */}
          {(request.subject_additional_usernames ||
            request.subject_gaming_ids ||
            request.subject_cryptocurrency_wallets ||
            request.subject_domain_names ||
            request.subject_ip_addresses ||
            request.subject_vehicle_registration) && (
            <div className="mt-6">

              <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
                Additional Identifiers
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">

                {request.subject_additional_usernames && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Additional Usernames
                    </p>

                    <p
                      className={`mt-2 text-sm text-white/70 ${wrapText}`}
                    >
                      {request.subject_additional_usernames}
                    </p>
                  </div>
                )}

                {request.subject_gaming_ids && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Gaming IDs
                    </p>

                    <p
                      className={`mt-2 text-sm text-white/70 ${wrapText}`}
                    >
                      {request.subject_gaming_ids}
                    </p>
                  </div>
                )}

                {request.subject_cryptocurrency_wallets && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4 lg:col-span-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Cryptocurrency Wallets
                    </p>

                    <p
                      className={`mt-2 text-sm text-white/70 ${wrapText}`}
                    >
                      {
                        request.subject_cryptocurrency_wallets
                      }
                    </p>
                  </div>
                )}

                {request.subject_domain_names && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Domain Names
                    </p>

                    <p
                      className={`mt-2 text-sm text-white/70 ${wrapText}`}
                    >
                      {request.subject_domain_names}
                    </p>
                  </div>
                )}

                {request.subject_ip_addresses && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      IP Addresses
                    </p>

                    <p
                      className={`mt-2 text-sm text-white/70 ${wrapText}`}
                    >
                      {request.subject_ip_addresses}
                    </p>
                  </div>
                )}

                {request.subject_vehicle_registration && (
                  <div className="rounded border border-[#143b28] bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Vehicle Registration
                    </p>

                    <p
                      className={`mt-2 text-sm text-white/70 ${wrapText}`}
                    >
                      {request.subject_vehicle_registration}
                    </p>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* =================================================
              EXISTING INTELLIGENCE
          ================================================= */}
          {request.existing_information && (
            <div className="mt-6">

              <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
                Existing Intelligence
              </p>

              <div className="mt-4 rounded border border-[#143b28] bg-black/30 p-4 sm:p-5">

                <p
                  className={`text-sm leading-7 text-white/70 ${wrapText}`}
                >
                  {request.existing_information}
                </p>

              </div>
            </div>
          )}

          {/* =================================================
              SUPPORTING INTELLIGENCE & EVIDENCE
          ================================================= */}
          {(
            (Array.isArray(
              request.supporting_links,
            ) &&
              request.supporting_links.length >
                0) ||
            (Array.isArray(
              request.evidence_files,
            ) &&
              request.evidence_files.length >
                0)
          ) && (
            <div className="mt-6">

              <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
                Supporting Intelligence & Evidence
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4">

                {/* SUPPORTING LINKS */}
                {Array.isArray(
                  request.supporting_links,
                ) &&
                  request.supporting_links.length >
                    0 && (
                    <div className="rounded border border-[#143b28] bg-black/30 p-4 sm:p-5">

                      <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                        Supporting Links
                      </p>

                      <div className="mt-4 space-y-2">

                        {request.supporting_links.map(
                          (link, index) => {
                            const href =
                              typeof link ===
                              "string"
                                ? link
                                : typeof link ===
                                      "object" &&
                                    link !== null &&
                                    "url" in
                                      link
                                  ? String(
                                      (
                                        link as {
                                          url?: unknown
                                        }
                                      ).url ||
                                        "",
                                    )
                                  : ""

                            if (!href) {
                              return null
                            }

                            return (
                              <a
                                key={`${href}-${index}`}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded border border-[#143b28] bg-black/40 px-4 py-3 text-sm text-[#20dc73] transition hover:border-[#20dc73]/50 hover:bg-[#20dc73]/5"
                              >
                                <span className="break-all">
                                  {href}
                                </span>
                              </a>
                            )
                          },
                        )}

                      </div>
                    </div>
                  )}

                {/* EVIDENCE FILES */}
                {Array.isArray(
                  request.evidence_files,
                ) &&
                  request.evidence_files.length >
                    0 && (
                    <div className="rounded border border-[#143b28] bg-black/30 p-4 sm:p-5">

                      <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                        Evidence Files
                      </p>

                      <div className="mt-4 space-y-2">

                        {request.evidence_files.map(
                          (file, index) => {
                            if (
                              typeof file ===
                              "string"
                            ) { 
                              return (
                                <div
                                  key={`${file}-${index}`}
                                  className="rounded border border-[#143b28] bg-black/40 px-4 py-3 text-sm text-white/70"
                                >
                                  <span className="break-all">
                                    {file}
                                  </span>
                                </div>
                              )
                            }

                            if (
                              typeof file !==
                                "object" ||
                              file === null
                            ) {
                              return null
                            }

                          const evidence = file as {
  id?: string
  name?: string
  size?: number
  type?: string
  url?: string
  dataUrl?: string
}

                            const name =
                              String(
                                evidence.name ||
                                  `Evidence File ${
                                    index + 1
                                  }`,
                              )

                            const type =
                              evidence.type
                                ? String(
                                    evidence.type,
                                  )
                                : ""

                            const size =
                              Number(
                                evidence.size,
                              )

                      const fileUrl =
  evidence.url ||
  evidence.dataUrl ||
  ""

                            return (
                              <div
                                key={String(
                                  evidence.id ||
                                    `${name}-${index}`,
                                )}
                                className="rounded border border-[#143b28] bg-black/40 p-4"
                              >
                                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                                  <div className="min-w-0">

                                    <p
                                      className={`text-sm font-semibold text-white ${wrapText}`}
                                    >
                                      {name}
                                    </p>

                                    {type && (
                                      <p className="mt-1 text-xs text-white/35">
                                        {type}
                                      </p>
                                    )}

                                    {Number.isFinite(
                                      size,
                                    ) &&
                                      size > 0 && (
                                        <p className="mt-1 text-xs text-white/35">
                                          {(
                                            size /
                                            1024 /
                                            1024
                                          ).toFixed(
                                            2,
                                          )}{" "}
                                          MB
                                        </p>
                                      )}

                                  </div>

                                  {fileUrl && (
                                    <a
                                      href={String(
                                        fileUrl,
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 rounded border border-[#20dc73]/30 px-3 py-2 text-xs font-semibold text-[#20dc73] hover:border-[#20dc73] hover:bg-[#20dc73]/5"
                                    >
                                      View Evidence
                                    </a>
                                  )}
                                   console.log("REQUEST DATA:", request)
console.log("EVIDENCE:", request.evidence_files)
                                </div>
                              </div>
                            )
                          },
                        )}

                      </div>
                    </div>
                  )}

              </div>
            </div>
          )}

        </section>
      )}
    




      {/* ===================================================
          QUOTE SECTION
      =================================================== */}
      {canDecide && (
        <section className="mt-6 w-full min-w-0 rounded-lg border border-[#143b28] bg-[#06110f] p-5 sm:p-6">

          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Bureau Quote
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Review Your Quote
            </h2>

            <div className="mt-4 h-px bg-[#143b28]" />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">

            {/* QUOTE AMOUNT */}
            <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Quote Amount
              </p>

              <p className="mt-2 text-2xl font-bold text-[#20dc73]">
                {formatMoney(
                  request.approved_quote_amount,
                  clientCurrency,
                )}
              </p>
            </div>

            {/* CURRENCY */}
            <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Currency
              </p>

              <p className="mt-2 text-lg font-semibold text-white">
                {clientCurrency}
              </p>
            </div>

            {/* QUOTE NOTES */}
            {request.approved_quote_notes && (
              <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-5 lg:col-span-2">

                <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                  Quote Notes
                </p>

                <p
                  className={`mt-2 text-sm leading-7 text-white/65 ${wrapText}`}
                >
                  {request.approved_quote_notes}
                </p>

              </div>
            )}

          </div>

          {/* ACTION BUTTONS */}
          {!action && (
            <div className="mt-6 flex min-w-0 flex-wrap gap-3">

              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  setAction("accept")
                }
                className="rounded bg-[#20dc73] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#19c965] disabled:opacity-40"
              >
                Accept Quote
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  setAction("negotiate")
                }
                className="rounded border border-[#20dc73]/40 px-5 py-2.5 text-sm font-semibold text-[#20dc73] transition hover:border-[#20dc73] hover:bg-[#20dc73]/5 disabled:opacity-40"
              >
                Negotiate
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  setAction("decline")
                }
                className="rounded border border-red-500/30 px-5 py-2.5 text-sm font-semibold text-red-300 transition hover:border-red-400 hover:bg-red-500/5 disabled:opacity-40"
              >
                Decline Quote
              </button>

            </div>
          )}

          {/* =================================================
              ACCEPT CONFIRMATION
          ================================================= */}
          {action === "accept" && (
            <div className="mt-5 min-w-0 rounded border border-[#20dc73]/20 bg-[#20dc73]/5 p-5">

              <p className="text-sm font-semibold text-white">
                Accept Quote
              </p>

              <p className="mt-2 text-sm leading-6 text-white/55">
                Are you sure you want to accept this quote?
                Your acceptance will be recorded and the
                request will proceed to the next stage.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">

                <button
                  type="button"
                  disabled={submitting}
                  onClick={
                    submitQuoteAction
                  }
                  className="rounded bg-[#20dc73] px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
                >
                  {submitting
                    ? "Processing..."
                    : "Confirm Acceptance"}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    setAction(null)
                  }
                  className="rounded border border-[#143b28] px-5 py-2.5 text-sm text-white/60"
                >
                  Cancel
                </button>

              </div>
            </div>
          )}

          {/* =================================================
              DECLINE
          ================================================= */}
          {action === "decline" && (
            <div className="mt-5 min-w-0 rounded border border-red-500/20 bg-red-500/5 p-5">

              <p className="text-sm font-semibold text-white">
                Reject Quote
              </p>

              <p className="mt-2 text-sm leading-6 text-white/55">
                Please provide a reason. This reason will be
                recorded in the request history.
              </p>

              <textarea
                value={rejectReason}
                onChange={(event) =>
                  setRejectReason(
                    event.target.value,
                  )
                }
                rows={5}
                placeholder="Explain why you are rejecting this quote..."
                disabled={submitting}
                className="mt-4 block w-full min-w-0 max-w-full resize-y rounded border border-[#143b28] bg-black/40 p-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-red-400 disabled:opacity-50"
              />

              <div className="mt-4 flex flex-wrap gap-3">

                <button
                  type="button"
                  disabled={
                    submitting ||
                    !rejectReason.trim()
                  }
                  onClick={
                    submitQuoteAction
                  }
                  className="rounded bg-red-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {submitting
                    ? "Processing..."
                    : "Reject Quote"}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    setAction(null)
                  }
                  className="rounded border border-[#143b28] px-5 py-2.5 text-sm text-white/60"
                >
                  Cancel
                </button>

              </div>
            </div>
          )}

          {/* =================================================
              NEGOTIATION
          ================================================= */}
          {action === "negotiate" && (
            <div className="mt-5 min-w-0 rounded border border-[#20dc73]/20 bg-[#20dc73]/[0.03] p-5">

              <p className="text-sm font-semibold text-white">
                Request Quote Negotiation
              </p>

              <p className="mt-2 text-sm leading-6 text-white/55">
                Submit your proposed amount and explain why
                you would like the quote reviewed.
              </p>

              <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">

                {/* CURRENT QUOTE */}
                <div className="min-w-0">

                  <label className="text-xs uppercase tracking-[0.15em] text-white/35">
                    Current Quote
                  </label>

                  <div className="mt-2 min-w-0 rounded border border-[#143b28] bg-black/30 px-3 py-2.5 text-sm text-white/70">
                    {formatMoney(
                      request.approved_quote_amount,
                      clientCurrency,
                    )}
                  </div>

                </div>

                {/* CURRENCY */}
                <div className="min-w-0">

                  <label className="text-xs uppercase tracking-[0.15em] text-white/35">
                    Currency
                  </label>

                  <div className="mt-2 rounded border border-[#143b28] bg-black/30 px-3 py-2.5 text-sm text-white/70">
                    {clientCurrency}
                  </div>

                </div>

                {/* AMOUNT */}
                <div className="min-w-0 lg:col-span-2">

                  <label className="text-xs uppercase tracking-[0.15em] text-white/35">
                    Proposed Amount
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={negotiationAmount}
                    onChange={(event) =>
                      setNegotiationAmount(
                        event.target.value,
                      )
                    }
                    disabled={submitting}
                    placeholder="Enter your proposed amount"
                    className="mt-2 block w-full min-w-0 max-w-full rounded border border-[#143b28] bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73] disabled:opacity-50"
                  />

                </div>

                {/* REASON */}
                <div className="min-w-0 lg:col-span-2">

                  <label className="text-xs uppercase tracking-[0.15em] text-white/35">
                    Reason for Negotiation
                  </label>

                  <textarea
                    value={negotiationReason}
                    onChange={(event) =>
                      setNegotiationReason(
                        event.target.value,
                      )
                    }
                    rows={4}
                    disabled={submitting}
                    placeholder="Explain why you are requesting a different quote..."
                    className="mt-2 block w-full min-w-0 max-w-full resize-y rounded border border-[#143b28] p-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73] disabled:opacity-50"
                  />

                </div>

                {/* NOTES */}
                <div className="min-w-0 lg:col-span-2">

                  <label className="text-xs uppercase tracking-[0.15em] text-white/35">
                    Additional Notes
                  </label>

                  <textarea
                    value={negotiationNotes}
                    onChange={(event) =>
                      setNegotiationNotes(
                        event.target.value,
                      )
                    }
                    rows={3}
                    disabled={submitting}
                    placeholder="Optional additional information..."
                    className="mt-2 block w-full min-w-0 max-w-full resize-y rounded border border-[#143b28] bg-black/40 p-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73] disabled:opacity-50"
                  />

                </div>

              </div>

              <div className="mt-5 flex flex-wrap gap-3">

                <button
                  type="button"
                  disabled={
                    submitting ||
                    !negotiationAmount.trim() ||
                    !negotiationReason.trim()
                  }
                  onClick={
                    submitQuoteAction
                  }
                  className="rounded bg-[#20dc73] px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Negotiation"}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    setAction(null)
                  }
                  className="rounded border border-[#143b28] px-5 py-2.5 text-sm text-white/60"
                >
                  Cancel
                </button>

              </div>
            </div>
          )}

        </section>
      )}
{/* ===================================================
    ACCEPTED / AWAITING PAYMENT
=================================================== */}

{(isAccepted ||
  status === "awaiting_payment") && (
  <section className="mt-6 w-full min-w-0 overflow-hidden rounded-2xl border border-[#20dc73]/30 bg-gradient-to-br from-[#071711] via-[#06110f] to-black shadow-xl">

    {/* HEADER */}

    <div className="border-b border-[#20dc73]/15 bg-[#20dc73]/5 p-5 sm:p-6">

      <div className="flex items-start gap-4">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]">
          ✓
        </div>

        <div className="min-w-0">

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#20dc73]">
            Quote Accepted
          </p>

          <h2 className="mt-2 break-words text-xl font-semibold text-white sm:text-2xl">
            Your quote has been accepted
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/55">
            ShadowNode has recorded your acceptance.
            Payment is the next step before the
            investigation can begin.
          </p>

        </div>

      </div>

    </div>

    {/* PAYMENT CONTENT */}

    <div className="p-5 sm:p-6">

      {/* PAYMENT STATUS */}

      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">

        <div className="flex items-start gap-4">

          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-300">
            ₦
          </div>

          <div className="min-w-0">

            <p className="text-sm font-semibold text-yellow-200">
              Payment required
            </p>

            <p className="mt-1 text-sm leading-6 text-white/45">
              Your request has been moved into the
              payment stage. The investigation will not
              begin until payment has been confirmed.
            </p>

          </div>

        </div>

      </div>

      {/* QUOTE SUMMARY */}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">

        <div className="rounded-xl border border-[#143b28] bg-black/30 p-5">

          <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
            Accepted Quote
          </p>

          <p className="mt-2 break-words text-2xl font-bold text-[#20dc73]">
            {formatMoney(
              request.approved_quote_amount,
              clientCurrency,
            )}
          </p>

        </div>

        <div className="rounded-xl border border-[#143b28] bg-black/30 p-5">

          <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
            Currency
          </p>

          <p className="mt-2 text-lg font-semibold text-white">
            {clientCurrency}
          </p>

        </div>

      </div>

      {/* PAYMENT ACTION */}

      <div className="mt-6 rounded-xl border border-[#20dc73]/20 bg-[#20dc73]/[0.03] p-5">

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="min-w-0">

            <p className="text-sm font-semibold text-white">
              Ready to continue?
            </p>

            <p className="mt-1 text-xs leading-6 text-white/35">
              Open the secure payment page to complete
              your payment through the existing Paystack
              workflow.
            </p>

          </div>

          {request.id && (
            <Link
              href={`/dashboard/client/payments/${request.id}`}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#20dc73] px-6 py-3 text-sm font-bold text-black shadow-lg shadow-[#20dc73]/10 transition hover:bg-[#32ef82]"
            >
              Make Payment
            </Link>
          )}

        </div>

      </div>

    </div>

  </section>
)}




      {isNegotiation && (
  <section className="w-full min-w-0 overflow-hidden rounded-md border border-[#20dc73]/20 bg-[#20dc73]/[0.03] p-5">

          <div className="mb-5 min-w-0 border-b border-white/10 pb-5">

      <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">
        Quote Negotiation
      </p>

      <h2 className="mt-2 text-xl font-semibold text-white">
        Your Negotiation Request
      </h2>

      <p className="mt-2 text-sm leading-7 text-white/55">
        Your requested quote revision has been recorded
        and submitted to the Administrator for review.
      </p>

    </div>

    <CommercialHistoryPanel history={request.commercial_history} />

    {request.client_negotiation ? (
      <div className="mt-5 space-y-5">

        {/* ================================================
            VERSION
        ================================================ */}

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
              Quote Version
            </p>

            <p className="mt-1 text-lg font-bold text-white">
              Version{" "}
              {request.client_negotiation.quote_version_number ??
                4}
            </p>
          </div>

          <span className="rounded border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-300">
            {getNegotiationStatusLabel(
              request.client_negotiation.status,
            )}
          </span>

        </div>

        {/* ================================================
            CLIENT PROPOSAL
        ================================================ */}

        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">

          <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-5">

            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Your Proposed Amount
            </p>

            <p className="mt-2 break-words text-2xl font-bold text-yellow-300">
              {formatMoney(
                request.client_negotiation.requested_budget,
                request.client_negotiation.currency ||
                  clientCurrency,
              )}
            </p>

          </div>

          <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-5">

            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Currency
            </p>

            <p className="mt-2 text-lg font-semibold text-white">
              {request.client_negotiation.currency ||
                clientCurrency}
            </p>

          </div>

          {/* ==============================================
              ROUND
          ============================================== */}

          <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-5">

            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Negotiation Round
            </p>

            <p className="mt-2 text-sm font-semibold text-white">
              Round{" "}
              {request.client_negotiation.round_number}
            </p>

          </div>

          {/* ==============================================
              VERSION ID
          ============================================== */}

          {request.client_negotiation.quote_version_id && (
            <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-5">

              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Quote Version ID
              </p>

              <p className="mt-2 break-all font-mono text-xs text-white/45">
                {request.client_negotiation.quote_version_id}
              </p>

            </div>
          )}

        </div>

        {/* ================================================
            REASON
        ================================================ */}

        {request.client_negotiation.reason && (
          <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-5">

            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Your Reason
            </p>

            <p
              className={`mt-2 text-sm leading-7 text-white/70 ${wrapText}`}
            >
              {request.client_negotiation.reason}
            </p>

          </div>
        )}

        {/* ================================================
            NOTES
        ================================================ */}

        {request.client_negotiation.notes && (
          <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-5">

            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Additional Notes
            </p>

            <p
              className={`mt-2 text-sm leading-7 text-white/70 ${wrapText}`}
            >
              {request.client_negotiation.notes}
            </p>

          </div>
        )}

        {/* ================================================
            TIMESTAMP
        ================================================ */}

        {request.client_negotiation.created_at && (
          <div className="text-xs text-white/30">

            Submitted{" "}
            {formatDate(
              request.client_negotiation.created_at,
            )}

          </div>
        )}

      </div>
    ) : (
      <div className="mt-5 rounded border border-[#143b28] bg-black/30 p-5">

        <p className="text-sm text-white/50">
          Your negotiation request has been submitted
          successfully.
        </p>

      </div>
    )}

  </section>
)}

      {/* ===================================================
          DECLINED
      =================================================== */}
      {isDeclined && (
        <section className="mt-6 w-full min-w-0 rounded-lg border border-red-500/20 bg-red-500/5 p-5 sm:p-6">

          <p className="text-xs uppercase tracking-[0.2em] text-red-300">
            Quote Declined
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            You declined this quote
          </h2>

          {request.declined_reason && (
            <div className="mt-4 min-w-0 rounded border border-red-500/20 bg-black/20 p-4">

              <p className="text-xs uppercase tracking-[0.15em] text-white/35">
                Your Reason
              </p>

              <p
                className={`mt-2 text-sm leading-7 text-white/60 ${wrapText}`}
              >
                {request.declined_reason}
              </p>

            </div>
          )}

        </section>
      )}

      {/* ===================================================
          BACK
      =================================================== */}
      <div className="mt-6 flex min-w-0 flex-wrap gap-3">

        <Link
          href="/dashboard/client/requests"
          className="rounded border border-[#143b28] px-4 py-2 text-sm text-white/70 transition hover:border-[#20dc73] hover:text-white"
        >
          Back to requests
        </Link>

      </div>

    </main>
  )
}
