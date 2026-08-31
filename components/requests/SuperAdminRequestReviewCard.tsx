"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

type RequestData = {
  id: string
  case_number: string | null
  title: string | null
  service_type: string | null
  description: string | null
  investigation_objective: string | null
  status: string

  preferred_currency: string | null

  ai_price_estimate: number | null
  ai_complexity: string | null
  ai_confidence: number | null
  ai_reasoning: string | null
  ai_analysis:
    | string
    | Record<string, unknown>
    | null

  client_email: string | null

  approved_quote_amount: number | null
  approved_quote_currency: string | null
  approved_quote_notes: string | null
  approved_estimated_start: string | null
  approved_estimated_completion: string | null

  admin_quote_action: string | null
  admin_quote_notes: string | null
  admin_reviewed_by: string | null
  admin_reviewed_at: string | null

  ai_price_currency: string | null

  super_admin_quote_action: string | null
  super_admin_quote_notes: string | null
  super_admin_reviewed_by: string | null
  super_admin_reviewed_at: string | null
}

type QuoteVersion = {
  id: string
  request_id: string
  version_number: number
  created_by: string | null
  creator_role: string | null
  source: string
  price: number | null
  currency: string | null
  estimated_start?: string | null
  estimated_completion: string | null
  notes: string | null
  reasoning: string | null
  status: string | null
  created_at: string | null
}

type AuditEvent = {
  id: string
  actor_user_id: string | null
  action: string
  details: unknown
  created_at: string | null
}

type NegotiationHistory = {
  id: string
  request_id: string
  client_id: string | null
  assigned_reviewer_id: string | null

  round_number: number | null
  status: string | null

  original_ai_estimate: number | null
  original_quote_amount: number | null
  quote_currency: string | null

  requested_budget: number | null
  client_reason: string | null
  client_notes: string | null

  administrator_recommendation: string | null
  revised_quote_amount: number | null

  owner_approver_id: string | null
  owner_decision: string | null
  owner_decision_notes: string | null

  decided_at: string | null
  created_at: string | null
  updated_at: string | null
}

type DecisionMode =
  | "admin"
  | "negotiated"
  | "ai"
  | "adjust"
  | "reject"
  | null

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "CAD",
  "AUD",
  "JPY",
  "INR",
  "SGD",
  "CNY",
  "KES",
  "GHS",
]

function formatMoney(
  amount: number | null | undefined,
  currency = "USD",
) {
  if (
    amount === null ||
    amount === undefined ||
    !Number.isFinite(Number(amount))
  ) {
    return "Not available"
  }

  return `${currency} ${Number(amount).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`
}

function formatDate(
  date: string | null | undefined,
) {
  if (!date) {
    return "Not specified"
  }

  const raw = String(date).trim()

  if (!raw) {
    return "Not specified"
  }

  const dateOnlyMatch =
    raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (dateOnlyMatch) {
    const [, year, month, day] =
      dateOnlyMatch

    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    )

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(
        "en-GB",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        },
      )
    }
  }

  const parsed = new Date(raw)

  if (Number.isNaN(parsed.getTime())) {
    return "Not specified"
  }

  return parsed.toLocaleString()
}

function statusLabel(
  value: string | null | undefined,
) {
  if (!value) {
    return "Pending"
  }

  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    )
}

function confidencePercent(
  value: number | null,
) {
  if (value == null) {
    return null
  }

  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    return null
  }

  return numeric <= 1
    ? numeric * 100
    : numeric
}

function getAuditReason(
  details: unknown,
) {
  if (
    typeof details === "object" &&
    details !== null &&
    "reason" in details
  ) {
    return String(
      (
        details as {
          reason?: unknown
        }
      ).reason ??
        "No reason provided",
    )
  }

  return "No reason provided"
}

function normalizeQuoteSource(
  quote: QuoteVersion,
) {
  return (
    quote.source
      ?.trim()
      .toLowerCase() || ""
  )
}

function isAdministratorQuote(
  quote: QuoteVersion,
) {
  const source =
    normalizeQuoteSource(quote)

  const role =
    quote.creator_role
      ?.trim()
      .toLowerCase()

  return (
    source === "administrator" ||
    source === "administrator_proposal" ||
    source === "admin" ||
    role === "administrator"
  )
}

function isAIQuote(
  quote: QuoteVersion,
) {
  const source =
    normalizeQuoteSource(quote)

  const role =
    quote.creator_role
      ?.trim()
      .toLowerCase()

  return (
    source === "ai" ||
    source === "ai_estimate" ||
    source === "ai_recommendation" ||
    role === "ai"
  )
}

