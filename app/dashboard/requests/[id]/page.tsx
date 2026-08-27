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
  supporting_links?: unknown
  evidence_uploads?: unknown
  evidence_files?: unknown
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

type WorkflowHistoryEvent = {
  id: string
  request_id: string | null
  case_id: string | null
  quote_version_id: string | null
  performed_by: string | null
  performer_role: string | null
  action: string | null
  description: string | null
  metadata: unknown
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
// ROLE-SPECIFIC ACTION STATE
// =========================================================

function getActionRequired(
  role: string,
  request: RequestData,
): boolean {
  /*
   * IMPORTANT:
   *
   * We are deliberately not inventing a new
   * action_required database column.
   *
   * The final pending conditions should match
   * the status values already produced by your
   * request workflow.
   *
   * These are conservative fallbacks based on
   * the fields already present in requests.
   */

  if (role === "administrator") {
    return (
      request.status === "submitted" ||
      request.status === "pending_admin_review" ||
      request.status === "admin_review_required"
    )
  }

  if (role === "super_administrator") {
    return (
      request.status ===
        "awaiting_super_admin_review" ||
      request.status ===
        "pending_super_admin_review" ||
      request.status ===
        "quote_pending_approval" ||
      request.status ===
        "negotiation_pending_approval"
    )
  }

  return false
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
// MARK REQUEST NOTIFICATIONS AS READ
//
// Any unread notification belonging to the current user
// and associated with this request is marked as read.
//
// This works regardless of whether the request was opened
// from the notification bell, request sidebar, dashboard
// widget, history page, or direct URL.
// =======================================================

await query(
  `
    UPDATE notifications
    SET is_read = true
    WHERE user_id = $1
      AND is_read = false
      AND (
        metadata->>'request_id' = $2
        OR metadata->>'requestId' = $2
      )
  `,
  [user.id, id],
)

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

    evidence_uploads:
  Array.isArray(rawRequest.evidence_uploads)
    ? rawRequest.evidence_uploads
    : [],    

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
        ? String(
            rawRequest.investigation_objective,
          )
        : null,

    status: String(
      rawRequest.status ?? "",
    ),

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

    ai_price_estimate:
      toNumber(
        rawRequest.ai_price_estimate,
      ),

    ai_confidence:
      toNumber(
        rawRequest.ai_confidence,
      ),

    approved_quote_amount:
      toNumber(
        rawRequest.approved_quote_amount,
      ),

    approved_quote_currency:
      rawRequest.approved_quote_currency !== null &&
      rawRequest.approved_quote_currency !== undefined
        ? String(
            rawRequest.approved_quote_currency,
          )
        : null,

    approved_quote_notes:
      rawRequest.approved_quote_notes !== null &&
      rawRequest.approved_quote_notes !== undefined
        ? String(
            rawRequest.approved_quote_notes,
          )
        : null,

    approved_estimated_completion:
      toDateOnly(
        rawRequest.approved_estimated_completion,
      ),

    admin_quote_action:
      rawRequest.admin_quote_action !== null &&
      rawRequest.admin_quote_action !== undefined
        ? String(
            rawRequest.admin_quote_action,
          )
        : null,

    admin_quote_notes:
      rawRequest.admin_quote_notes !== null &&
      rawRequest.admin_quote_notes !== undefined
        ? String(
            rawRequest.admin_quote_notes,
          )
        : null,

    admin_reviewed_by:
      rawRequest.admin_reviewed_by !== null &&
      rawRequest.admin_reviewed_by !== undefined
        ? String(
            rawRequest.admin_reviewed_by,
          )
        : null,

    admin_reviewed_at:
      toISOString(
        rawRequest.admin_reviewed_at,
      ),

    super_admin_quote_action:
      rawRequest.super_admin_quote_action !== null &&
      rawRequest.super_admin_quote_action !== undefined
        ? String(
            rawRequest.super_admin_quote_action,
          )
        : null,

    super_admin_quote_notes:
      rawRequest.super_admin_quote_notes !== null &&
      rawRequest.super_admin_quote_notes !== undefined
        ? String(
            rawRequest.super_admin_quote_notes,
          )
        : null,

    super_admin_reviewed_by:
      rawRequest.super_admin_reviewed_by !== null &&
      rawRequest.super_admin_reviewed_by !== undefined
        ? String(
            rawRequest.super_admin_reviewed_by,
          )
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
  // QUOTE HISTORY
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

      ORDER BY
        version_number DESC,
        created_at DESC
    `,
    [id],
  )

  const quoteVersions: QuoteVersion[] =
    quotesResult.rows.map(
      (
        quote: Record<string, unknown>,
      ) => ({
        id: String(quote.id),

        request_id:
          String(quote.request_id),

        version_number:
          Number(
            quote.version_number,
          ) || 0,

        created_by:
          quote.created_by !== null &&
          quote.created_by !== undefined
            ? String(
                quote.created_by,
              )
            : null,

        creator_role:
          quote.creator_role !== null &&
          quote.creator_role !== undefined
            ? String(
                quote.creator_role,
              )
            : null,

        source:
          String(
            quote.source ?? "",
          ),

        price:
          toNumber(
            quote.price,
          ),

        currency:
          quote.currency !== null &&
          quote.currency !== undefined
            ? String(
                quote.currency,
              )
            : null,

        estimated_completion:
          toDateOnly(
            quote.estimated_completion,
          ),

        reasoning:
          quote.reasoning !== null &&
          quote.reasoning !== undefined
            ? String(
                quote.reasoning,
              )
            : null,

        notes:
          quote.notes !== null &&
          quote.notes !== undefined
            ? String(
                quote.notes,
              )
            : null,

        status:
          quote.status !== null &&
          quote.status !== undefined
            ? String(
                quote.status,
              )
            : null,

        created_at:
          toISOString(
            quote.created_at,
          ),
      }),
    )

  // =======================================================
  // IMPORTANT QUOTES
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
  // ROLE-SPECIFIC WORKFLOW HISTORY
  //
  // THIS IS THE IMPORTANT NEW PART.
  //
  // Administrator sees administrator history.
  // Super administrator sees super administrator history.
  //
  // We do NOT expose every internal role's workflow
  // history to every role.
  // =======================================================

  let workflowHistory:
    WorkflowHistoryEvent[] = []

  if (
    user.role === "administrator" ||
    user.role === "super_administrator"
  ) {
    const workflowResult =
      await query(
        `
          SELECT
            id,
            request_id,
            case_id,
            quote_version_id,
            performed_by,
            performer_role,
            action,
            description,
            metadata,
            created_at

          FROM workflow_history

          WHERE request_id = $1
            AND performer_role = $2

          ORDER BY created_at ASC
        `,
        [
          id,
          user.role,
        ],
      )

    workflowHistory =
      workflowResult.rows.map(
        (
          item: Record<string, unknown>,
        ): WorkflowHistoryEvent => ({
          id:
            String(item.id),

          request_id:
            item.request_id !== null &&
            item.request_id !== undefined
              ? String(
                  item.request_id,
                )
              : null,

          case_id:
            item.case_id !== null &&
            item.case_id !== undefined
              ? String(
                  item.case_id,
                )
              : null,

          quote_version_id:
            item.quote_version_id !== null &&
            item.quote_version_id !== undefined
              ? String(
                  item.quote_version_id,
                )
              : null,

          performed_by:
            item.performed_by !== null &&
            item.performed_by !== undefined
              ? String(
                  item.performed_by,
                )
              : null,

          performer_role:
            item.performer_role !== null &&
            item.performer_role !== undefined
              ? String(
                  item.performer_role,
                )
              : null,

          action:
            item.action !== null &&
            item.action !== undefined
              ? String(
                  item.action,
                )
              : null,

          description:
            item.description !== null &&
            item.description !== undefined
              ? String(
                  item.description,
                )
              : null,

          metadata:
            item.metadata ?? null,

          created_at:
            toISOString(
              item.created_at,
            ),
        }),
      )
  }

  // =======================================================
  // SUPER ADMIN AUDIT / NEGOTIATION HISTORY
  // =======================================================

  let auditHistory: AuditEvent[] = []

  let negotiationHistory:
    NegotiationEvent[] = []

  if (
    user.role ===
    "super_administrator"
  ) {
    // =====================================================
    // AUDIT EVENTS
    // =====================================================

    const auditResult =
      await query(
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
          id:
            String(item.id),

          actor_user_id:
            item.actor_user_id !== null &&
            item.actor_user_id !== undefined
              ? String(
                  item.actor_user_id,
                )
              : null,

          action:
            String(
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
          id:
            String(item.id),

          request_id:
            String(
              item.request_id,
            ),

          client_id:
            item.client_id !== null &&
            item.client_id !== undefined
              ? String(
                  item.client_id,
                )
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
              ? String(
                  item.status,
                )
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
  // SERIALIZATION
  // =======================================================

 const finalRequest = {
  ...JSON.parse(JSON.stringify(request)),

  evidence_files:
    request.evidence_uploads ?? [],

  evidence_uploads:
    request.evidence_uploads ?? [],
}

  const actionRequired =
    getActionRequired(
      user.role,
      request,
    )

  const serializedWorkflowHistory =
    JSON.parse(
      JSON.stringify(
        workflowHistory,
      ),
    )

  const serializedAuditHistory =
    JSON.parse(
      JSON.stringify(
        auditHistory,
      ),
    )

  const serializedNegotiationHistory =
    JSON.parse(
      JSON.stringify(
        negotiationHistory,
      ),
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

          {actionRequired ? (
            <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs text-amber-300">
              Action Required
            </span>
          ) : (
            <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-white/40">
              No Action Required
            </span>
          )}

          {request.priority && (
            <span className="rounded border border-white/10 px-2 py-1 text-xs uppercase text-white/50">
              {request.priority}
            </span>
          )}

        </div>

      </header>

      {/* =================================================
          ROLE WORKFLOW HISTORY
          ================================================= */}

      {(user.role ===
        "administrator" ||
        user.role ===
          "super_administrator") && (
        <section className="min-w-0 overflow-hidden rounded-md border border-[#143b28] bg-[#06110f]">

          <div className="border-b border-white/10 px-5 py-5 sm:px-6">

            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              {user.role ===
              "administrator"
                ? "Administrator History"
                : "Super Administrator History"}
            </p>

            <p className="mt-2 text-sm text-white/50">
              Actions previously performed by your role
              on this request.
            </p>

          </div>

          {serializedWorkflowHistory.length ===
          0 ? (
            <div className="px-5 py-8 text-sm text-white/40 sm:px-6">
              No workflow actions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-white/5">

              {serializedWorkflowHistory.map(
                (
                  event: WorkflowHistoryEvent,
                ) => (
                  <div
                    key={event.id}
                    className="px-5 py-5 sm:px-6"
                  >

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                      <div className="min-w-0">

                        <p className="font-mono text-xs uppercase tracking-wider text-[#20dc73]">
                          {event.action ||
                            "Workflow Action"}
                        </p>

                        {event.description && (
                          <p className="mt-2 text-sm leading-6 text-white/70">
                            {event.description}
                          </p>
                        )}

                      </div>

                      {event.created_at && (
                        <time
                          dateTime={
                            event.created_at
                          }
                          className="shrink-0 font-mono text-xs text-white/30"
                        >
                          {new Date(
                            event.created_at,
                          ).toLocaleString()}
                        </time>
                      )}

                    </div>

                  </div>
                ),
              )}

            </div>
          )}

        </section>
      )}

      {/* =================================================
          REQUEST ACTIONS
          ================================================= */}

      <section className="min-w-0 overflow-hidden rounded-md border border-[#143b28] bg-[#06110f] p-5 sm:p-6">

        <div className="mb-6 border-b border-white/10 pb-5">

          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
            Request Actions
          </p>

          <p className="mt-2 text-sm text-white/50">
            Role-specific workflow actions for this
            request.
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
                serializedAuditHistory
              }
              negotiationHistory={
                serializedNegotiationHistory
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