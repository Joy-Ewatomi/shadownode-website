import { getCurrentUser } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { query } from "@/lib/db"
import RequestReviewCard from "@/components/requests/RequestReviewCard"

type RequestData = {
  id: string
  case_number: string | null
  title: string | null
  service_type: string | null
  description: string | null
  status: string
  priority: string | null
  ai_price_estimate: number | null
  ai_complexity: string | null
  ai_confidence: number | null
  ai_reasoning: string | null
  client_email: string | null
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

  const result = await query<RequestData>(
`
SELECT *
FROM requests
WHERE id=$1
LIMIT 1
`,
[id]
)

const request = result.rows[0]

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

      <RequestReviewCard
        request={request}
      />

    </div>
  )
}