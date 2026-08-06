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
  reasoning: string | null
  notes: string | null
  status: string | null
  created_at: string | null
}

export default async function SuperAdministratorRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  if (user.role !== "super_administrator") {
    redirect("/dashboard")
  }
 
  const { id } = await params

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

 const aiQuoteResult = await query<QuoteVersion>(
  `
  SELECT *
  FROM quote_versions
  WHERE request_id = $1
    AND source = 'ai'
  ORDER BY version_number ASC
  LIMIT 1
  `,
  [id],
)

const aiQuote = aiQuoteResult.rows[0] ?? null

const adminQuoteResult = await query<QuoteVersion>(
  `
  SELECT *
  FROM quote_versions
  WHERE request_id = $1
    AND source = 'administrator'
  ORDER BY version_number DESC
  LIMIT 1
  `,
  [id],
)

const adminQuote = adminQuoteResult.rows[0] ?? null
  return (
    <div className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">Super Administrator Review</p>
        <h1 className="mt-2 text-3xl font-bold text-white">{request.title}</h1>
        <p className="text-white/50">{request.case_number}</p>
      </header>

     <SuperAdminRequestReviewCard
    request={request}
    aiQuote={aiQuote}
    adminQuote={adminQuote}
/>
    </div>
  )
}
