import { query } from "@/lib/db"
import { notifyUser } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"
import { createQuoteVersion } from "@/lib/services/quote-version-service"

export type AdminQuoteReviewAction = "accept" | "adjust"

export async function reviewQuoteAsAdmin(input: {
  requestId: string
  actorUserId: string
  actorRole: string
  action: AdminQuoteReviewAction
  amount?: number | null
  currency?: string | null
  notes?: string | null
  reason: string
  estimated_completion?: string | null
}) {

  if (!input.requestId) throw new Error("Request id is required")
  if (!input.actorUserId) throw new Error("Actor user id is required")

  if (input.actorRole !== "administrator") {
    throw new Error("Only administrators can review quotes")
  }

  const reason = input.reason?.trim()

  if (!reason) {
    throw new Error("A reason is required")
  }


const current = await query<{
  id: string
  user_id: string | null
  title: string | null
  status: string | null
  approved_quote_amount: number | null
  approved_quote_currency: string | null
}>(
    `
    SELECT
      id,
      user_id,
      title,
      status,
      approved_quote_amount,
      approved_quote_currency
    FROM requests
    WHERE id=$1
    FOR UPDATE
    LIMIT 1
    `,
    [input.requestId]
  )


  const request = current.rows[0]

  if (!request) {
    throw new Error("Request not found")
  }



  // GET AI ORIGINAL QUOTE ONLY
  const aiResult = await query<{
  price: number | null
  currency: string | null
  estimated_completion: string | null
  notes: string | null
}>(
    `
    SELECT
      price,
      currency,
      estimated_completion,
      notes
    FROM quote_versions
    WHERE request_id=$1
    AND source='ai'
    ORDER BY version_number DESC
    LIMIT 1
    `,
    [input.requestId]
  )


  const aiQuote = aiResult.rows[0]


  const amount = Number(
    input.amount ??
    aiQuote?.price ??
    request.approved_quote_amount
  )


  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Valid quote amount required")
  }


 const currency = String(
  input.currency ??
  aiQuote?.currency ??
  request.approved_quote_currency ??
  "NGN"
).trim().slice(0,10)


const updated = await query<{
  user_id:string | null
  title:string | null
}>(
    `
    UPDATE requests
    SET
      status='pending_super_admin_review',

      approved_quote_amount=$2::numeric,
      approved_quote_currency=$3,

      admin_quote_action=$4,
      admin_quote_notes=$5,

      admin_reviewed_by=$6,
      admin_reviewed_at=NOW(),

      updated_at=NOW()

    WHERE id=$1

    RETURNING *
    `,
    [
      input.requestId,
      amount,
      currency,
      input.action==="adjust"
        ? "adjusted"
        : "submitted_for_review",
      reason,
      input.actorUserId
    ]
  )


  const row = updated.rows[0]



  await createQuoteVersion({
    requestId: input.requestId,
    userId: input.actorUserId,
    role:"administrator",
    source:"administrator",
    price:amount,
    currency,
    estimated_completion:
      input.estimated_completion ?? null,
    reasoning:reason,
    status:"pending_super_admin_review"
  })



  await recordRequestAudit(
    input.requestId,
    input.actorUserId,
    "admin_submitted_quote_for_super_admin",
    {
      amount,
      currency,
      action:input.action,
      reason
    }
  )



  if(row.user_id){

    await notifyUser(row.user_id,{
      type:"quote_review",
      title:"Quote sent for final approval",
      message:
        "Your investigation quote is being reviewed.",
      metadata:{
        request_id:input.requestId,
        target_page:"client_quote_review"
      }
    })

  }


  return row

}