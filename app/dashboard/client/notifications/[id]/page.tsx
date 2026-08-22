"use client"

import QuoteApprovalCard from "@/components/client/QuoteApprovalCard"
import Link from "next/link"
import { useEffect, useState } from "react"
import { getNotificationDestination } from "@/lib/notification-routing"

export default function ClientNotificationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [notification, setNotification] = useState<any>(null)
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const resolved = await params
      setId(resolved.id)
      const res = await fetch(`/api/notifications/${resolved.id}`, { credentials: "include" })
      if (!res.ok) {
        setError("Notification not found")
        setLoading(false)
        return
      }
      const data = await res.json()
      setNotification(data)

      if (data?.id) {
        fetch(`/api/notifications/${data.id}/read`, { method: "PATCH", credentials: "include" }).catch(() => undefined)
      }

      if (data?.metadata?.request_id) {
        const requestRes = await fetch(`/api/client/requests/${data.metadata.request_id}`, { credentials: "include" })
        if (requestRes.ok) {
          setRequest(await requestRes.json())
        }
      }
      setLoading(false)
    }
    load()
  }, [params])

  if (loading) {
    return <div className="p-6 text-sm text-white/45">Loading quote details...</div>
  }

  if (error || !notification) {
    return <div className="p-6 text-sm text-red-200">{error || "Notification not found"}</div>
  }

  return (
    <div className="space-y-6 p-6 text-white">
      <header className="space-y-2">
       <p className="text-xs uppercase tracking-[0.25em] text-[#20dc73]">
{
 notification.type === "payment_required"
 ? "Payment"
 : "Client Quote"
}
</p>
        <h1 className="text-3xl font-bold">{notification.title}</h1>
        <p className="text-sm text-white/55">{notification.message}</p>
      </header>

      {request ? (
        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold text-white">Investigation details</p>
            <p className="mt-2 text-sm text-white/60">{request.title || "Investigation request"}</p>
            <p className="mt-1 text-sm text-white/45">{request.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded border border-[#143b28] bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">Final approved price</p>
              <p className="mt-2 text-2xl font-semibold text-[#20dc73]">
                {request.approved_quote_currency || "NGN"} {request.approved_quote_amount?.toLocaleString()}
              </p>
            </div>
            <div className="rounded border border-[#143b28] bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">Estimated completion</p>
              <p className="mt-2 text-lg text-white">{request.approved_estimated_completion || "Pending"}</p>
            </div>
          </div>

          <div className="rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Client-safe notes</p>
            <p className="mt-2 text-sm leading-7 text-white/65">{request.approved_quote_notes || "No additional notes were provided."}</p>
          </div>

          {notification.type === "quote_ready" && (
  <QuoteApprovalCard request={request} />
)}


{notification.type === "payment_required" && (
  <div className="
    rounded-md
    border border-[#20dc73]/40
    bg-[#20dc73]/5
    p-6
    space-y-5
  ">

    <div>
      <p className="
      text-xs uppercase tracking-[0.2em]
      text-[#20dc73]
      ">
        Payment Required
      </p>

      <h2 className="
      mt-2 text-xl font-semibold
      ">
        Investigation Ready To Start
      </h2>

      <p className="
      mt-2 text-sm text-white/60
      ">
        Your quote has been accepted. Complete payment to activate your investigation.
      </p>
    </div>


    <div className="
    rounded border border-[#143b28]
    bg-black/30
    p-4
    ">

      <p className="
      text-xs uppercase tracking-widest
      text-white/40
      ">
        Amount Due
      </p>


      <p className="
      mt-2 text-3xl font-bold
      text-[#20dc73]
      ">

        {request.approved_quote_currency || "NGN"}{" "}
        {Number(
          request.approved_quote_amount || 0
        ).toLocaleString()}

      </p>

    </div>



    <Link
      href={`/dashboard/client/payments/${notification?.metadata?.case_id || request.id}`}
      className="
        inline-flex
        rounded
        bg-[#20dc73]
        px-5
        py-3
        font-semibold
        text-black
      "
    >
      Make Payment
    </Link>


  </div>
)}
          <div className="flex flex-wrap gap-3">
<Link
  href={
    getNotificationDestination(notification) ||
    "/dashboard/client/notifications"
  }
  className="rounded bg-[#20dc73] px-4 py-2 text-sm font-semibold text-black"
>
  Open workflow page
</Link>
            <Link href="/dashboard/client/notifications" className="rounded border border-[#143b28] px-4 py-2 text-sm text-white/70">Back to notifications</Link>
          </div>
        </div>
      ) : null}

      {id ? (
        <div className="rounded border border-[#143b28] bg-black/30 p-4 text-sm text-white/55">
          This notification was generated after the super administrator finalized the quote.
        </div>
      ) : null}
    </div>
  )
}
