import { redirect, notFound } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import SuperAdminRequestReviewCard from "@/components/requests/SuperAdminRequestReviewCard"

type RequestData = {
  id: string
  case_number: string | null
  title: string | null
  service_type: string | null
  description: string | null
  investigation_objective: string | null
  status: string

  ai_price_estimate: number | null
  ai_price_currency: string | null
  ai_complexity: string | null
  ai_confidence: number | null
  ai_reasoning: string | null
  ai_analysis: string | null

  client_email: string | null

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

export default async function SuperAdministratorRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  /*
   * =========================================================
   * AUTHENTICATION
   * =========================================================
   */

  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }


  /*
   * =========================================================
   * REQUEST ID
   * =========================================================
   */

  const { id } = await params

  /*
   * =========================================================
   * LOAD COMPLETE REQUEST
   * =========================================================
   */

  const result = await query<RequestData>(
    `
    SELECT
      id,
      case_number,
      title,
      service_type,
      description,
      investigation_objective,
      status,

      ai_price_estimate,
      currency AS ai_price_currency,
      ai_complexity,
      ai_confidence,
      ai_reasoning,
      ai_analysis,

      client_email,

      approved_quote_amount,
      approved_quote_currency,
      approved_quote_notes,
      approved_estimated_completion,

      admin_quote_action,
      admin_quote_notes,
      admin_reviewed_by,
      admin_reviewed_at,

      super_admin_quote_action,
      super_admin_quote_notes,
      super_admin_reviewed_by,
      super_admin_reviewed_at

    FROM requests

    WHERE id = $1

    LIMIT 1
    `,
    [id],
  )

  const request = result.rows[0]

  if (!request) {
    notFound()
  }

  /*
   * =========================================================
   * LOAD ORIGINAL AI QUOTE
   * =========================================================
   */

  const aiQuoteResult = await query<QuoteVersion>(
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
      AND source = 'ai'

    ORDER BY version_number ASC

    LIMIT 1
    `,
    [id],
  )

  const aiQuote =
    aiQuoteResult.rows[0] ?? null

  /*
   * =========================================================
   * LOAD LATEST ADMINISTRATOR QUOTE
   * =========================================================
   *
   * This is the quote submitted by the Administrator
   * for Super Administrator approval.
   */

  const adminQuoteResult =
    await query<QuoteVersion>(
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
       AND source = 'administrator_proposal'

      ORDER BY version_number DESC

      LIMIT 1
      `,
      [id],
    )

  const adminQuote =
    adminQuoteResult.rows[0] ?? null

  /*
   * =========================================================
   * LOAD COMPLETE QUOTE HISTORY
   * =========================================================
   *
   * Super Administrator gets the complete quote history.
   */

  const quoteHistoryResult =
    await query<QuoteVersion>(
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

      ORDER BY version_number ASC
      `,
      [id],
    )

  const quoteHistory =
    quoteHistoryResult.rows

  /*
   * =========================================================
   * LOAD REQUEST AUDIT HISTORY
   * =========================================================
   */

  const auditResult =
    await query<AuditEvent>(
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

  const auditHistory =
    auditResult.rows

  /*
   * =========================================================
   * LOAD NEGOTIATION HISTORY
   * =========================================================
   */

  const negotiationResult =
    await query<NegotiationHistory>(
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
        round_number ASC,
        created_at ASC
      `,
      [id],
    )

  const negotiationHistory =
    negotiationResult.rows

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="space-y-8">
      {/* Header */}

      <div className="mb-8">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
          Bureau Command
        </div>

        <h1 className="text-2xl font-semibold text-white">
          Super Administrator Review
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/50">
          <span>
            {request.title ||
              "Untitled request"}
          </span>

          {request.case_number && (
            <>
              <span>•</span>

              <span>
                {request.case_number}
              </span>
            </>
          )}

          <span>•</span>

          <span className="uppercase">
            {request.status}
          </span>
        </div>
      </div>

      {/* Full Super Administrator Review */}

      <SuperAdminRequestReviewCard
        request={request}
        aiQuote={aiQuote}
        adminQuote={adminQuote}
        quoteHistory={quoteHistory}
        auditHistory={auditHistory}
        negotiationHistory={
          negotiationHistory
        }
      />
    </div>
  )
}