import { query } from "@/lib/db"
import { notifyAdmins, notifyUser } from "@/lib/services/notification-service"

export async function recordRequestAudit(
  requestId: string,
  actorUserId: string | null,
  action: string,
  details: Record<string, unknown> = {}
) {
  await query(
    "INSERT INTO request_audit_events (request_id, actor_user_id, action, details) VALUES ($1, $2, $3, $4)",
    [
      requestId,
      actorUserId,
      action,
      JSON.stringify(details),
    ],
  ).catch((err)=>{
    console.error("AUDIT ERROR", err)
  })
}


export async function sendQuote(input: {
  requestId: string
  actorUserId: string
  amount: number
  currency: string
  notes?: string | null
  estimatedCompletion?: string | null
}) {
const updated = await query(
`
UPDATE requests
SET status='quote_sent',
    price_notes=$4,
    final_price=$2::integer,
    approved_quote_amount=$2::numeric,
    approved_quote_currency=$3,
    approved_quote_notes=$4,
    approved_estimated_completion=$5,
    quote_sent_at=NOW(),
    updated_at=NOW()
WHERE id=$1
RETURNING *
`,
[
 input.requestId,
 input.amount,
 input.currency,
 input.notes || null,
 input.estimatedCompletion || null
],
)
  await recordRequestAudit(input.requestId, input.actorUserId, "quote_sent", { amount: input.amount, currency: input.currency })
const row = updated.rows[0] as {
  user_id?: string | null
  title?: string | null
}
console.log("QUOTE USER:", row.user_id)
  await notifyUser(row.user_id, { type: "quote_ready", title: "Quote ready", message: row.title || "Your investigation quote is ready." })
  return row
}

export async function declineRequest(requestId: string, actorUserId: string, reason?: string | null) {
  const updated = await query("UPDATE requests SET status='rejected', declined_reason=$2, reviewed_by=$3, updated_at=NOW() WHERE id=$1 RETURNING *", [requestId, reason || null, actorUserId])
  await recordRequestAudit(requestId, actorUserId, "request_rejected", { reason: reason || null })
  const row = updated.rows[0] as { user_id?: string | null; title?: string | null }
  await notifyUser(row.user_id, { type: "quote_rejected", title: "Request rejected", message: row.title || "Your investigation request was rejected."})
  return row
}

export async function requestQuoteReview(input: { requestId: string; clientId: string; requestedBudget: number; reason: string; notes?: string | null }) {
  const current = await query<{ ai_price_estimate: number | null; estimated_price: number | null; approved_quote_amount: number | null; approved_quote_currency: string | null }>(
    "SELECT ai_price_estimate, estimated_price, approved_quote_amount, approved_quote_currency FROM requests WHERE id=$1 AND user_id=$2 LIMIT 1",
    [input.requestId, input.clientId],
  )
  if (!current.rows[0]) throw new Error("Request not found")
  const reviewer = await query<{ id: string }>("SELECT id FROM app_users WHERE role IN ('super-administrator', 'super_administrator', 'administrator') AND status='active' ORDER BY created_at ASC LIMIT 1").catch(() => ({ rows: [] }))
  const round = await query<{ next_round: number }>("SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round FROM quote_negotiations WHERE request_id=$1", [input.requestId])
  const row = current.rows[0]
  const inserted = await query(
    `
    INSERT INTO quote_negotiations
      (request_id, user_id, assigned_reviewer_id, round_number, original_ai_estimate, original_quote_amount, approved_quote_currency, requested_budget, client_reason, client_notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
    `,
    [input.requestId, input.clientId, reviewer.rows[0]?.id || null, round.rows[0]?.next_round || 1, row.ai_price_estimate || row.estimated_price || null, row.approved_quote_amount || null, row.approved_quote_currency || "NGN", input.requestedBudget, input.reason, input.notes || null],
  )
  await query("UPDATE requests SET status='negotiation_requested', updated_at=NOW() WHERE id=$1", [input.requestId])
  await recordRequestAudit(input.requestId, input.clientId, "client_requested_quote_review", { negotiation_id: inserted.rows[0].id, requested_budget: input.requestedBudget })
  await notifyAdmins({ type: "negotiation_requested", title: "Quote review requested", message: input.reason})
  return inserted.rows[0]
}
