import type { DatabasePoolClient } from "@/lib/db"
import { query } from "@/lib/db"

type Executor = Pick<DatabasePoolClient, "query">

export type CommercialHistory = {
  status: string
  acceptedQuoteVersionId: string | null
  quotations: Array<Record<string, unknown>>
  negotiations: Array<Record<string, unknown>>
  payments: Array<Record<string, unknown>>
  destination: { type: "case" | "training"; id: string } | null
}

function safeReference(value: string | null) {
  if (!value) return null
  return value.length > 12 ? `...${value.slice(-12)}` : value
}

export async function markAcceptedQuoteVersion(
  executor: Executor,
  input: { requestId: string; userId: string; amount: number; currency: string },
) {
  const selected = await executor.query<{ id: string }>(
    `SELECT id FROM quote_versions
     WHERE request_id = $1 AND price = $2 AND UPPER(currency) = UPPER($3)
       AND creator_role <> 'client'
     ORDER BY version_number DESC LIMIT 1 FOR UPDATE`,
    [input.requestId, input.amount, input.currency],
  )
  const quoteId = selected.rows[0]?.id
  if (!quoteId) throw new Error("The accepted quotation version could not be identified.")
  await executor.query(
    `UPDATE quote_versions SET status = CASE WHEN id = $2 THEN 'accepted' ELSE 'superseded' END,
       accepted_at = CASE WHEN id = $2 THEN COALESCE(accepted_at, now()) ELSE accepted_at END,
       accepted_by = CASE WHEN id = $2 THEN COALESCE(accepted_by, $3) ELSE accepted_by END
     WHERE request_id = $1 AND (id = $2 OR status IN ('issued','quote_sent','revised_quote_sent','approved','accepted'))`,
    [input.requestId, quoteId, input.userId],
  )
  await executor.query(`UPDATE requests SET accepted_quote_version_id = $2 WHERE id = $1`, [input.requestId, quoteId])
  return quoteId
}

export async function getCommercialHistory(requestId: string): Promise<CommercialHistory> {
  const [requestResult, quoteResult, negotiationResult, paymentResult] = await Promise.all([
    query<{ status: string; accepted_quote_version_id: string | null; converted_case_id: string | null; converted_training_engagement_id: string | null }>(
      `SELECT status, accepted_quote_version_id, converted_case_id, converted_training_engagement_id FROM requests WHERE id = $1`, [requestId],
    ),
    query(`SELECT id, version_number, price, currency, scope_summary, terms, estimated_start,
                  estimated_completion, status, issued_at, expires_at, accepted_at, created_at,
                  supersedes_quote_version_id, negotiation_id
           FROM quote_versions WHERE request_id = $1 ORDER BY version_number ASC, created_at ASC`, [requestId]),
    query(`SELECT id, round_number, status, requested_budget, quote_currency, client_reason,
                  client_notes, revised_quote_amount, owner_decision, decided_at, created_at, updated_at
           FROM quote_negotiations WHERE request_id = $1 ORDER BY round_number ASC, created_at ASC`, [requestId]),
    query<{ id: string; quote_version_id: string | null; amount: string | number; currency: string; provider: string | null; provider_reference: string | null; transaction_id: string | null; status: string; paid_at: string | null; verified_at: string | null; failure_reason_category: string | null; created_at: string }>(
      `SELECT id, quote_version_id, amount, currency, provider, provider_reference, transaction_id,
              status, paid_at, verified_at, failure_reason_category, created_at
       FROM payments WHERE request_id = $1 ORDER BY created_at ASC`, [requestId],
    ),
  ])
  const request = requestResult.rows[0]
  const paid = paymentResult.rows.some((item) => item.status === "paid" && item.quote_version_id === request?.accepted_quote_version_id)
  const commercialStatus = paid ? "paid" : paymentResult.rows.some((item) => item.status === "failed") ? "payment_issue" : request?.accepted_quote_version_id ? "awaiting_payment" : negotiationResult.rows.some((item) => !["closed", "rejected"].includes(String(item.status))) ? "negotiation" : quoteResult.rows.length ? "quotation_ready" : "awaiting_quotation"
  return {
    status: commercialStatus,
    acceptedQuoteVersionId: request?.accepted_quote_version_id || null,
    quotations: quoteResult.rows,
    negotiations: negotiationResult.rows,
    payments: paymentResult.rows.map((item) => ({ ...item, transaction_id: undefined, provider_reference: safeReference(item.provider_reference || item.transaction_id) })),
    destination: request?.converted_training_engagement_id
      ? { type: "training", id: request.converted_training_engagement_id }
      : request?.converted_case_id ? { type: "case", id: request.converted_case_id } : null,
  }
}
