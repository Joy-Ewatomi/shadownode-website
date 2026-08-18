import { getCurrentUser } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { query } from "@/lib/db"

import AdminRequestReviewCard from "@/components/requests/AdminRequestReviewCard"
import SuperAdminRequestReviewCard from "@/components/requests/SuperAdminRequestReviewCard"
import RequestReviewCard from "@/components/requests/RequestReviewCard"

type RequestData = {
  id: string
  case_number: string | null
  title: string | null
  service_type: string | null
  category: "osint" | "cybersecurity" | null
  description: string | null
  investigation_objective: string | null

  status: string
  priority: string | null

  ai_price_estimate: number | null
  ai_complexity: string | null
  ai_confidence: number | null
  ai_reasoning: string | null
  ai_analysis: string | null

  client_email: string | null
  client_username?: string | null

  approved_quote_amount: number | null
  approved_quote_currency: string | null
  approved_quote_notes: string | null
  approved_estimated_completion: string | null

  admin_quote_action: string | null
  admin_quote_notes: string | null
  admin_reviewed_by: string | null
  admin_reviewed_at: string | null

  super_admin_quote_action: string | null
  super_admin_quote_notes: string | null
  super_admin_reviewed_by: string | null
  super_admin_reviewed_at: string | null

  updated_at: string | null

  training_preferred_start_date: string | null
  training_preferred_completion_date: string | null

  quote_sent_at: string | null
  client_decision_at: string | null

  created_at: string | null

  [key: string]: unknown
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
  reasoning: string | null
  notes: string | null
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

type NegotiationEvent = {
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

// =========================================================
// SAFE DATE HELPERS
// =========================================================

function toISOString(value: unknown): string | null {
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    !(value instanceof Date)
  ) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

function toDateOnly(value: unknown): string | null {
  const iso = toISOString(value)

  return iso ? iso.slice(0, 10) : null
}

// =========================================================
// SAFE NUMBER HELPER
// =========================================================

function toNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number) ? number : null
}

