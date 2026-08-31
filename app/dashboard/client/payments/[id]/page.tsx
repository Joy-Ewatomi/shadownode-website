"use client"

import {
  useEffect,
  useState,
} from "react"

import Link from "next/link"

import {
  useSearchParams,
} from "next/navigation"

type RequestData = {
  id: string
  title?: string | null
  approved_quote_amount?: number | string | null
  approved_quote_currency?: string | null
  converted_case_id?: string | null
  status?: string | null
}

export default function ClientPaymentDetailPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  const [
    request,
    setRequest,
  ] = useState<RequestData | null>(
    null,
  )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    paying,
    setPaying,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState("")

  const searchParams =
    useSearchParams()

  const paymentResult =
    searchParams.get("payment")

  useEffect(() => {
    async function load() {
      const resolved =
        await params

      try {
        const res =
          await fetch(
            `/api/client/requests/${resolved.id}`,
            {
              credentials:
                "include",
              cache:
                "no-store",
            },
          )

        if (!res.ok) {
          setError(
            "Payment information unavailable",
          )
          return
        }

       const data =
  await res.json()

console.log("PAYMENT INITIALIZE STATUS:", res.status)
console.log("PAYMENT INITIALIZE DATA:", data)



        setRequest(data)
      } catch (err) {
        console.error(
          "PAYMENT PAGE LOAD ERROR",
          err,
        )

        setError(
          "Failed to load payment details",
        )
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params])

  useEffect(() => {
    const notificationId =
      searchParams.get(
        "notificationId",
      )

    if (!notificationId) {
      return
    }

    fetch(
      `/api/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        credentials:
          "include",
      },
    ).catch(() => undefined)
  }, [searchParams])

  async function handlePayment() {
    
    if (!request?.id) {
      return
    }

    setPaying(true)
    setError("")

    try {
      const response =
        await fetch(
          "/api/client/payments/initialize",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "include",
            body: JSON.stringify({
              request_id:
                request.id,
            }),
          },
        )

        

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to initialize payment",
        )
      }

      if (
        !data.authorization_url
      ) {
        throw new Error(
          "Paystack did not return a checkout URL",
        )
      }

      /*
       * Redirect the browser to Paystack.
       */
      window.location.href =
        data.authorization_url

        console.log(
  "AUTHORIZATION URL:",
  data.authorization_url,
)
    } catch (err) {
      console.error(
        "PAYMENT INITIALIZATION ERROR",
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start payment",
      )

      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-white/45">
        Loading payment workflow...
      </div>
    )
  }

  if (error && !request) {
    return (
      <div className="p-6 text-sm text-red-200">
        {error}
      </div>
    )
  }

  if (!request) {
    return (
      <div className="p-6 text-sm text-red-200">
        Payment information unavailable
      </div>
    )
  }

if (
  request.status !== "awaiting_payment" &&
  request.status !== "active"
) {
  return (
    <div className="space-y-6 p-6 text-white">
      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
          Payment unavailable
        </p>

        <h1 className="mt-2 text-2xl font-bold">
          Payment is not available yet
        </h1>

        <p className="mt-3 text-sm leading-6 text-white/55">
          Your quote must be accepted before payment can be initiated.
        </p>

        <Link
          href={`/dashboard/client/requests/${request.id}`}
          className="mt-5 inline-flex rounded-md border border-[#20dc73]/40 px-4 py-2 text-sm font-semibold text-[#20dc73] hover:border-[#20dc73]"
        >
          Back to request
        </Link>
      </div>
    </div>
  )
}

const amount =
  Number(
    request.approved_quote_amount || 0,
  )

const currency =
  request.approved_quote_currency || "NGN"

const isPaid =
  paymentResult === "success" ||
  request.status === "active"

  return (
    <div className="space-y-6 p-6 text-white">
      <header className="space-y-2 border-b border-[#143b28] pb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-[#20dc73]">
          Client Payment Workflow
        </p>

        <h1 className="text-3xl font-bold">
          Pay for{" "}
          {request.title ||
            "your investigation"}
        </h1>

        <p className="text-sm text-white/55">
          Secure payment is required before
          your investigation can begin.
        </p>
      </header>

      {paymentResult ===
        "success" && (
        <div className="rounded-md border border-[#20dc73]/40 bg-[#20dc73]/10 p-5">
          <p className="font-semibold text-[#20dc73]">
            Payment confirmed
          </p>

          <p className="mt-1 text-sm text-white/65">
            Your payment has been verified.
            Your investigation is now active.
          </p>
        </div>
      )}

      {paymentResult ===
        "pending" && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-5">
          <p className="font-semibold text-yellow-300">
            Payment is still processing
          </p>

          <p className="mt-1 text-sm text-white/65">
            Paystack has not yet reported a
            successful payment. Please wait a
            moment and check again.
          </p>
        </div>
      )}

      {paymentResult ===
        "verification_failed" && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-5">
          <p className="font-semibold text-red-300">
            Payment verification failed
          </p>

          <p className="mt-1 text-sm text-white/65">
            We could not confirm the payment.
            Your investigation has not been
            activated.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-5 rounded-md border border-[#143b28] bg-[#06110f] p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Amount Due
            </p>

            <p className="mt-2 text-2xl font-semibold text-[#20dc73]">
              {currency}{" "}
              {amount.toLocaleString()}
            </p>
          </div>

          <div className="rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Status
            </p>

            <p
              className={`mt-2 text-lg ${
                isPaid
                  ? "text-[#20dc73]"
                  : "text-yellow-300"
              }`}
            >
              {isPaid
                ? "Payment Confirmed"
                : "Awaiting Payment"}
            </p>
          </div>
        </div>

        <div className="rounded border border-[#143b28] bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">
            Investigation
          </p>

          <p className="mt-2 text-lg font-semibold">
            {request.title ||
              "Investigation Request"}
          </p>
        </div>

        <div className="rounded border border-[#143b28] bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">
            Next Step
          </p>

          <p className="mt-2 text-sm leading-7 text-white/65">
            {isPaid
              ? "Payment has been confirmed. ShadowNode can now proceed with your investigation."
              : "Complete payment through Paystack. Your investigation will only become active after the payment is verified by our server."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {!isPaid && (
            <button
              type="button"
              disabled={paying}
              onClick={
                handlePayment
              }
              className="rounded bg-[#20dc73] px-5 py-3 font-semibold text-black transition hover:bg-[#1bc965] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {paying
                ? "Opening Paystack..."
                : "Pay Now"}
            </button>
          )}

          {isPaid && (
            <Link
              href={
                request.converted_case_id
                  ? `/dashboard/client/cases/${request.converted_case_id}`
                  : "/dashboard/client/cases"
              }
              className="rounded bg-[#20dc73] px-5 py-3 font-semibold text-black transition hover:bg-[#1bc965]"
            >
              View Investigation
            </Link>
          )}

          <Link
            href="/dashboard/client/requests"
            className="rounded border border-[#143b28] px-5 py-3 text-sm text-white/70 hover:bg-white/5"
          >
            Return to requests
          </Link>
        </div>
      </div>
    </div>
  )
}