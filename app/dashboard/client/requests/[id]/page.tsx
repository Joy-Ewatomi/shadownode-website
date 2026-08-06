"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import QuoteApprovalCard from "@/components/client/QuoteApprovalCard"

export default function ClientRequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [id, setId] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    async function load() {
      const resolved = await params
      setId(resolved.id)
      try {
        const res = await fetch(`/api/client/requests/${resolved.id}`, { credentials: "include", cache: "no-store" })
        if (!res.ok) {
          setError("Request not found")
          return
        }
        setRequest(await res.json())
      } catch (err) {
        console.error(err)
        setError("Failed to load request")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params])

  useEffect(() => {
    const notificationId = searchParams.get("notificationId")
    if (!notificationId) return
    fetch(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
      credentials: "include",
    }).catch(() => undefined)
  }, [searchParams])

  if (loading) {
    return <div className="p-6 text-sm text-white/45">Loading quote workflow...</div>
  }

  if (error || !request) {
    return <div className="p-6 text-sm text-red-200">{error || "Request not found"}</div>
  }

  return (
    <div className="space-y-6 p-6 text-white">
      <header className="space-y-2 border-b border-[#143b28] pb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-[#20dc73]">Client Quote Workflow</p>
        <h1 className="text-3xl font-bold">{request.title || "Investigation request"}</h1>
        <p className="text-sm text-white/55">{request.description}</p>
      </header>

      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Service Request</p>
            <p className="mt-2 text-lg font-semibold text-white">{request.service_type || request.title || "Investigation request"}</p>
          </div>
          <div className="rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Investigation Summary</p>
            <p className="mt-2 text-sm leading-7 text-white/65">{request.investigation_objective || request.description || "No summary available yet."}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Final Approved Quote</p>
            <p className="mt-2 text-2xl font-semibold text-[#20dc73]">
              {request.approved_quote_currency || "NGN"} {Number(request.approved_quote_amount || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Timeline</p>
            <p className="mt-2 text-lg text-white">{request.approved_estimated_completion || request.updated_at || "Pending"}</p>
          </div>
        </div>

        <div className="mt-5 rounded border border-[#143b28] bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">Notes</p>
          <p className="mt-2 text-sm leading-7 text-white/65">{request.approved_quote_notes || "No notes provided yet."}</p>
        </div>
      </div>

      <QuoteApprovalCard request={request} />

      <div className="flex flex-wrap gap-3">
        <Link href={id ? `/dashboard/client/payments/${id}` : "/dashboard/client/payments"} className="rounded border border-[#20dc73]/40 px-4 py-2 text-sm text-[#20dc73]">
          Open payment page
        </Link>
        <Link href="/dashboard/client/requests" className="rounded border border-[#143b28] px-4 py-2 text-sm text-white/70">
          Back to requests
        </Link>
      </div>
    </div>
  )
}