// =========================================================
// PAGE
// =========================================================

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  // =======================================================
  // AUTHENTICATION
  // =======================================================

  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  // =======================================================
  // ROLE ACCESS
  // =======================================================

  const allowedRoles = [
    "administrator",
    "super_administrator",
    "client",
  ]

  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard")
  }

  // =======================================================
  // REQUEST ID
  // =======================================================

  const { id } = await params

  // =======================================================
  // LOAD COMPLETE REQUEST
  // =======================================================

  const result = await query(
    `
      SELECT
        r.*,
        u.username AS client_username,
        u.email AS client_email

      FROM requests r

      LEFT JOIN app_users u
        ON u.id = r.user_id

      WHERE r.id = $1

      LIMIT 1
    `,
    [id],
  )

  const rawRequest = result.rows[0]

  if (!rawRequest) {
    notFound()
  }

  // =======================================================
  // NORMALIZE REQUEST
  // =======================================================

  const request: RequestData = {
    ...rawRequest,

    id: String(rawRequest.id),

    case_number:
      rawRequest.case_number !== null &&
      rawRequest.case_number !== undefined
        ? String(rawRequest.case_number)
        : null,

    title:
      rawRequest.title !== null &&
      rawRequest.title !== undefined
        ? String(rawRequest.title)
        : null,

    service_type:
      rawRequest.service_type !== null &&
      rawRequest.service_type !== undefined
        ? String(rawRequest.service_type)
        : null,

    category:
      rawRequest.category === "osint" ||
      rawRequest.category === "cybersecurity"
        ? rawRequest.category
        : null,

    description:
      rawRequest.description !== null &&
      rawRequest.description !== undefined
        ? String(rawRequest.description)
        : null,

    investigation_objective:
      rawRequest.investigation_objective !== null &&
      rawRequest.investigation_objective !== undefined
        ? String(rawRequest.investigation_objective)
        : null,

    status: String(rawRequest.status ?? ""),

    priority:
      rawRequest.priority !== null &&
      rawRequest.priority !== undefined
        ? String(rawRequest.priority)
        : null,

    client_email:
      rawRequest.client_email !== null &&
      rawRequest.client_email !== undefined
        ? String(rawRequest.client_email)
        : null,

    client_username:
      rawRequest.client_username !== null &&
      rawRequest.client_username !== undefined
        ? String(rawRequest.client_username)
        : null,

    ai_complexity:
      rawRequest.ai_complexity !== null &&
      rawRequest.ai_complexity !== undefined
        ? String(rawRequest.ai_complexity)
        : null,

    ai_reasoning:
      rawRequest.ai_reasoning !== null &&
      rawRequest.ai_reasoning !== undefined
        ? String(rawRequest.ai_reasoning)
        : null,

    ai_analysis:
      rawRequest.ai_analysis !== null &&
      rawRequest.ai_analysis !== undefined
        ? String(rawRequest.ai_analysis)
        : null,

    ai_price_estimate: toNumber(
      rawRequest.ai_price_estimate,
    ),

    ai_confidence: toNumber(
      rawRequest.ai_confidence,
    ),

    approved_quote_amount: toNumber(
      rawRequest.approved_quote_amount,
    ),

    approved_quote_currency:
      rawRequest.approved_quote_currency !== null &&
      rawRequest.approved_quote_currency !== undefined
        ? String(rawRequest.approved_quote_currency)
        : null,

    approved_quote_notes:
      rawRequest.approved_quote_notes !== null &&
      rawRequest.approved_quote_notes !== undefined
        ? String(rawRequest.approved_quote_notes)
        : null,

    approved_estimated_completion:
      toDateOnly(
        rawRequest.approved_estimated_completion,
      ),

    admin_quote_action:
      rawRequest.admin_quote_action !== null &&
      rawRequest.admin_quote_action !== undefined
        ? String(rawRequest.admin_quote_action)
        : null,

    admin_quote_notes:
      rawRequest.admin_quote_notes !== null &&
      rawRequest.admin_quote_notes !== undefined
        ? String(rawRequest.admin_quote_notes)
        : null,

    admin_reviewed_by:
      rawRequest.admin_reviewed_by !== null &&
      rawRequest.admin_reviewed_by !== undefined
        ? String(rawRequest.admin_reviewed_by)
        : null,

    admin_reviewed_at:
      toISOString(
        rawRequest.admin_reviewed_at,
      ),

    super_admin_quote_action:
      rawRequest.super_admin_quote_action !== null &&
      rawRequest.super_admin_quote_action !== undefined
        ? String(rawRequest.super_admin_quote_action)
        : null,

    super_admin_quote_notes:
      rawRequest.super_admin_quote_notes !== null &&
      rawRequest.super_admin_quote_notes !== undefined
        ? String(rawRequest.super_admin_quote_notes)
        : null,

    super_admin_reviewed_by:
      rawRequest.super_admin_reviewed_by !== null &&
      rawRequest.super_admin_reviewed_by !== undefined
        ? String(rawRequest.super_admin_reviewed_by)
        : null,

    super_admin_reviewed_at:
      toISOString(
        rawRequest.super_admin_reviewed_at,
      ),

    training_preferred_start_date:
      toDateOnly(
        rawRequest.training_preferred_start_date,
      ),

    training_preferred_completion_date:
      toDateOnly(
        rawRequest.training_preferred_completion_date,
      ),

    quote_sent_at:
      toISOString(
        rawRequest.quote_sent_at,
      ),

    client_decision_at:
      toISOString(
        rawRequest.client_decision_at,
      ),

    created_at:
      toISOString(
        rawRequest.created_at,
      ),

    updated_at:
      toISOString(
        rawRequest.updated_at,
      ),
  }

  // =======================================================
  // SERIALIZE REQUEST
  // =======================================================

  const serializedRequest = JSON.parse(
    JSON.stringify(request),
  )

  // =======================================================
  // LOAD QUOTE HISTORY
  // =======================================================

  const quotesResult = await query(
    `
      SELECT
        id,
        request_id,
        version_number,
        created_by,
        creator_role,
        source,
        price,
        currency,
        estimated_completion,
        reasoning,
        notes,
        status,
        created_at

      FROM quote_versions

      WHERE request_id = $1

      ORDER BY version_number DESC
    `,
    [id],
  )

  const quoteVersions: QuoteVersion[] =
    quotesResult.rows.map(
      (quote: Record<string, unknown>) => ({
        id: String(quote.id),

        request_id: String(
          quote.request_id,
        ),

        version_number:
          Number(
            quote.version_number,
          ) || 0,

        created_by:
          quote.created_by !== null &&
          quote.created_by !== undefined
            ? String(quote.created_by)
            : null,

        creator_role:
          quote.creator_role !== null &&
          quote.creator_role !== undefined
            ? String(quote.creator_role)
            : null,

        source: String(
          quote.source ?? "",
        ),

        price: toNumber(
          quote.price,
        ),

        currency:
          quote.currency !== null &&
          quote.currency !== undefined
            ? String(quote.currency)
            : null,

        estimated_completion:
          toDateOnly(
            quote.estimated_completion,
          ),

        reasoning:
          quote.reasoning !== null &&
          quote.reasoning !== undefined
            ? String(quote.reasoning)
            : null,

        notes:
          quote.notes !== null &&
          quote.notes !== undefined
            ? String(quote.notes)
            : null,

        status:
          quote.status !== null &&
          quote.status !== undefined
            ? String(quote.status)
            : null,

        created_at:
          toISOString(
            quote.created_at,
          ),
      }),
    )

  // =======================================================
  // FIND IMPORTANT QUOTES
  // =======================================================

  const adminQuote =
    quoteVersions.find(
      (quote) =>
        quote.source ===
        "administrator",
    ) ?? null

  const aiQuote =
    quoteVersions.find(
      (quote) =>
        quote.source === "ai",
    ) ?? null

  // =======================================================
  // SUPER ADMIN HISTORY
  // =======================================================

  let auditHistory: AuditEvent[] = []

  let negotiationHistory: NegotiationEvent[] = []

  if (
    user.role ===
    "super_administrator"
  ) {
    // =====================================================
    // AUDIT HISTORY
    // =====================================================

    const auditResult = await query(
      `
        SELECT
          id,
          actor_user_id,
          action,
          details,
          created_at

        FROM request_audit_events

        WHERE request_id = $1

        ORDER BY created_at ASC
      `,
      [id],
    )

    auditHistory =
      auditResult.rows.map(
        (
          item: Record<string, unknown>,
        ) => ({
          id: String(item.id),

          actor_user_id:
            item.actor_user_id !== null &&
            item.actor_user_id !== undefined
              ? String(
                  item.actor_user_id,
                )
              : null,

          action: String(
            item.action ?? "",
          ),

          details:
            item.details ?? null,

          created_at:
            toISOString(
              item.created_at,
            ),
        }),
      )

    // =====================================================
    // NEGOTIATION HISTORY
    // =====================================================

    const negotiationResult =
      await query(
        `
          SELECT
            id,
            request_id,
            client_id,
            assigned_reviewer_id,

            round_number,
            status,

            original_ai_estimate,
            original_quote_amount,
            quote_currency,

            requested_budget,
            client_reason,
            client_notes,

            administrator_recommendation,
            revised_quote_amount,

            owner_approver_id,
            owner_decision,
            owner_decision_notes,

            decided_at,
            created_at,
            updated_at

          FROM quote_negotiations

          WHERE request_id = $1

          ORDER BY
            round_number ASC NULLS LAST,
            created_at ASC
        `,
        [id],
      )

    negotiationHistory =
      negotiationResult.rows.map(
        (
          item: Record<string, unknown>,
        ): NegotiationEvent => ({
          id: String(item.id),

          request_id: String(
            item.request_id,
          ),

          client_id:
            item.client_id !== null &&
            item.client_id !== undefined
              ? String(item.client_id)
              : null,

          assigned_reviewer_id:
            item.assigned_reviewer_id !== null &&
            item.assigned_reviewer_id !== undefined
              ? String(
                  item.assigned_reviewer_id,
                )
              : null,

          round_number:
            item.round_number !== null &&
            item.round_number !== undefined
              ? Number(
                  item.round_number,
                )
              : null,

          status:
            item.status !== null &&
            item.status !== undefined
              ? String(item.status)
              : null,

          original_ai_estimate:
            toNumber(
              item.original_ai_estimate,
            ),

          original_quote_amount:
            toNumber(
              item.original_quote_amount,
            ),

          quote_currency:
            item.quote_currency !== null &&
            item.quote_currency !== undefined
              ? String(
                  item.quote_currency,
                )
              : null,

          requested_budget:
            toNumber(
              item.requested_budget,
            ),

          client_reason:
            item.client_reason !== null &&
            item.client_reason !== undefined
              ? String(
                  item.client_reason,
                )
              : null,

          client_notes:
            item.client_notes !== null &&
            item.client_notes !== undefined
              ? String(
                  item.client_notes,
                )
              : null,

          administrator_recommendation:
            item.administrator_recommendation !== null &&
            item.administrator_recommendation !== undefined
              ? String(
                  item.administrator_recommendation,
                )
              : null,

          revised_quote_amount:
            toNumber(
              item.revised_quote_amount,
            ),

          owner_approver_id:
            item.owner_approver_id !== null &&
            item.owner_approver_id !== undefined
              ? String(
                  item.owner_approver_id,
                )
              : null,

          owner_decision:
            item.owner_decision !== null &&
            item.owner_decision !== undefined
              ? String(
                  item.owner_decision,
                )
              : null,

          owner_decision_notes:
            item.owner_decision_notes !== null &&
            item.owner_decision_notes !== undefined
              ? String(
                  item.owner_decision_notes,
                )
              : null,

          decided_at:
            toISOString(
              item.decided_at,
            ),

          created_at:
            toISOString(
              item.created_at,
            ),

          updated_at:
            toISOString(
              item.updated_at,
            ),
        }),
      )
  }

  // =======================================================
  // FINAL SERIALIZATION
  // =======================================================

  const finalRequest = JSON.parse(
    JSON.stringify(request),
  )

  // =======================================================
  // PAGE
  // =======================================================

  return (
    <div className="min-w-0 space-y-6">

      {/* =================================================
          HEADER
          ================================================= */}

      <header className="min-w-0 border-b border-[#143b28] pb-6">

        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
          Request Investigation
        </p>

        <h1 className="mt-2 break-words text-3xl font-bold text-white">
          {request.title ||
            "Untitled Request"}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-3">

          <span className="text-sm text-white/50">
            {request.case_number ||
              "No case number"}
          </span>

          <span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs uppercase text-[#20dc73]">
            {request.status}
          </span>

          {request.priority && (
            <span className="rounded border border-white/10 px-2 py-1 text-xs uppercase text-white/50">
              {request.priority}
            </span>
          )}

        </div>

      </header>

      {/* =================================================
          ROLE-SPECIFIC REQUEST WORKFLOW
          ================================================= */}

      <section className="min-w-0 overflow-hidden rounded-md border border-[#143b28] bg-[#06110f] p-5 sm:p-6">

        <div className="mb-6 border-b border-white/10 pb-5">

          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
            Request Actions
          </p>

          <p className="mt-2 text-sm text-white/50">
            Role-specific workflow actions
            for this request.
          </p>

        </div>

        {/* ===============================================
            SUPER ADMINISTRATOR
            =============================================== */}

        {user.role ===
          "super_administrator" && (
          <div className="min-w-0 max-w-full overflow-hidden">

            <SuperAdminRequestReviewCard
              request={
                finalRequest
              }
              aiQuote={
                aiQuote
              }
              adminQuote={
                adminQuote
              }
              quoteHistory={
                quoteVersions
              }
              auditHistory={
                auditHistory
              }
              negotiationHistory={
                negotiationHistory
              }
            />

          </div>
        )}

        {/* ===============================================
            ADMINISTRATOR
            =============================================== */}

        {user.role ===
          "administrator" && (
          <div className="min-w-0 max-w-full overflow-hidden">

            <AdminRequestReviewCard
              request={
                finalRequest
              }
            />

          </div>
        )}

        {/* ===============================================
            CLIENT
            =============================================== */}

        {user.role ===
          "client" && (
          <div className="min-w-0 max-w-full overflow-hidden">

            <RequestReviewCard
              request={
                finalRequest
              }
            />

          </div>
        )}

      </section>

    </div>
  )
}