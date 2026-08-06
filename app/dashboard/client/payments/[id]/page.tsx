"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function ClientPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const searchParams = useSearchParams()

  useEffect(() => {
    async function load() {
      const resolved = await params
      try {
        const res = await fetch(`/api/client/requests/${resolved.id}`, { credentials: "include", cache: "no-store" })
        if (!res.ok) {
          setError("Payment information unavailable")
          return
        }
        setRequest(await res.json())
      } catch (err) {
        console.error(err)
        setError("Failed to load payment details")
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
    return <div className="p-6 text-sm text-white/45">Loading payment workflow...</div>
  }

  if (error || !request) {
    return <div className="p-6 text-sm text-red-200">{error || "Payment information unavailable"}</div>
  }

  return (
    <div className="space-y-6 p-6 text-white">
      <header className="space-y-2 border-b border-[#143b28] pb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-[#20dc73]">Client Payment Workflow</p>
        <h1 className="text-3xl font-bold">Pay for {request.title || "your investigation"}</h1>
        <p className="text-sm text-white/55">The payment page opens directly from the notification with the correct request already selected.</p>
      </header>

      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Amount Due</p>
            <p className="mt-2 text-2xl font-semibold text-[#20dc73]">
              {request.approved_quote_currency || "NGN"} {Number(request.approved_quote_amount || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Status</p>
            <p className="mt-2 text-lg text-yellow-300">Awaiting Payment</p>
          </div>
        </div>

        <div className="rounded border border-[#143b28] bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">Next Step</p>
          <p className="mt-2 text-sm leading-7 text-white/65">Use this page to complete payment, upload proof, and keep the investigation moving.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="rounded bg-[#20dc73] px-5 py-3 font-semibold text-black">Pay Now</button>
          <button className="rounded border border-[#143b28] px-5 py-3 text-sm text-white/70">Upload Proof</button>
          <Link href="/dashboard/client/requests" className="rounded border border-[#143b28] px-5 py-3 text-sm text-white/70">Return to requests</Link>
        </div>
      </div>
    </div>
  )
}
