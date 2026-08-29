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
  if (amount == null) {
    return "Not available"
  }

  return `${currency} ${Number(
    amount,
  ).toLocaleString()}`
}

function formatDate(
  date: string | null | undefined,
) {
  if (!date) {
    return "Not specified"
  }

  const parsed = new Date(date)

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

  const number = Number(value)

  return number <= 1
    ? number * 100
    : number
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
      (details as {
        reason?: unknown
      }).reason ??
        "No reason provided",
    )
  }

  return "No reason provided"
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
   *
   * This is controlled ONLY by the URL.
   *
   * /dashboard/requests/[id]?history=true
   *
   * When true:
   *
   * - show the request information
   * - show quote history
   * - show audit history
   * - show negotiation history
   * - NEVER show active decision controls
   */

  const isHistoryView =
    searchParams.get("history") === "true"

  /*
   * =========================================================
   * LATEST ADMINISTRATOR QUOTE
   * =========================================================
   */

  const latestAdminQuote =
    [...quoteHistory]
      .filter((quote) => {
        const source =
          quote.source
            ?.trim()
            .toLowerCase()

        const role =
          quote.creator_role
            ?.trim()
            .toLowerCase()

        return (
          source ===
            "administrator" ||
          source ===
            "administrator_proposal" ||
          role ===
            "administrator"
        )
      })
      .sort(
        (a, b) =>
          (b.version_number ?? 0) -
          (a.version_number ?? 0),
      )[0] ?? null

  /*
   * =========================================================
   * CURRENT SUPER ADMIN STATE
   * =========================================================
   *
   * IMPORTANT:
   *
   * History does NOT determine this.
   *
   * Only the current request status does.
   */

  const normalizedStatus =
    request.status
      ?.trim()
      .toLowerCase() || ""

  const superAdminCanAct =
    normalizedStatus ===
    "pending_super_admin_review"

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

  const [form, setForm] = useState({
    amount:
      latestAdminQuote?.price !=
      null
        ? String(
            latestAdminQuote.price,
          )
        : request.approved_quote_amount !=
            null
          ? String(
              request.approved_quote_amount,
            )
          : "",

    currency:
      latestAdminQuote?.currency ||
      request.approved_quote_currency ||
      "USD",

    notes: "",

    reason: "",

    estimated_completion:
      latestAdminQuote?.estimated_completion ||
      request.approved_estimated_completion ||
      "",
  })

  /*
   * =========================================================
   * SUPER ADMIN HISTORY
   * =========================================================
   */

  const superAdminHistory =
    auditHistory.filter((event) =>
      [
        "super admin approved final quote",
        "super administrator approved final quote",
        "super admin adjusted quote",
        "super administrator adjusted quote",
        "super admin rejected request",
        "super_admin_approved_final_quote",
        "super_admin_rejected_quote",
      ].includes(
        event.action
          .trim()
          .toLowerCase(),
      ),
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

    setDecisionMode("admin")

    setForm((current) => ({
      ...current,

      amount:
        latestAdminQuote?.price !=
        null
          ? String(
              latestAdminQuote.price,
            )
          : request.approved_quote_amount !=
              null
            ? String(
                request.approved_quote_amount,
              )
            : current.amount,

      currency:
        latestAdminQuote?.currency ||
        request.approved_quote_currency ||
        "USD",

      reason:
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
   * SELECT AI QUOTE
   * =========================================================
   */

  function selectAIQuote() {
    if (!superAdminCanAct) {
      return
    }

    setDecisionMode("ai")

    setForm((current) => ({
      ...current,

      amount:
        request.ai_price_estimate !=
        null
          ? String(
              request.ai_price_estimate,
            )
          : aiQuote?.price !=
              null
            ? String(
                aiQuote.price,
              )
            : current.amount,

      currency:
        aiQuote?.currency ||
        "USD",

      reason:
        request.ai_reasoning ||
        aiQuote?.reasoning ||
        "",

      notes:
        aiQuote?.notes ||
        "",

      estimated_completion:
        aiQuote?.estimated_completion ||
        current.estimated_completion,
    }))
  }

  /*
   * =========================================================
   * ADJUST
   * =========================================================
   */

  function selectAdjustment() {
    if (!superAdminCanAct) {
      return
    }

    setDecisionMode("adjust")

    setForm((current) => ({
      ...current,
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
   * SUBMIT FINAL DECISION
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
       * Never submit from history.
       */

      if (isHistoryView) {
        throw new Error(
          "Historical requests cannot be modified.",
        )
      }

      /*
       * Current status must still be awaiting
       * Super Administrator review.
       */

      if (!superAdminCanAct) {
        throw new Error(
          "This request is not currently awaiting Super Administrator review.",
        )
      }

      /*
       * Reason is mandatory.
       */

      const reason =
        form.reason.trim()

      if (!reason) {
        throw new Error(
          "Please provide a decision reason.",
        )
      }

      /*
       * Reject does not need quote amount validation.
       */

      if (
        action !== "reject"
      ) {
        const amount =
          Number(form.amount)

        if (
          !Number.isFinite(
            amount,
          ) ||
          amount <= 0
        ) {
          throw new Error(
            "Please enter a valid quote amount.",
          )
        }

        if (
          !form.currency ||
          !CURRENCIES.includes(
            form.currency,
          )
        ) {
          throw new Error(
            "Please select a valid quote currency.",
          )
        }
      }

      /*
       * Completion is required for
       * accepted/adjusted quotes.
       */

      if (
        action !== "reject" &&
        !form.estimated_completion
      ) {
        throw new Error(
          "Estimated completion date is required.",
        )
      }

      /*
       * =====================================================
       * PAYLOAD
       * =====================================================
       */

      const payload = {
        decision_action:
          action,

        decision_source:
          decisionMode,

        quote:
          action ===
          "reject"
            ? undefined
            : {
                amount:
                  Number(
                    form.amount,
                  ),

                currency:
                  form.currency,

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
        },
      }

      /*
       * =====================================================
       * API
       * =====================================================
       */

      const response =
        await fetch(
          `/api/admin/requests/${request.id}/super-admin-review`,
          {
            method: "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload,
            ),
          },
        )

      let data: {
        error?: string
        message?: string
      } = {}

      try {
        data =
          await response.json()
      } catch {
        data = {}
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Super Administrator review failed.",
        )
      }

      /*
       * Return to active request
       * list after final decision.
       */

      router.push(
        "/dashboard/requests",
      )

      router.refresh()
    } catch (error) {
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
              Service Type
            </p>

            <p className="mt-2 break-words text-sm text-white">
              {request.service_type ||
                "Not specified"}
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
                ? `USD ${Number(
                    request.ai_price_estimate,
                  ).toLocaleString()}`
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
              Status
            </p>

            <p className="mt-2 text-sm font-semibold uppercase text-[#20dc73]">
              {latestAdminQuote
                ? statusLabel(
                    latestAdminQuote.status ??
                      "submitted",
                  )
                : "Pending"}
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
              {latestAdminQuote?.estimated_completion ||
                request.approved_estimated_completion ||
                "Not specified"}
            </p>

          </div>

        </div>

      </section>

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

          {quoteHistory.length === 0 ? (
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

                      {quote.estimated_completion && (
                        <span>
                          Completion:{" "}
                          {
                            quote.estimated_completion
                          }
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

          {auditHistory.length === 0 ? (
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

        <div className="border-b border-[#143b28] px-5 py-5 md:px-6">

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#20dc73]">
            Super Administrator History
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            Previous Final Authority Actions
          </h3>

          <p className="mt-1 text-sm text-white/40">
            Actions previously performed by the Super Administrator role.
          </p>

        </div>

        <div className="p-5 md:p-6">

          {superAdminHistory.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center">

              <p className="text-sm text-white/40">
                No Super Administrator decisions recorded yet.
              </p>

            </div>
          ) : (
            <div className="space-y-4">

              {superAdminHistory.map(
                (action) => (
                  <div
                    key={action.id}
                    className="rounded-xl border border-[#143b28] bg-black/30 p-5"
                  >

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      <div>

                        <p className="font-semibold text-white">
                          {statusLabel(
                            action.action,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-white/30">
                          {formatDate(
                            action.created_at,
                          )}
                        </p>

                      </div>

                    </div>

                    <div className="mt-5">

                      <p className="text-xs uppercase tracking-wider text-white/30">
                        Reason
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/70">
                        {getAuditReason(
                          action.details,
                        )}
                      </p>

                    </div>

                    {action.details !=
                      null && (
                      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-white/5 bg-black/60 p-4 font-mono text-xs leading-5 text-white/40">
                        {typeof action.details ===
                        "string"
                          ? action.details
                          : JSON.stringify(
                              action.details,
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
          FINAL AUTHORITY ACTION AREA
          =====================================================
          
          THIS IS THE CRITICAL PART.

          Exactly ONE condition controls the action form:

          1. History view:
             show historical message only

          2. Current pending review:
             show complete active form

          3. Everything else:
             show completed/no-action state

          There is NO duplicate decision form outside
          this conditional.
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
            Final governance decision for the request.
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
                            "USD",
                        )}
                      </p>

                    </div>

                    <div className="mt-5">

                      <p className="text-[10px] uppercase tracking-wider text-white/30">
                        Estimated Completion
                      </p>

                      <p className="mt-2 text-sm text-white/70">
                        {request.approved_estimated_completion ||
                          latestAdminQuote?.estimated_completion ||
                          "Not specified"}
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

            /*
             * =================================================
             * ACTIVE FORM
             * =================================================
             */

            <>

              {/* ===============================================
                  DECISION SOURCE
                  =============================================== */}

              <div>

                <div className="mb-4">

                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    Select Decision Path
                  </p>

                  <p className="mt-1 text-sm text-white/30">
                    Choose the recommendation you want to act on,
                    or create a custom adjustment.
                  </p>

                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">

                  {/* ADMIN */}

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
                    ].join(
                      " ",
                    )}
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
                      Use the administrator's submitted quote.
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
                    ].join(
                      " ",
                    )}
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
                        request.ai_price_estimate,
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
                        ? "border-[#20dc73]/50 bg-[#20dc73]/10 shadow-lg shadow-[#20dc73]/5"
                        : "border-[#143b28] bg-black/30 hover:border-[#20dc73]/30 hover:bg-[#20dc73]/5",
                    ].join(
                      " ",
                    )}
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-300">
                        ↔
                      </div>

                      {decisionMode ===
                        "adjust" && (
                        <span className="text-[#20dc73]">
                          ✓
                        </span>
                      )}

                    </div>

                    <p className="mt-4 font-semibold text-white">
                      Adjust Quote
                    </p>

                    <p className="mt-1 text-xs leading-5 text-white/35">
                      Set a custom amount, currency,
                      date and reasoning.
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
                    ].join(
                      " ",
                    )}
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
                      Decline the proposed quote and request.
                    </p>

                    <p className="mt-3 text-sm font-bold text-red-300">
                      Final rejection
                    </p>

                  </button>

                </div>

              </div>

              {/* ===============================================
                  DECISION EDITOR
                  =============================================== */}

              <div className="rounded-2xl border border-[#143b28] bg-black/30">

                <div className="border-b border-[#143b28] px-5 py-4">

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                        Decision Editor
                      </p>

                      <p className="mt-1 font-semibold text-white">

                        {decisionMode ===
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
                      <span className="rounded-full border border-[#20dc73]/20 bg-[#20dc73]/5 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#20dc73]">
                        {
                          decisionMode
                        }
                      </span>
                    )}

                  </div>

                </div>

                <div className="grid gap-5 p-5 md:grid-cols-2">

                  {/* AMOUNT */}

                  <label className="min-w-0 text-sm text-white/60">

                    <span className="mb-2 block text-[10px] uppercase tracking-wider text-white/30">
                      Approved Quote Amount
                    </span>

                    <input
                      type="number"
                      min="0"
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

              {/* ===============================================
                  DECISION SUMMARY
                  =============================================== */}

              {decisionMode && (
                <div
                  className={[
                    "rounded-xl border p-4",
                    decisionMode ===
                    "reject"
                      ? "border-red-500/20 bg-red-500/5"
                      : "border-[#20dc73]/20 bg-[#20dc73]/5",
                  ].join(
                    " ",
                  )}
                >

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">

                      <p className="text-[10px] uppercase tracking-wider text-white/30">
                        Final Decision Preview
                      </p>

                      <p className="mt-1 break-words text-sm font-semibold text-white">

                        {decisionMode ===
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

              {/* ===============================================
                  ACTIONS
                  =============================================== */}

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
                        "ai"
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
                      "ai"
                  )
                    ? "Approving..."
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
                            "USD",
                        )}
                      </p>

                    </div>

                    <div className="mt-5">

                      <p className="text-[10px] uppercase tracking-wider text-white/30">
                        Estimated Completion
                      </p>

                      <p className="mt-2 text-sm text-white/70">
                        {request.approved_estimated_completion ||
                          latestAdminQuote?.estimated_completion ||
                          "Not specified"}
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