export default function SuperAdminRequestReviewCard({
  request,
  aiQuote,
  adminQuote,
  quoteHistory = [],
  auditHistory = [],
  negotiationHistory = [],
}: {
  request: RequestData
  aiQuote: QuoteVersion | null
  adminQuote: QuoteVersion | null
  quoteHistory?: QuoteVersion[]
  auditHistory?: AuditEvent[]
  negotiationHistory?: NegotiationHistory[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  /*
   * =========================================================
   * HISTORY VIEW
   * =========================================================
   */

  const isHistoryView =
    searchParams.get("history") ===
    "true"

  /*
   * =========================================================
   * STATUS
   * =========================================================
   */

  const normalizedStatus =
    String(
      request.status || "",
    )
      .trim()
      .toLowerCase()

  const superAdminCanAct =
    normalizedStatus ===
    "pending_super_admin_review"

  /*
   * =========================================================
   * LATEST ADMINISTRATOR QUOTE
   * =========================================================
   */

  const latestAdminQuote =
    [
      ...quoteHistory,
      ...(adminQuote
        ? [adminQuote]
        : []),
    ]
      .filter(
        isAdministratorQuote,
      )
      .sort(
        (a, b) =>
          Number(
            b.version_number || 0,
          ) -
          Number(
            a.version_number || 0,
          ),
      )[0] ?? null

  /*
   * =========================================================
   * LATEST AI QUOTE
   * =========================================================
   */

  const latestAIQuote =
    [
      ...quoteHistory,
      ...(aiQuote
        ? [aiQuote]
        : []),
    ]
      .filter(isAIQuote)
      .sort(
        (a, b) =>
          Number(
            b.version_number || 0,
          ) -
          Number(
            a.version_number || 0,
          ),
      )[0] ?? aiQuote

  /*
   * =========================================================
   * CURRENT NEGOTIATION
   * =========================================================
   *
   * IMPORTANT:
   *
   * Only an active negotiation is selected here.
   *
   * requested:
   *   waiting for Administrator
   *
   * reviewing:
   *   Administrator has responded and the negotiation
   *   is waiting for Super Administrator.
   *
   * For the Super Administrator active decision,
   * "reviewing" is the important state.
   */

  const currentNegotiation =
    [...negotiationHistory]
      .filter((negotiation) => {
        const status =
          negotiation.status
            ?.trim()
            .toLowerCase()

        return (
          status === "requested" ||
          status === "reviewing"
        )
      })
      .sort(
        (a, b) =>
          Number(
            b.round_number || 0,
          ) -
          Number(
            a.round_number || 0,
          ),
      )[0] ?? null

  /*
   * =========================================================
   * NEGOTIATION REVIEW DETECTION
   * =========================================================
   *
   * This MUST come AFTER currentNegotiation exists.
   */

  const isNegotiationReview =
    superAdminCanAct &&
    currentNegotiation !== null &&
    currentNegotiation.status
      ?.trim()
      .toLowerCase() === "reviewing"

  /*
   * =========================================================
   * LOCAL STATE
   * =========================================================
   */

  const [loading, setLoading] =
    useState(false)

  const [message, setMessage] =
    useState("")

  const [
    decisionMode,
    setDecisionMode,
  ] =
    useState<DecisionMode>(null)

  const [form, setForm] =
    useState({
      amount:
        isNegotiationReview
          ? String(
              currentNegotiation?.revised_quote_amount ??
                currentNegotiation?.requested_budget ??
                latestAdminQuote?.price ??
                request.approved_quote_amount ??
                "",
            )
          : String(
              latestAdminQuote?.price ??
                request.approved_quote_amount ??
                "",
            ),

      currency:
        isNegotiationReview
          ? (
              currentNegotiation?.quote_currency ||
              request.preferred_currency ||
              latestAdminQuote?.currency ||
              "NGN"
            )
          : (
              latestAdminQuote?.currency ||
              request.approved_quote_currency ||
              "USD"
            ),

      notes: "",

      reason: "",

      estimated_completion:
        isNegotiationReview
          ? (
              latestAdminQuote?.estimated_completion ||
              request.approved_estimated_completion ||
              ""
            )
          : (
              latestAdminQuote?.estimated_completion ||
              request.approved_estimated_completion ||
              ""
            ),
    })

  /*
   * =========================================================
   * SUPER ADMIN HISTORY
   * =========================================================
   */

  const superAdminHistory =
    auditHistory.filter(
      (event) => {
        const action =
          event.action
            ?.trim()
            .toLowerCase() || ""

        return [
          "super admin approved final quote",
          "super administrator approved final quote",
          "super admin adjusted quote",
          "super administrator adjusted quote",
          "super admin rejected request",
          "super administrator rejected request",
          "super_admin_approved_final_quote",
          "super_admin_rejected_quote",
          "super_admin_approved_revised_quote",
          "super_admin_rejected_negotiation",
          "super_admin_approved_revised_quote",
        ].includes(action)
      },
    )

  /*
   * =========================================================
   * SELECT ADMINISTRATOR QUOTE
   * =========================================================
   */

  function selectAdministratorQuote() {
    if (!superAdminCanAct) {
      return
    }

    const amount =
      latestAdminQuote?.price ??
      request.approved_quote_amount

    const currency =
      latestAdminQuote?.currency ||
      request.approved_quote_currency ||
      request.preferred_currency ||
      "USD"

    setDecisionMode("admin")

    setForm((current) => ({
      ...current,

      amount:
        amount != null
          ? String(amount)
          : current.amount,

      currency,

      reason:
        latestAdminQuote?.reasoning ||
        latestAdminQuote?.notes ||
        request.admin_quote_notes ||
        "",

      notes:
        latestAdminQuote?.notes ||
        "",

      estimated_completion:
        latestAdminQuote?.estimated_completion ||
        request.approved_estimated_completion ||
        current.estimated_completion,
    }))
  }

  /*
   * =========================================================
   * SELECT AI QUOTE
   * =========================================================
   */

  function selectAIQuote() {
    if (!superAdminCanAct) {
      return
    }

    const amount =
      request.ai_price_estimate ??
      latestAIQuote?.price

    const currency =
      latestAIQuote?.currency ||
      request.ai_price_currency ||
      "USD"

    setDecisionMode("ai")

    setForm((current) => ({
      ...current,

      amount:
        amount != null
          ? String(amount)
          : current.amount,

      currency,

      reason:
        request.ai_reasoning ||
        latestAIQuote?.reasoning ||
        "",

      notes:
        latestAIQuote?.notes ||
        "",

      estimated_completion:
        latestAIQuote?.estimated_completion ||
        current.estimated_completion,
    }))
  }

  /*
   * =========================================================
   * SELECT NEGOTIATED RECOMMENDATION
   * =========================================================
   *
   * This uses the Administrator's recommendation from the
   * current negotiation cycle.
   *
   * Currency ALWAYS remains the client's negotiation currency.
   */

  function selectNegotiatedRecommendation() {
    if (
      !superAdminCanAct ||
      !isNegotiationReview ||
      !currentNegotiation
    ) {
      return
    }

    const amount =
      currentNegotiation.revised_quote_amount ??
      currentNegotiation.requested_budget ??
      latestAdminQuote?.price ??
      request.approved_quote_amount

    const currency =
      currentNegotiation.quote_currency ||
      request.preferred_currency ||
      "NGN"

    setDecisionMode("negotiated")

    setForm((current) => ({
      ...current,

      amount:
        amount != null
          ? String(amount)
          : current.amount,

      currency,

      /*
       * Administrator recommendation should be
       * visible in the decision reason.
       */

      reason:
        currentNegotiation.administrator_recommendation ||
        latestAdminQuote?.reasoning ||
        latestAdminQuote?.notes ||
        request.admin_quote_notes ||
        "",

      notes:
        latestAdminQuote?.notes ||
        request.admin_quote_notes ||
        "",

      estimated_completion:
        latestAdminQuote?.estimated_completion ||
        request.approved_estimated_completion ||
        current.estimated_completion,
    }))
  }

  /*
   * =========================================================
   * ADJUSTMENT
   * =========================================================
   */

  function selectAdjustment() {
    if (!superAdminCanAct) {
      return
    }

    const amount =
      isNegotiationReview
        ? (
            currentNegotiation?.revised_quote_amount ??
            currentNegotiation?.requested_budget ??
            latestAdminQuote?.price ??
            request.approved_quote_amount
          )
        : (
            latestAdminQuote?.price ??
            request.approved_quote_amount
          )

    const currency =
      isNegotiationReview
        ? (
            currentNegotiation?.quote_currency ||
            request.preferred_currency ||
            "NGN"
          )
        : (
            latestAdminQuote?.currency ||
            request.approved_quote_currency ||
            request.preferred_currency ||
            "USD"
          )

    setDecisionMode("adjust")

    setForm((current) => ({
      ...current,

      amount:
        amount != null
          ? String(amount)
          : current.amount,

      currency,

      reason: "",

      notes: "",
    }))
  }

  /*
   * =========================================================
   * REJECT
   * =========================================================
   */

  function selectReject() {
    if (!superAdminCanAct) {
      return
    }

    setDecisionMode("reject")

    setForm((current) => ({
      ...current,
      reason: "",
      notes: "",
    }))
  }

  /*
   * =========================================================
   * SUBMIT
   * =========================================================
   */

  async function submit(
    action:
      | "accept"
      | "adjust"
      | "reject",
  ) {
    try {
      setLoading(true)
      setMessage("")

      /*
       * -------------------------------------------------------
       * HISTORY PROTECTION
       * -------------------------------------------------------
       */

      if (isHistoryView) {
        throw new Error(
          "Historical requests cannot be modified.",
        )
      }

      /*
       * -------------------------------------------------------
       * CURRENT WORKFLOW PROTECTION
       * -------------------------------------------------------
       */

      if (!superAdminCanAct) {
        throw new Error(
          "This request is not currently awaiting Super Administrator review.",
        )
      }

      /*
       * -------------------------------------------------------
       * DECISION PATH
       * -------------------------------------------------------
       */

      if (!decisionMode) {
        throw new Error(
          "Please select a decision path.",
        )
      }

      /*
       * -------------------------------------------------------
       * DECISION / MODE CONSISTENCY
       * -------------------------------------------------------
       */

      if (
        action === "reject" &&
        decisionMode !== "reject"
      ) {
        throw new Error(
          "Please select Reject Request before rejecting.",
        )
      }

      if (
        action === "adjust" &&
        decisionMode !== "adjust"
      ) {
        throw new Error(
          "Please select Adjust Quote before submitting an adjustment.",
        )
      }

      if (
        action === "accept" &&
        decisionMode !== "admin" &&
        decisionMode !== "ai" &&
        decisionMode !== "negotiated"
      ) {
        throw new Error(
          "Please select a valid approval path.",
        )
      }

      /*
       * -------------------------------------------------------
       * REASON
       * -------------------------------------------------------
       */

      const reason =
        form.reason.trim()

      if (!reason) {
        throw new Error(
          "Please provide a decision reason.",
        )
      }

      /*
       * -------------------------------------------------------
       * REJECT
       * -------------------------------------------------------
       */

      if (action === "reject") {
        const payload = {
          decision_action: "reject",

          decision_source:
            isNegotiationReview
              ? "client_negotiated"
              : "adjusted",

          justification: {
            reason,

            notes:
              form.notes.trim(),
          },

          metadata: {
            reviewed_from:
              "super_admin_dashboard",

            decision_mode:
              "reject",

            request_status:
              normalizedStatus,

            negotiation_id:
              isNegotiationReview
                ? currentNegotiation?.id ??
                  null
                : null,
          },
        }

        const response =
          await fetch(
            `/api/admin/requests/${request.id}/super-admin-review`,
            {
              method: "POST",

              credentials: "include",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body: JSON.stringify(
                payload,
              ),
            },
          )

        const data =
          await response.json().catch(
            () => ({}),
          )

        if (!response.ok) {
          throw new Error(
            data?.error ||
              data?.message ||
              "Super Administrator rejection failed.",
          )
        }

        router.push(
          "/dashboard/requests",
        )

        router.refresh()

        return
      }

      /*
       * -------------------------------------------------------
       * AMOUNT
       * -------------------------------------------------------
       */

      const amount =
        Number(form.amount)

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        throw new Error(
          "Please enter a valid quote amount.",
        )
      }

      /*
       * -------------------------------------------------------
       * CURRENCY
       * -------------------------------------------------------
       */

      const currency =
        String(
          form.currency || "",
        )
          .trim()
          .toUpperCase()

      if (
        !CURRENCIES.includes(
          currency,
        )
      ) {
        throw new Error(
          "Please select a valid quote currency.",
        )
      }

      /*
       * -------------------------------------------------------
       * NEGOTIATION CURRENCY LOCK
       * -------------------------------------------------------
       *
       * Negotiations remain in the client's currency.
       */

      if (
        isNegotiationReview &&
        currentNegotiation
      ) {
        const negotiationCurrency =
          (
            currentNegotiation.quote_currency ||
            request.preferred_currency ||
            "NGN"
          )
            .trim()
            .toUpperCase()

        if (
          currency !==
          negotiationCurrency
        ) {
          throw new Error(
            `Negotiated quote must remain in ${negotiationCurrency}.`,
          )
        }
      }

      /*
       * -------------------------------------------------------
       * COMPLETION
       * -------------------------------------------------------
       */

      if (
        !form.estimated_completion
      ) {
        throw new Error(
          "Estimated completion date is required.",
        )
      }

      /*
       * -------------------------------------------------------
       * DECISION SOURCE
       * -------------------------------------------------------
       */

      const decisionSource =
        decisionMode === "negotiated"
          ? "client_negotiated"
          : decisionMode === "admin"
            ? "admin"
            : decisionMode === "ai"
              ? "ai"
              : "adjusted"

      /*
       * -------------------------------------------------------
       * FINAL PAYLOAD
       * -------------------------------------------------------
       */

      const payload = {
        decision_action: action,

        decision_source:
          decisionSource,

        quote: {
          amount,

          currency,

          estimated_completion:
            form.estimated_completion,
        },

        justification: {
          reason,

          notes:
            form.notes.trim(),
        },

        metadata: {
          reviewed_from:
            "super_admin_dashboard",

          decision_mode:
            decisionMode,

          request_status:
            normalizedStatus,

          negotiation_id:
            isNegotiationReview
              ? currentNegotiation?.id ??
                null
              : null,
        },
      }

      /*
       * -------------------------------------------------------
       * API
       * -------------------------------------------------------
       */

      const response =
        await fetch(
          `/api/admin/requests/${request.id}/super-admin-review`,
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify(
              payload,
            ),
          },
        )

      const data =
        await response.json().catch(
          () => ({}),
        )

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Super Administrator review failed.",
        )
      }

      /*
       * -------------------------------------------------------
       * SUCCESS
       * -------------------------------------------------------
       */

      router.push(
        "/dashboard/requests",
      )

      router.refresh()
    } catch (error) {
      console.error(
        "SUPER ADMIN REVIEW ERROR",
        error,
      )

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong.",
      )
    } finally {
      setLoading(false)
    }
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-hidden pb-10">

      {/* =====================================================
          ERROR
          ===================================================== */}

      {message && (
        <div className="sticky top-4 z-30 flex items-start gap-3 rounded-xl border border-red-500/30 bg-[#160909]/95 px-4 py-4 text-sm text-red-300 shadow-2xl backdrop-blur">

          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300">
            !
          </div>

          <div className="min-w-0 flex-1">

            <p className="font-semibold">
              Review Error
            </p>

            <p className="mt-1 break-words text-red-300/80">
              {message}
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              setMessage("")
            }
            className="text-white/30 transition hover:text-white"
          >
            ×
          </button>

        </div>
      )}

      {/* =====================================================
          REQUEST HEADER
          ===================================================== */}

      <section className="relative overflow-hidden rounded-2xl border border-[#143b28] bg-gradient-to-br from-[#071711] via-[#06110f] to-black p-6 shadow-xl">

        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#20dc73]/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2">

              <span className="rounded-full border border-[#20dc73]/20 bg-[#20dc73]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#20dc73]">
                Super Administrator Review
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-wider text-white/40">
                Final Authority
              </span>

              {isNegotiationReview && (
                <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-[10px] uppercase tracking-wider text-yellow-300">
                  Negotiation Review
                </span>
              )}

              {isHistoryView && (
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] uppercase tracking-wider text-amber-300">
                  Historical View
                </span>
              )}

            </div>

            <h2 className="mt-4 break-words text-2xl font-bold tracking-tight text-white md:text-3xl">
              {request.title ||
                "Untitled Request"}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/40">

              <span>
                Case{" "}
                <span className="text-white/70">
                  {request.case_number ||
                    "Unassigned"}
                </span>
              </span>

              <span className="hidden text-white/10 sm:block">
                •
              </span>

              <span>
                Request ID{" "}
                <span className="font-mono text-white/50">
                  {request.id}
                </span>
              </span>

            </div>

          </div>

          <div className="shrink-0 rounded-xl border border-[#20dc73]/15 bg-black/40 px-5 py-4">

            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
              Current Status
            </p>

            <p className="mt-2 max-w-[220px] break-words text-sm font-bold uppercase tracking-wide text-[#20dc73]">
              {statusLabel(
                request.status,
              )}
            </p>

          </div>

        </div>

      </section>

      {/* =====================================================
          REQUEST INFORMATION
          ===================================================== */}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#143b28] bg-[#06110f] shadow-lg">

        <div className="border-b border-[#143b28] px-5 py-5 md:px-6">

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#20dc73]">
            Request Information
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            Full Client Request
          </h3>

        </div>

        <div className="grid min-w-0 gap-0 md:grid-cols-2">

          <div className="border-b border-[#143b28] p-5 md:border-r md:px-6">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Client
            </p>

            <p className="mt-2 break-all text-sm text-white">
              {request.client_email ||
                "Not available"}
            </p>

          </div>

          <div className="border-b border-[#143b28] p-5 md:px-6">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Preferred Currency
            </p>

            <p className="mt-2 text-sm font-semibold text-white">
              {request.preferred_currency ||
                "NGN"}
            </p>

          </div>

          <div className="border-b border-[#143b28] p-5 md:border-r md:px-6">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Service Type
            </p>

            <p className="mt-2 break-words text-sm text-white">
              {request.service_type ||
                "Not specified"}
            </p>

          </div>

          <div className="border-b border-[#143b28] p-5 md:px-6">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Status
            </p>

            <p className="mt-2 text-sm font-semibold uppercase text-[#20dc73]">
              {statusLabel(
                request.status,
              )}
            </p>

          </div>

          <div className="min-w-0 border-b border-[#143b28] p-5 md:col-span-2 md:px-6">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Investigation Objective
            </p>

            <div className="mt-3 rounded-xl border border-white/5 bg-black/25 p-4">

              <p className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7 text-white/75">
                {request.investigation_objective ||
                  "No objective provided."}
              </p>

            </div>

          </div>

          <div className="min-w-0 p-5 md:col-span-2 md:px-6">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Client Description
            </p>

            <div className="mt-3 rounded-xl border border-white/5 bg-black/25 p-4">

              <p className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7 text-white/75">
                {request.description ||
                  "No description provided."}
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          AI ASSESSMENT
          ===================================================== */}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#143b28] bg-[#06110f] shadow-lg">

        <div className="border-b border-[#143b28] bg-gradient-to-r from-[#20dc73]/5 to-transparent px-5 py-5 md:px-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#20dc73]">
                Intelligence Assessment
              </p>

              <h3 className="mt-2 text-xl font-semibold text-white">
                AI Analysis
              </h3>

              <p className="mt-1 text-sm text-white/40">
                Automated assessment generated from the submitted request.
              </p>

            </div>

            <div className="rounded-lg border border-[#20dc73]/15 bg-black/30 px-3 py-2 text-xs text-white/40">
              AI recommendation
            </div>

          </div>

        </div>

        <div className="grid min-w-0 gap-4 p-5 md:grid-cols-3 md:p-6">

          <div className="min-w-0 rounded-xl border border-[#143b28] bg-black/30 p-4">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              AI Estimate
            </p>

            <p className="mt-3 break-words text-xl font-bold text-white">
              {request.ai_price_estimate !=
              null
                ? formatMoney(
                    request.ai_price_estimate,
                    "USD",
                  )
                : "Pending"}
            </p>

            <p className="mt-1 text-xs text-white/30">
              Automated pricing recommendation
            </p>

          </div>

          <div className="min-w-0 rounded-xl border border-[#143b28] bg-black/30 p-4">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Complexity
            </p>

            <p className="mt-3 break-words text-lg font-bold uppercase text-white">
              {request.ai_complexity ||
                "Pending"}
            </p>

            <p className="mt-1 text-xs text-white/30">
              Estimated operational complexity
            </p>

          </div>

          <div className="min-w-0 rounded-xl border border-[#143b28] bg-black/30 p-4">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Confidence
            </p>

            <p className="mt-3 break-words text-xl font-bold text-[#20dc73]">
              {confidencePercent(
                request.ai_confidence,
              ) != null
                ? `${confidencePercent(
                    request.ai_confidence,
                  )!.toFixed(0)}%`
                : "Pending"}
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">

              <div
                className="h-full rounded-full bg-[#20dc73]"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      confidencePercent(
                        request.ai_confidence,
                      ) ?? 0,
                    ),
                  )}%`,
                }}
              />

            </div>

          </div>

          <div className="min-w-0 md:col-span-3">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              AI Reasoning
            </p>

            <div className="mt-3 min-w-0 overflow-hidden rounded-xl border border-[#143b28] bg-black/40 p-5">

              <p className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7 text-white/70">
                {request.ai_reasoning ||
                  "No AI reasoning available."}
              </p>

            </div>

          </div>

          <div className="min-w-0 md:col-span-3">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Raw AI Analysis
            </p>

            <div className="mt-3 min-w-0 overflow-hidden rounded-xl border border-[#143b28] bg-black/50 p-5">

              <pre className="m-0 min-w-0 max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-mono text-xs leading-6 text-white/55">
                {request.ai_analysis
                  ? typeof request.ai_analysis ===
                    "string"
                    ? request.ai_analysis
                    : JSON.stringify(
                        request.ai_analysis,
                        null,
                        2,
                      )
                  : "No AI analysis available."}
              </pre>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          ADMINISTRATOR PROPOSAL
          ===================================================== */}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#143b28] bg-[#06110f] shadow-lg">

        <div className="border-b border-[#143b28] px-5 py-5 md:px-6">

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#20dc73]">
            Administrator Submission
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            Administrator Proposal
          </h3>

          <p className="mt-1 text-sm text-white/40">
            Latest administrator-submitted quote awaiting final review.
          </p>

        </div>

        <div className="grid min-w-0 gap-4 p-5 md:grid-cols-3 md:p-6">

          <div className="min-w-0 rounded-xl border border-[#143b28] bg-black/30 p-4">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Proposed Amount
            </p>

            <p className="mt-2 break-words text-xl font-semibold text-white">
              {formatMoney(
                latestAdminQuote?.price ??
                  request.approved_quote_amount,
                latestAdminQuote?.currency ??
                  request.approved_quote_currency ??
                  request.preferred_currency ??
                  "USD",
              )}
            </p>

          </div>

          <div className="min-w-0 rounded-xl border border-[#143b28] bg-black/30 p-4">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Quote Version
            </p>

            <p className="mt-2 text-lg font-semibold text-white">
              {latestAdminQuote
                ? `Version ${latestAdminQuote.version_number}`
                : "Not available"}
            </p>

          </div>

          <div className="min-w-0 rounded-xl border border-[#143b28] bg-black/30 p-4">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Quote Currency
            </p>

            <p className="mt-2 text-lg font-semibold text-white">
              {latestAdminQuote?.currency ||
                request.approved_quote_currency ||
                "USD"}
            </p>

          </div>

          <div className="min-w-0 md:col-span-3">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Administrator Reasoning
            </p>

            <div className="mt-2 min-w-0 overflow-hidden rounded-xl border border-[#143b28] bg-black/40 p-4">

              <p className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-white/70">
                {latestAdminQuote?.reasoning ||
                  latestAdminQuote?.notes ||
                  request.admin_quote_notes ||
                  "No administrator reasoning provided."}
              </p>

            </div>

          </div>

          <div className="min-w-0 md:col-span-3">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Estimated Completion
            </p>

            <p className="mt-2 text-sm text-white">
              {formatDate(
                latestAdminQuote?.estimated_completion ||
                  request.approved_estimated_completion,
              )}
            </p>

          </div>

        </div>

      </section>

      {/* =====================================================
          CURRENT NEGOTIATION
          ===================================================== */}

      {currentNegotiation && (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-yellow-500/20 bg-[#06110f] shadow-lg">

          <div className="border-b border-yellow-500/20 bg-yellow-500/5 px-5 py-5 md:px-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-yellow-300">
                  Client Negotiation
                </p>

                <h3 className="mt-2 text-xl font-semibold text-white">
                  Current Negotiation Cycle
                </h3>

                <p className="mt-1 text-sm text-white/40">
                  The client requested a quote change.
                  The Administrator has reviewed the request
                  and submitted a recommendation.
                </p>

              </div>

              <span className="shrink-0 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-yellow-300">
                Round{" "}
                {currentNegotiation.round_number ??
                  "—"}
              </span>

            </div>

          </div>

          <div className="p-5 md:p-6">

            <div className="grid min-w-0 gap-4 md:grid-cols-3">

              {/* CLIENT REQUEST */}

              <div className="rounded-xl border border-yellow-500/15 bg-yellow-500/[0.03] p-5">

                <p className="text-[10px] uppercase tracking-wider text-yellow-300/60">
                  Client Requested Quote
                </p>

                <p className="mt-3 break-words text-2xl font-bold text-yellow-300">
                  {formatMoney(
                    currentNegotiation.requested_budget,
                    currentNegotiation.quote_currency ||
                      request.preferred_currency ||
                      "NGN",
                  )}
                </p>

                <p className="mt-2 text-xs text-white/30">
                  Client-proposed negotiation amount
                </p>

              </div>

              {/* ADMIN RECOMMENDATION */}

              <div className="rounded-xl border border-[#20dc73]/15 bg-[#20dc73]/[0.03] p-5">

                <p className="text-[10px] uppercase tracking-wider text-[#20dc73]/60">
                  Administrator Recommendation
                </p>

                <p className="mt-3 break-words text-2xl font-bold text-[#20dc73]">
                  {formatMoney(
                    currentNegotiation.revised_quote_amount ??
                      currentNegotiation.requested_budget,
                    currentNegotiation.quote_currency ||
                      request.preferred_currency ||
                      "NGN",
                  )}
                </p>

                <p className="mt-2 text-xs text-white/30">
                  Proposed amount for Super Administrator review
                </p>

              </div>

              {/* CURRENCY */}

              <div className="rounded-xl border border-[#143b28] bg-black/30 p-5">

                <p className="text-[10px] uppercase tracking-wider text-white/30">
                  Negotiation Currency
                </p>

                <p className="mt-3 text-xl font-bold text-white">
                  {currentNegotiation.quote_currency ||
                    request.preferred_currency ||
                    "NGN"}
                </p>

                <p className="mt-2 text-xs text-white/30">
                  Negotiations remain in the client's preferred currency.
                </p>

              </div>

            </div>

            {/* CLIENT REASON */}

            {currentNegotiation.client_reason && (
              <div className="mt-5">

                <p className="text-[10px] uppercase tracking-wider text-white/30">
                  Client Reason
                </p>

                <div className="mt-2 rounded-xl border border-white/5 bg-black/30 p-5">

                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7 text-white/70">
                    {
                      currentNegotiation.client_reason
                    }
                  </p>

                </div>

              </div>
            )}

            {/* CLIENT NOTES */}

            {currentNegotiation.client_notes && (
              <div className="mt-4">

                <p className="text-[10px] uppercase tracking-wider text-white/30">
                  Client Notes
                </p>

                <div className="mt-2 rounded-xl border border-white/5 bg-black/30 p-5">

                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7 text-white/70">
                    {
                      currentNegotiation.client_notes
                    }
                  </p>

                </div>

              </div>
            )}

            {/* ADMINISTRATOR RECOMMENDATION */}

            {currentNegotiation.administrator_recommendation && (
              <div className="mt-4">

                <p className="text-[10px] uppercase tracking-wider text-white/30">
                  Administrator Recommendation
                </p>

                <div className="mt-2 rounded-xl border border-[#20dc73]/10 bg-[#20dc73]/[0.02] p-5">

                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7 text-white/70">
                    {
                      currentNegotiation.administrator_recommendation
                    }
                  </p>

                </div>

              </div>
            )}

          </div>

        </section>
      )}

      {/* =====================================================
          COMPLETE QUOTE HISTORY
          ===================================================== */}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#143b28] bg-[#06110f] shadow-lg">

        <div className="border-b border-[#143b28] px-5 py-5 md:px-6">

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#20dc73]">
            Governance Record
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            Complete Quote History
          </h3>

          <p className="mt-1 text-sm text-white/40">
            Visible to Super Administrators only.
          </p>

        </div>

        <div className="p-5 md:p-6">

          {quoteHistory.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center">

              <p className="text-sm text-white/40">
                No quote versions recorded.
              </p>

            </div>
          ) : (
            <div className="space-y-4">

              {quoteHistory.map(
                (quote) => (
                  <div
                    key={quote.id}
                    className="min-w-0 overflow-hidden rounded-xl border border-[#143b28] bg-black/30 p-5"
                  >

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <p className="font-semibold text-white">
                            Version{" "}
                            {
                              quote.version_number
                            }
                          </p>

                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-wider text-white/40">
                            {quote.source}
                          </span>

                          <span className="rounded-full border border-[#20dc73]/10 bg-[#20dc73]/5 px-2 py-1 text-[9px] uppercase tracking-wider text-[#20dc73]/70">
                            {quote.creator_role ||
                              "Unknown Role"}
                          </span>

                        </div>

                      </div>

                      <div className="shrink-0 sm:text-right">

                        <p className="break-words font-bold text-white">
                          {formatMoney(
                            quote.price,
                            quote.currency ||
                              "USD",
                          )}
                        </p>

                        <p className="mt-1 text-[10px] uppercase tracking-wider text-white/30">
                          {statusLabel(
                            quote.status,
                          )}
                        </p>

                      </div>

                    </div>

                    {quote.reasoning && (
                      <div className="mt-5 min-w-0">

                        <p className="text-[10px] uppercase tracking-wider text-white/30">
                          Reasoning
                        </p>

                        <p className="mt-2 min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-white/65">
                          {quote.reasoning}
                        </p>

                      </div>
                    )}

                    {quote.notes && (
                      <div className="mt-4 min-w-0">

                        <p className="text-[10px] uppercase tracking-wider text-white/30">
                          Notes
                        </p>

                        <div className="mt-2 min-w-0 overflow-hidden rounded-lg border border-white/5 bg-black/30 p-3">

                          <p className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-white/55">
                            {quote.notes}
                          </p>

                        </div>

                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/5 pt-4 text-[10px] text-white/25">

                      {quote.estimated_start && (
                        <span>
                          Start:{" "}
                          {formatDate(
                            quote.estimated_start,
                          )}
                        </span>
                      )}

                      {quote.estimated_completion && (
                        <span>
                          Completion:{" "}
                          {formatDate(
                            quote.estimated_completion,
                          )}
                        </span>
                      )}

                      {quote.created_at && (
                        <span>
                          Created:{" "}
                          {formatDate(
                            quote.created_at,
                          )}
                        </span>
                      )}

                    </div>

                  </div>
                ),
              )}

            </div>
          )}

        </div>

      </section>

      {/* =====================================================
          NEGOTIATION HISTORY
          ===================================================== */}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#143b28] bg-[#06110f] shadow-lg">

        <div className="border-b border-[#143b28] px-5 py-5 md:px-6">

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#20dc73]">
            Client Negotiation
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            Negotiation History
          </h3>

        </div>

        <div className="p-5 md:p-6">

          {negotiationHistory.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center">

              <p className="text-sm text-white/40">
                No negotiation rounds recorded.
              </p>

            </div>
          ) : (
            <div className="space-y-4">

              {negotiationHistory.map(
                (negotiation) => (
                  <div
                    key={
                      negotiation.id
                    }
                    className="min-w-0 overflow-hidden rounded-xl border border-[#143b28] bg-black/30 p-5"
                  >

                    <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">

                      <div>

                        <p className="font-semibold text-white">
                          Round{" "}
                          {negotiation.round_number ??
                            "—"}
                        </p>

                        <p className="mt-1 text-[10px] uppercase tracking-wider text-white/30">
                          {statusLabel(
                            negotiation.status,
                          )}
                        </p>

                      </div>

                      <p className="break-words font-semibold text-white/80 sm:text-right">
                        {formatMoney(
                          negotiation.revised_quote_amount ??
                            negotiation.original_quote_amount,
                          negotiation.quote_currency ||
                            "USD",
                        )}
                      </p>

                    </div>

                    {negotiation.requested_budget !=
                      null && (
                      <div className="mt-5">

                        <p className="text-[10px] uppercase tracking-wider text-white/30">
                          Client Requested Budget
                        </p>

                        <p className="mt-2 text-sm text-white">
                          {formatMoney(
                            negotiation.requested_budget,
                            negotiation.quote_currency ||
                              "USD",
                          )}
                        </p>

                      </div>
                    )}

                    {negotiation.client_reason && (
                      <div className="mt-5">

                        <p className="text-[10px] uppercase tracking-wider text-white/30">
                          Client Reason
                        </p>

                        <p className="mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-white/65">
                          {
                            negotiation.client_reason
                          }
                        </p>

                      </div>
                    )}

                    {negotiation.client_notes && (
                      <div className="mt-4">

                        <p className="text-[10px] uppercase tracking-wider text-white/30">
                          Client Notes
                        </p>

                        <p className="mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-white/65">
                          {
                            negotiation.client_notes
                          }
                        </p>

                      </div>
                    )}

                    {negotiation.administrator_recommendation && (
                      <div className="mt-5 border-t border-[#143b28] pt-5">

                        <p className="text-[10px] uppercase tracking-wider text-white/30">
                          Administrator Recommendation
                        </p>

                        <p className="mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-white/65">
                          {
                            negotiation.administrator_recommendation
                          }
                        </p>

                      </div>
                    )}

                    {negotiation.revised_quote_amount !=
                      null && (
                      <div className="mt-5">

                        <p className="text-[10px] uppercase tracking-wider text-white/30">
                          Administrator Revised Quote
                        </p>

                        <p className="mt-2 text-lg font-bold text-[#20dc73]">
                          {formatMoney(
                            negotiation.revised_quote_amount,
                            negotiation.quote_currency ||
                              "USD",
                          )}
                        </p>

                      </div>
                    )}

                    {negotiation.owner_decision && (
                      <div className="mt-5 border-t border-[#143b28] pt-5">

                        <p className="text-[10px] uppercase tracking-wider text-white/30">
                          Super Administrator Decision
                        </p>

                        <p className="mt-2 text-sm font-bold uppercase text-[#20dc73]">
                          {
                            negotiation.owner_decision
                          }
                        </p>

                        {negotiation.owner_decision_notes && (
                          <p className="mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-white/65">
                            {
                              negotiation.owner_decision_notes
                            }
                          </p>
                        )}

                      </div>
                    )}

                    <div className="mt-5 border-t border-white/5 pt-4 text-[10px] text-white/25">
                      {formatDate(
                        negotiation.created_at,
                      )}
                    </div>

                  </div>
                ),
              )}

            </div>
          )}

        </div>

      </section>

      {/* =====================================================
          AUDIT HISTORY
          ===================================================== */}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#143b28] bg-[#06110f] shadow-lg">

        <div className="border-b border-[#143b28] px-5 py-5 md:px-6">

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#20dc73]">
            Security & Audit
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            Request Audit History
          </h3>

          <p className="mt-1 text-sm text-white/40">
            Administrative actions recorded against this request.
          </p>

        </div>

        <div className="p-5 md:p-6">

          {auditHistory.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center">

              <p className="text-sm text-white/40">
                No audit events recorded.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {auditHistory.map(
                (event) => (
                  <div
                    key={event.id}
                    className="min-w-0 overflow-hidden rounded-xl border border-[#143b28] bg-black/30 p-4"
                  >

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">

                      <div className="min-w-0">

                        <p className="break-words text-sm font-semibold text-white">
                          {statusLabel(
                            event.action,
                          )}
                        </p>

                        <p className="mt-1 break-all font-mono text-[10px] text-white/25">
                          Actor:{" "}
                          {event.actor_user_id ||
                            "System"}
                        </p>

                      </div>

                      <p className="shrink-0 text-[10px] text-white/25">
                        {formatDate(
                          event.created_at,
                        )}
                      </p>

                    </div>

                    {event.details !=
                      null && (
                      <pre className="mt-4 w-full max-w-full overflow-x-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-lg border border-white/5 bg-black/70 p-4 font-mono text-[11px] leading-5 text-white/45">
                        {typeof event.details ===
                        "string"
                          ? event.details
                          : JSON.stringify(
                              event.details,
                              null,
                              2,
                            )}
                      </pre>
                    )}

                  </div>
                ),
              )}

            </div>
          )}

        </div>

      </section>

      {/* =====================================================
          SUPER ADMINISTRATOR HISTORY
          ===================================================== */}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#143b28] bg-[#06110f] shadow-lg">

        <div className="border-b border-[#143b28] bg-gradient-to-r from-[#20dc73]/5 via-transparent to-transparent px-5 py-5 md:px-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            <div className="min-w-0">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#20dc73]/20 bg-[#20dc73]/10 text-[#20dc73]">
                  ✓
                </div>

                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#20dc73]">
                    Super Administrator History
                  </p>

                  <h3 className="mt-1 text-xl font-semibold text-white">
                    Previous Final Authority Actions
                  </h3>

                </div>

              </div>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">
                A chronological record of decisions previously made
                by the Super Administrator during the governance
                lifecycle of this request.
              </p>

            </div>

            <div className="shrink-0 rounded-xl border border-white/10 bg-black/30 px-4 py-3">

              <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                Recorded Actions
              </p>

              <p className="mt-1 text-lg font-bold text-white">
                {superAdminHistory.length}
              </p>

            </div>

          </div>

        </div>

        <div className="p-5 md:p-6">

          {superAdminHistory.length ===
          0 ? (

            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 py-10 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-xl text-white/30">
                —
              </div>

              <h4 className="mt-4 text-sm font-semibold text-white/70">
                No final authority actions yet
              </h4>

              <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-white/30">
                No Super Administrator decision has been recorded
                for this request yet. Once a decision is made, it
                will appear here as part of the permanent governance
                record.
              </p>

            </div>

          ) : (

            <div className="relative">

              <div className="absolute left-[19px] top-3 bottom-3 hidden w-px bg-gradient-to-b from-[#20dc73]/40 via-[#143b28] to-transparent sm:block" />

              <div className="space-y-5">

                {superAdminHistory.map(
                  (event, index) => {

                    const action =
                      event.action
                        ?.trim()
                        .toLowerCase() || ""

                    const isApproval =
                      action.includes(
                        "approved",
                      ) ||
                      action.includes(
                        "approve",
                      )

                    const isRejection =
                      action.includes(
                        "rejected",
                      ) ||
                      action.includes(
                        "reject",
                      )

                    const isAdjustment =
                      action.includes(
                        "adjusted",
                      ) ||
                      action.includes(
                        "modified",
                      )

                    const actionTitle =
                      isApproval
                        ? "Quote Approved"
                        : isRejection
                          ? "Request Rejected"
                          : isAdjustment
                            ? "Quote Adjusted"
                            : statusLabel(
                                event.action,
                              )

                    const actionDescription =
                      isApproval
                        ? "The Super Administrator approved the current quote for the next stage of the workflow."
                        : isRejection
                          ? "The Super Administrator rejected the request during final governance review."
                          : isAdjustment
                            ? "The Super Administrator modified the quote before finalizing the workflow."
                            : "A final authority action was recorded against this request."

                    const reason =
                      getAuditReason(
                        event.details,
                      )

                    return (
                      <div
                        key={
                          event.id
                        }
                        className="relative sm:pl-12"
                      >

                        <div className="absolute left-0 top-1 hidden h-10 w-10 items-center justify-center rounded-full border border-[#143b28] bg-[#06110f] sm:flex">

                          <div
                            className={[
                              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",

                              isRejection
                                ? "bg-red-500/10 text-red-300"
                                : isAdjustment
                                  ? "bg-yellow-500/10 text-yellow-300"
                                  : "bg-[#20dc73]/10 text-[#20dc73]",
                            ].join(" ")}
                          >

                            {isRejection
                              ? "×"
                              : isAdjustment
                                ? "↔"
                                : "✓"}

                          </div>

                        </div>

                        <div
                          className={[
                            "overflow-hidden rounded-2xl border bg-black/25 transition",

                            isRejection
                              ? "border-red-500/15 hover:border-red-500/30"
                              : isAdjustment
                                ? "border-yellow-500/15 hover:border-yellow-500/30"
                                : "border-[#143b28] hover:border-[#20dc73]/25",
                          ].join(" ")}
                        >

                          <div className="flex flex-col gap-4 border-b border-white/5 p-5 sm:flex-row sm:items-start sm:justify-between">

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">

                                <span
                                  className={[
                                    "rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]",

                                    isRejection
                                      ? "border-red-500/20 bg-red-500/5 text-red-300"
                                      : isAdjustment
                                        ? "border-yellow-500/20 bg-yellow-500/5 text-yellow-300"
                                        : "border-[#20dc73]/20 bg-[#20dc73]/5 text-[#20dc73]",
                                  ].join(" ")}
                                >
                                  {isRejection
                                    ? "Rejected"
                                    : isAdjustment
                                      ? "Adjusted"
                                      : isApproval
                                        ? "Approved"
                                        : "Recorded"}
                                </span>

                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-wider text-white/30">
                                  Final Authority
                                </span>

                                <span className="text-[10px] text-white/20">
                                  Action{" "}
                                  {index + 1}
                                </span>

                              </div>

                              <h4 className="mt-3 break-words text-base font-semibold text-white">
                                {actionTitle}
                              </h4>

                              <p className="mt-1 max-w-2xl text-xs leading-5 text-white/35">
                                {
                                  actionDescription
                                }
                              </p>

                            </div>

                            <div className="shrink-0 sm:text-right">

                              <p className="text-[9px] uppercase tracking-[0.18em] text-white/25">
                                Recorded
                              </p>

                              <p className="mt-1 text-xs font-medium text-white/50">
                                {formatDate(
                                  event.created_at,
                                )}
                              </p>

                            </div>

                          </div>

                          <div className="grid gap-5 p-5 md:grid-cols-2">

                            <div className="min-w-0 md:col-span-2">

                              <div className="flex items-center justify-between gap-3">

                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                                  Decision Reason
                                </p>

                                <span className="text-[9px] uppercase tracking-wider text-white/20">
                                  Governance Record
                                </span>

                              </div>

                              <div
                                className={[
                                  "mt-2 rounded-xl border p-4",

                                  isRejection
                                    ? "border-red-500/10 bg-red-500/[0.03]"
                                    : isAdjustment
                                      ? "border-yellow-500/10 bg-yellow-500/[0.03]"
                                      : "border-[#143b28] bg-black/30",
                                ].join(" ")}
                              >

                                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7 text-white/65">
                                  {reason}
                                </p>

                              </div>

                            </div>

                            <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.015] p-4">

                              <p className="text-[9px] uppercase tracking-[0.18em] text-white/25">
                                Reviewing Authority
                              </p>

                              <p className="mt-2 break-all font-mono text-xs text-white/50">
                                {event.actor_user_id ||
                                  "System"}
                              </p>

                              <p className="mt-1 text-[10px] text-white/20">
                                Super Administrator
                              </p>

                            </div>

                            <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.015] p-4">

                              <p className="text-[9px] uppercase tracking-[0.18em] text-white/25">
                                Workflow Event
                              </p>

                              <p className="mt-2 break-words text-xs font-medium text-white/50">
                                {statusLabel(
                                  event.action,
                                )}
                              </p>

                              <p className="mt-1 text-[10px] text-white/20">
                                Immutable audit entry
                              </p>

                            </div>

                          </div>

                          {event.details !=
                            null && (
                            <details className="border-t border-white/5">

                              <summary className="cursor-pointer select-none px-5 py-4 text-[10px] uppercase tracking-[0.18em] text-white/25 transition hover:text-white/50">
                                View audit metadata
                              </summary>

                              <div className="px-5 pb-5">

                                <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-xl border border-white/5 bg-black/60 p-4 font-mono text-[10px] leading-5 text-white/35">
                                  {typeof event.details ===
                                  "string"
                                    ? event.details
                                    : JSON.stringify(
                                        event.details,
                                        null,
                                        2,
                                      )}
                                </pre>

                              </div>

                            </details>
                          )}

                        </div>

                      </div>
                    )
                  },
                )}

              </div>

            </div>
          )}

        </div>

      </section>

      {/* =====================================================
          FINAL AUTHORITY ACTION AREA
          ===================================================== */}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#143b28] bg-[#06110f] shadow-lg">

        <div className="border-b border-[#143b28] px-5 py-5 md:px-6">

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#20dc73]">
            Final Authority
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            Super Administrator Decision
          </h3>

          <p className="mt-1 text-sm text-white/40">
            {isNegotiationReview
              ? "Final governance decision for the current client negotiation."
              : "Final governance decision for the request."}
          </p>

        </div>

        <div className="relative space-y-6 p-5 md:p-7">

          {/* =================================================
              HISTORY VIEW
              ================================================= */}

          {isHistoryView ? (

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">

              <div className="flex gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 text-xl text-white/50">
                  H
                </div>

                <div className="min-w-0">

                  <h4 className="text-lg font-bold text-white">
                    Historical View
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-white/50">
                    You are viewing this request from history.
                    The Super Administrator decision form is
                    disabled for historical views.
                  </p>

                  <div className="mt-6 rounded-xl border border-[#143b28] bg-black/40 p-5">

                    <p className="text-[10px] uppercase tracking-wider text-white/30">
                      Current Request Status
                    </p>

                    <p className="mt-2 text-sm font-bold uppercase text-[#20dc73]">
                      {statusLabel(
                        request.status,
                      )}
                    </p>

                    {request.super_admin_quote_action && (
                      <div className="mt-5">

                        <p className="text-[10px] uppercase tracking-wider text-white/30">
                          Previous Decision
                        </p>

                        <p className="mt-2 text-sm font-bold uppercase text-[#20dc73]">
                          {statusLabel(
                            request.super_admin_quote_action,
                          )}
                        </p>

                      </div>
                    )}

                    <div className="mt-5">

                      <p className="text-[10px] uppercase tracking-wider text-white/30">
                        Final Amount
                      </p>

                      <p className="mt-2 text-xl font-bold text-white">
                        {formatMoney(
                          request.approved_quote_amount,
                          request.approved_quote_currency ||
                            request.preferred_currency ||
                            "USD",
                        )}
                      </p>

                    </div>

                    <div className="mt-5">

                      <p className="text-[10px] uppercase tracking-wider text-white/30">
                        Estimated Completion
                      </p>

                      <p className="mt-2 text-sm text-white/70">
                        {formatDate(
                          request.approved_estimated_completion,
                        )}
                      </p>

                    </div>

                    <div className="mt-5">

                      <p className="text-[10px] uppercase tracking-wider text-white/30">
                        Decision Reason
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/70">
                        {request.super_admin_quote_notes ||
                          request.approved_quote_notes ||
                          "No reason provided"}
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          ) : superAdminCanAct ? (

            <>

              {/* =================================================
                  DECISION PATH
                  ================================================= */}

              <div>

                <div className="mb-4">

                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    {isNegotiationReview
                      ? "Negotiation Decision"
                      : "Select Decision Path"}
                  </p>

                  <p className="mt-1 text-sm text-white/30">
                    {isNegotiationReview
                      ? "Choose whether to accept the negotiated recommendation, adjust it, or reject the request."
                      : "Choose the recommendation you want to act on, or create a custom adjustment."}
                  </p>

                </div>

                {isNegotiationReview ? (

                  <div className="grid gap-3 md:grid-cols-3">

                    {/* NEGOTIATED */}

                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={
                        selectNegotiatedRecommendation
                      }
                      className={[
                        "group min-w-0 rounded-xl border p-5 text-left transition",
                        decisionMode ===
                          "negotiated"
                          ? "border-[#20dc73]/50 bg-[#20dc73]/10 shadow-lg shadow-[#20dc73]/5"
                          : "border-[#143b28] bg-black/30 hover:border-[#20dc73]/30 hover:bg-[#20dc73]/5",
                      ].join(" ")}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#20dc73]/10 text-[#20dc73]">
                          ✓
                        </div>

                        {decisionMode ===
                          "negotiated" && (
                          <span className="text-[#20dc73]">
                            ✓
                          </span>
                        )}

                      </div>

                      <p className="mt-4 font-semibold text-white">
                        Accept Negotiated Recommendation
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/35">
                        Accept the Administrator's recommendation
                        after reviewing the client's requested change.
                      </p>

                      <p className="mt-4 break-words text-lg font-bold text-[#20dc73]">
                        {formatMoney(
                          currentNegotiation?.revised_quote_amount ??
                            currentNegotiation?.requested_budget ??
                            latestAdminQuote?.price ??
                            request.approved_quote_amount,
                          currentNegotiation?.quote_currency ||
                            request.preferred_currency ||
                            "NGN",
                        )}
                      </p>

                    </button>

                    {/* ADJUST */}

                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={
                        selectAdjustment
                      }
                      className={[
                        "group min-w-0 rounded-xl border p-5 text-left transition",
                        decisionMode ===
                          "adjust"
                          ? "border-yellow-500/50 bg-yellow-500/10"
                          : "border-[#143b28] bg-black/30 hover:border-yellow-500/30 hover:bg-yellow-500/5",
                      ].join(" ")}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-300">
                          ↔
                        </div>

                        {decisionMode ===
                          "adjust" && (
                          <span className="text-yellow-300">
                            ✓
                          </span>
                        )}

                      </div>

                      <p className="mt-4 font-semibold text-white">
                        Adjust Negotiated Quote
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/35">
                        Set a different final amount while
                        remaining in the client's currency.
                      </p>

                      <p className="mt-4 text-sm font-bold text-yellow-300">
                        Custom adjustment
                      </p>

                    </button>

                    {/* REJECT */}

                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={
                        selectReject
                      }
                      className={[
                        "group min-w-0 rounded-xl border p-5 text-left transition",
                        decisionMode ===
                          "reject"
                          ? "border-red-500/50 bg-red-500/10"
                          : "border-[#143b28] bg-black/30 hover:border-red-500/30 hover:bg-red-500/5",
                      ].join(" ")}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-300">
                          ×
                        </div>

                        {decisionMode ===
                          "reject" && (
                          <span className="text-red-300">
                            ✓
                          </span>
                        )}

                      </div>

                      <p className="mt-4 font-semibold text-white">
                        Reject Request
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/35">
                        Reject the request during final governance review.
                      </p>

                      <p className="mt-4 text-sm font-bold text-red-300">
                        Final rejection
                      </p>

                    </button>

                  </div>

                ) : (

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">

                    {/* ADMINISTRATOR */}

                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={
                        selectAdministratorQuote
                      }
                      className={[
                        "group min-w-0 rounded-xl border p-4 text-left transition",
                        decisionMode ===
                          "admin"
                          ? "border-[#20dc73]/50 bg-[#20dc73]/10 shadow-lg shadow-[#20dc73]/5"
                          : "border-[#143b28] bg-black/30 hover:border-[#20dc73]/30 hover:bg-[#20dc73]/5",
                      ].join(" ")}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">
                          A
                        </div>

                        {decisionMode ===
                          "admin" && (
                          <span className="text-[#20dc73]">
                            ✓
                          </span>
                        )}

                      </div>

                      <p className="mt-4 font-semibold text-white">
                        Accept Administrator
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/35">
                        Use the Administrator's submitted quote.
                      </p>

                      <p className="mt-3 break-words text-sm font-bold text-white/80">
                        {formatMoney(
                          latestAdminQuote?.price ??
                            request.approved_quote_amount,
                          latestAdminQuote?.currency ??
                            request.approved_quote_currency ??
                            "USD",
                        )}
                      </p>

                    </button>

                    {/* AI */}

                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={
                        selectAIQuote
                      }
                      className={[
                        "group min-w-0 rounded-xl border p-4 text-left transition",
                        decisionMode ===
                          "ai"
                          ? "border-[#20dc73]/50 bg-[#20dc73]/10 shadow-lg shadow-[#20dc73]/5"
                          : "border-[#143b28] bg-black/30 hover:border-[#20dc73]/30 hover:bg-[#20dc73]/5",
                      ].join(" ")}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-300">
                          AI
                        </div>

                        {decisionMode ===
                          "ai" && (
                          <span className="text-[#20dc73]">
                            ✓
                          </span>
                        )}

                      </div>

                      <p className="mt-4 font-semibold text-white">
                        Accept AI Recommendation
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/35">
                        Use the automated USD estimate.
                      </p>

                      <p className="mt-3 break-words text-sm font-bold text-white/80">
                        {formatMoney(
                          request.ai_price_estimate ??
                            latestAIQuote?.price,
                          latestAIQuote?.currency ||
                            request.ai_price_currency ||
                            "USD",
                        )}
                      </p>

                    </button>

                    {/* ADJUST */}

                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={
                        selectAdjustment
                      }
                      className={[
                        "group min-w-0 rounded-xl border p-4 text-left transition",
                        decisionMode ===
                          "adjust"
                          ? "border-yellow-500/50 bg-yellow-500/10"
                          : "border-[#143b28] bg-black/30 hover:border-yellow-500/30 hover:bg-yellow-500/5",
                      ].join(" ")}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-300">
                          ↔
                        </div>

                        {decisionMode ===
                          "adjust" && (
                          <span className="text-yellow-300">
                            ✓
                          </span>
                        )}

                      </div>

                      <p className="mt-4 font-semibold text-white">
                        Adjust Quote
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/35">
                        Set a custom amount, currency, date and reasoning.
                      </p>

                      <p className="mt-3 text-sm font-bold text-yellow-300">
                        Custom
                      </p>

                    </button>

                    {/* REJECT */}

                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={
                        selectReject
                      }
                      className={[
                        "group min-w-0 rounded-xl border p-4 text-left transition",
                        decisionMode ===
                          "reject"
                          ? "border-red-500/50 bg-red-500/10"
                          : "border-[#143b28] bg-black/30 hover:border-red-500/30 hover:bg-red-500/5",
                      ].join(" ")}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-300">
                          ×
                        </div>

                        {decisionMode ===
                          "reject" && (
                          <span className="text-red-300">
                            ✓
                          </span>
                        )}

                      </div>

                      <p className="mt-4 font-semibold text-white">
                        Reject Request
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/35">
                        Decline the request at final governance review.
                      </p>

                      <p className="mt-3 text-sm font-bold text-red-300">
                        Final rejection
                      </p>

                    </button>

                  </div>

                )}

              </div>

              {/* =================================================
                  DECISION EDITOR
                  ================================================= */}

              <div className="rounded-2xl border border-[#143b28] bg-black/30">

                <div className="border-b border-[#143b28] px-5 py-4">

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                        Decision Editor
                      </p>

                      <p className="mt-1 font-semibold text-white">
                        {decisionMode ===
                        "negotiated"
                          ? "Negotiated Recommendation"
                          : decisionMode ===
                            "admin"
                          ? "Administrator Quote"
                          : decisionMode ===
                            "ai"
                          ? "AI Recommendation"
                          : decisionMode ===
                            "adjust"
                          ? "Custom Quote Adjustment"
                          : decisionMode ===
                            "reject"
                          ? "Rejection"
                          : "Select a decision path above"}
                      </p>

                    </div>

                    {decisionMode && (
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-[9px] font-semibold uppercase tracking-wider",

                          decisionMode ===
                          "reject"
                            ? "border border-red-500/20 bg-red-500/5 text-red-300"
                            : decisionMode ===
                              "adjust"
                            ? "border border-yellow-500/20 bg-yellow-500/5 text-yellow-300"
                            : "border border-[#20dc73]/20 bg-[#20dc73]/5 text-[#20dc73]",
                        ].join(" ")}
                      >
                        {decisionMode}
                      </span>
                    )}

                  </div>

                </div>

                <div className="grid gap-5 p-5 md:grid-cols-2">

                  {/* AMOUNT */}

                  <label className="min-w-0 text-sm text-white/60">

                    <span className="mb-2 block text-[10px] uppercase tracking-wider text-white/30">
                      {isNegotiationReview
                        ? "Final Negotiated Amount"
                        : "Approved Quote Amount"}
                    </span>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        form.amount
                      }
                      disabled={
                        loading ||
                        decisionMode ===
                          "reject"
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            amount:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="h-12 w-full min-w-0 rounded-xl border border-[#143b28] bg-black px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/20 focus:border-[#20dc73] focus:ring-2 focus:ring-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      placeholder="0.00"
                    />

                  </label>

                  {/* CURRENCY */}

                  <label className="min-w-0 text-sm text-white/60">

                    <span className="mb-2 block text-[10px] uppercase tracking-wider text-white/30">
                      Currency
                    </span>

                    {isNegotiationReview ? (

                      <div className="flex h-12 items-center rounded-xl border border-yellow-500/20 bg-yellow-500/[0.04] px-4">

                        <span className="font-semibold text-yellow-300">
                          {form.currency}
                        </span>

                      </div>

                    ) : (

                      <select
                        value={
                          form.currency
                        }
                        disabled={
                          loading ||
                          decisionMode ===
                            "reject"
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              currency:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="h-12 w-full min-w-0 rounded-xl border border-[#143b28] bg-black px-4 text-sm font-semibold text-white outline-none transition focus:border-[#20dc73] focus:ring-2 focus:ring-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >

                        {CURRENCIES.map(
                          (
                            currency,
                          ) => (
                            <option
                              key={
                                currency
                              }
                              value={
                                currency
                              }
                            >
                              {
                                currency
                              }
                            </option>
                          ),
                        )}

                      </select>

                    )}

                    {isNegotiationReview && (
                      <p className="mt-2 text-xs text-yellow-300/50">
                        Negotiation currency is fixed to the client's preferred currency.
                      </p>
                    )}

                  </label>

                  {/* COMPLETION */}

                  <label className="min-w-0 text-sm text-white/60 md:col-span-2">

                    <span className="mb-2 block text-[10px] uppercase tracking-wider text-white/30">
                      Estimated Completion
                    </span>

                    <input
                      type="date"
                      value={
                        form.estimated_completion
                      }
                      disabled={
                        loading ||
                        decisionMode ===
                          "reject"
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            estimated_completion:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="h-12 w-full min-w-0 rounded-xl border border-[#143b28] bg-black px-4 text-sm text-white outline-none transition focus:border-[#20dc73] focus:ring-2 focus:ring-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-40"
                    />

                  </label>

                  {/* REASON */}

                  <label className="min-w-0 text-sm text-white/60 md:col-span-2">

                    <span className="mb-2 block text-[10px] uppercase tracking-wider text-white/30">
                      Decision Reason
                    </span>

                    <textarea
                      value={
                        form.reason
                      }
                      disabled={
                        loading
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            reason:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      rows={5}
                      placeholder={
                        decisionMode ===
                        "negotiated"
                          ? "Explain why the negotiated recommendation is being accepted..."
                          : decisionMode ===
                            "reject"
                          ? "Explain why this request is being rejected..."
                          : "Explain the final pricing and operational decision..."
                      }
                      className="min-h-[130px] w-full min-w-0 resize-y rounded-xl border border-[#143b28] bg-black px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-[#20dc73] focus:ring-2 focus:ring-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-40"
                    />

                  </label>

                  {/* NOTES */}

                  <label className="min-w-0 text-sm text-white/60 md:col-span-2">

                    <span className="mb-2 block text-[10px] uppercase tracking-wider text-white/30">
                      Internal Notes
                    </span>

                    <textarea
                      value={
                        form.notes
                      }
                      disabled={
                        loading
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            notes:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      rows={4}
                      placeholder="Additional internal review notes..."
                      className="min-h-[110px] w-full min-w-0 resize-y rounded-xl border border-[#143b28] bg-black px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-[#20dc73] focus:ring-2 focus:ring-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-40"
                    />

                  </label>

                </div>

              </div>

              {/* =================================================
                  DECISION SUMMARY
                  ================================================= */}

              {decisionMode && (
                <div
                  className={[
                    "rounded-xl border p-4",

                    decisionMode ===
                    "reject"
                      ? "border-red-500/20 bg-red-500/5"
                      : decisionMode ===
                        "adjust"
                      ? "border-yellow-500/20 bg-yellow-500/5"
                      : "border-[#20dc73]/20 bg-[#20dc73]/5",
                  ].join(" ")}
                >

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">

                      <p className="text-[10px] uppercase tracking-wider text-white/30">
                        Final Decision Preview
                      </p>

                      <p className="mt-1 break-words text-sm font-semibold text-white">
                        {decisionMode ===
                        "negotiated"
                          ? "Accept Negotiated Recommendation"
                          : decisionMode ===
                            "admin"
                          ? "Accept Administrator Quote"
                          : decisionMode ===
                            "ai"
                          ? "Accept AI Recommendation"
                          : decisionMode ===
                            "adjust"
                          ? "Submit Adjusted Quote"
                          : "Reject Request"}
                      </p>

                    </div>

                    <div className="shrink-0 sm:text-right">

                      <p className="text-[10px] uppercase tracking-wider text-white/30">
                        Final Amount
                      </p>

                      <p
                        className={[
                          "mt-1 text-lg font-bold",

                          decisionMode ===
                          "reject"
                            ? "text-red-300"
                            : decisionMode ===
                              "adjust"
                            ? "text-yellow-300"
                            : "text-[#20dc73]",
                        ].join(
                          " ",
                        )}
                      >
                        {decisionMode ===
                        "reject"
                          ? "Rejected"
                          : formatMoney(
                              Number(
                                form.amount,
                              ),
                              form.currency,
                            )}
                      </p>

                    </div>

                  </div>

                </div>
              )}

              {/* =================================================
                  ACTIONS
                  ================================================= */}

              <div className="flex flex-col-reverse gap-3 border-t border-[#143b28] pt-6 sm:flex-row sm:flex-wrap sm:justify-end">

                <button
                  type="button"
                  disabled={
                    loading ||
                    decisionMode !==
                      "reject"
                  }
                  onClick={() =>
                    void submit(
                      "reject",
                    )
                  }
                  className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/20"
                >
                  {loading &&
                  decisionMode ===
                    "reject"
                    ? "Rejecting..."
                    : "Reject Request"}
                </button>

                <button
                  type="button"
                  disabled={
                    loading ||
                    decisionMode !==
                      "adjust"
                  }
                  onClick={() =>
                    void submit(
                      "adjust",
                    )
                  }
                  className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-5 py-3 text-sm font-semibold text-yellow-300 transition hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/20"
                >
                  {loading &&
                  decisionMode ===
                    "adjust"
                    ? "Adjusting..."
                    : isNegotiationReview
                      ? "Submit Negotiated Adjustment"
                      : "Submit Adjustment"}
                </button>

                <button
                  type="button"
                  disabled={
                    loading ||
                    !(
                      decisionMode ===
                        "admin" ||
                      decisionMode ===
                        "ai" ||
                      decisionMode ===
                        "negotiated"
                    )
                  }
                  onClick={() =>
                    void submit(
                      "accept",
                    )
                  }
                  className="rounded-xl bg-[#20dc73] px-6 py-3 text-sm font-bold text-black shadow-lg shadow-[#20dc73]/10 transition hover:bg-[#32ef82] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/20 disabled:shadow-none"
                >
                  {loading &&
                  (
                    decisionMode ===
                      "admin" ||
                    decisionMode ===
                      "ai" ||
                    decisionMode ===
                      "negotiated"
                  )
                    ? "Approving..."
                    : decisionMode ===
                      "negotiated"
                    ? "Accept Negotiated Recommendation"
                    : decisionMode ===
                      "admin"
                    ? "Accept Administrator Quote"
                    : decisionMode ===
                      "ai"
                    ? "Accept AI Recommendation"
                    : "Select Approval Path"}
                </button>

              </div>

              {!decisionMode && (
                <p className="text-center text-xs text-white/25">
                  Select a decision path above to continue.
                </p>
              )}

            </>

          ) : (

            /*
             * =================================================
             * NO CURRENT ACTION
             * =================================================
             */

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">

              <div className="flex gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 text-xl text-white/40">
                  ✓
                </div>

                <div className="min-w-0">

                  <h4 className="text-lg font-bold text-white">
                    No Active Decision
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-white/50">
                    This request is not currently awaiting
                    Super Administrator review.
                    Any previous decision remains part of
                    the permanent governance record.
                  </p>

                  <div className="mt-6 rounded-xl border border-[#143b28] bg-black/40 p-5">

                    <p className="text-[10px] uppercase tracking-wider text-white/30">
                      Current Status
                    </p>

                    <p className="mt-2 text-sm font-bold uppercase text-[#20dc73]">
                      {statusLabel(
                        request.status,
                      )}
                    </p>

                    {request.super_admin_quote_action && (
                      <div className="mt-5">

                        <p className="text-[10px] uppercase tracking-wider text-white/30">
                          Decision
                        </p>

                        <p className="mt-2 text-sm font-bold uppercase text-[#20dc73]">
                          {statusLabel(
                            request.super_admin_quote_action,
                          )}
                        </p>

                      </div>
                    )}

                    <div className="mt-5">

                      <p className="text-[10px] uppercase tracking-wider text-white/30">
                        Final Amount
                      </p>

                      <p className="mt-2 text-xl font-bold text-white">
                        {formatMoney(
                          request.approved_quote_amount,
                          request.approved_quote_currency ||
                            request.preferred_currency ||
                            "USD",
                        )}
                      </p>

                    </div>

                    <div className="mt-5">

                      <p className="text-[10px] uppercase tracking-wider text-white/30">
                        Estimated Completion
                      </p>

                      <p className="mt-2 text-sm text-white/70">
                        {formatDate(
                          request.approved_estimated_completion,
                        )}
                      </p>

                    </div>

                    <div className="mt-5">

                      <p className="text-[10px] uppercase tracking-wider text-white/30">
                        Decision Reason
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/70">
                        {request.super_admin_quote_notes ||
                          request.approved_quote_notes ||
                          "No reason provided"}
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          )}

        </div>

      </section>

    </div>
  )
}