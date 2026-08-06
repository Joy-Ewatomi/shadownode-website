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

  approved_quote_amount: number | null
  approved_quote_currency: string | null
  approved_quote_notes: string | null
  approved_estimated_completion: string | null


  // administrator review
  admin_quote_action: string | null
  admin_quote_notes: string | null
  admin_reviewed_by: string | null
  admin_reviewed_at: string | null


  // super administrator review
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
}

export default async function RequestDetailPage({
  params
}: {
  params: Promise<{
    id: string
  }>
}) {

  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }


  const { id } = await params


const result = await query<any>(
`
SELECT *
FROM requests
WHERE id=$1
LIMIT 1
`,
[id]
)


const rawRequest = result.rows[0]

if (!rawRequest) {
  notFound()
}


const request = {
  ...rawRequest,

  created_at:
    rawRequest.created_at
      ? new Date(rawRequest.created_at).toISOString()
      : null,

  updated_at:
    rawRequest.updated_at
      ? new Date(rawRequest.updated_at).toISOString()
      : null,

  approved_estimated_completion:
  rawRequest.approved_estimated_completion
    ? new Date(rawRequest.approved_estimated_completion)
        .toISOString()
        .slice(0, 10)
    : null,
    
  admin_reviewed_at:
    rawRequest.admin_reviewed_at
      ? new Date(rawRequest.admin_reviewed_at).toISOString()
      : null,

  super_admin_reviewed_at:
    rawRequest.super_admin_reviewed_at
      ? new Date(rawRequest.super_admin_reviewed_at).toISOString()
      : null,

  ai_price_estimate:
    rawRequest.ai_price_estimate
      ? Number(rawRequest.ai_price_estimate)
      : null,

  approved_quote_amount:
    rawRequest.approved_quote_amount
      ? Number(rawRequest.approved_quote_amount)
      : null,

  ai_confidence:
    rawRequest.ai_confidence
      ? Number(rawRequest.ai_confidence)
      : null,

        training_preferred_start_date:
    rawRequest.training_preferred_start_date
      ? new Date(rawRequest.training_preferred_start_date)
          .toISOString()
          .slice(0, 10)
      : null,

  training_preferred_completion_date:
    rawRequest.training_preferred_completion_date
      ? new Date(rawRequest.training_preferred_completion_date)
          .toISOString()
          .slice(0, 10)
      : null,

      quote_sent_at:
  rawRequest.quote_sent_at
    ? new Date(rawRequest.quote_sent_at).toISOString()
    : null,

client_decision_at:
  rawRequest.client_decision_at
    ? new Date(rawRequest.client_decision_at).toISOString()
    : null,
}

Object.entries(request).forEach(([key,value])=>{
  if(value instanceof Date){
    console.log("FOUND DATE:", key, value)
  }
})

const quotes = await query<any>(
`
SELECT *
FROM quote_versions
WHERE request_id=$1
ORDER BY version_number DESC
`,
[id]
)


const quoteVersions = quotes.rows.map((quote)=>({
  ...quote,

  price: quote.price
    ? Number(quote.price)
    : null,

  created_at: quote.created_at
    ? new Date(quote.created_at).toISOString()
    : null,

  estimated_completion:
    quote.estimated_completion
      ? new Date(
          quote.estimated_completion
        ).toISOString()
      : null,
}))

const adminQuote =
  quoteVersions.find(
    (q:any)=>q.source==="administrator"
  ) || null


const aiQuote =
  quoteVersions.find(
    (q:any)=>q.source==="ai"
  ) || null

  console.log(request)
console.log(
  Object.entries(request).filter(([, value]) => value !== null && (value as any) instanceof Date)
)
const serializedRequest = JSON.parse(JSON.stringify(request))

  if (!request) {
    notFound()
  }



  return (
    <div className="space-y-6">


      <header className="border-b border-[#143b28] pb-6">

        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
          Request Investigation
        </p>


        <h1 className="mt-2 text-3xl font-bold text-white">
          {request.title}
        </h1>


        <p className="text-white/50">
          {request.case_number}
        </p>

      </header>


{
user.role === "administrator" || user.role === "admin" ? (

request.status === "pending_super_admin_review" ? (

<div
className="
rounded-md
border
border-[#143b28]
bg-[#06110f]
p-6
"
>

<p className="text-[#20dc73] font-semibold">
Request Submitted
</p>

<p className="mt-2 text-white/60">
This request has already been submitted to Super Administrator review.
</p>

</div>

)

:

request.status === "awaiting_client_acceptance" ||
request.status === "quote_sent" ||
request.status === "rejected" ?

(

<div
className="
rounded-md
border
border-[#143b28]
bg-[#06110f]
p-6
"
>

<p className="text-[#20dc73] font-semibold">
Review Completed
</p>

<p className="mt-2 text-white/60">
This request has already completed administrator review.
</p>

</div>

)

:

(

<AdminRequestReviewCard
request={request}
/>

)

)

: user.role === "super_administrator" ? (

    request.status === "pending_super_admin_review" ?

(
<SuperAdminRequestReviewCard
request={request}
aiQuote={aiQuote}
adminQuote={adminQuote}
/>
)

:

(

<div
className="
rounded-md
border
border-[#143b28]
bg-[#06110f]
p-6
"
>

<p className="text-[#20dc73] font-semibold">
Super Administrator Review Completed
</p>

<p className="mt-2 text-white/60">
This request has already been finalized.
</p>

</div>

)

  ) : (

    <RequestReviewCard
      request={serializedRequest}
    />

  )
}

    </div>
  )
}