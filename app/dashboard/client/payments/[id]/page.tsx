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
  approved_quote_amount?:
    | number
    | string
    | null
  approved_quote_currency?:
    | string
    | null
  converted_case_id?:
    | string
    | null
  training_engagement_id?:
    | string
    | null
  status?: string | null
  commercial_history?: { status?: string | null } | null
}

type PaymentProvider = "paystack" | "flutterwave"

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

  const [provider, setProvider] = useState<PaymentProvider>("paystack")
  const [providers, setProviders] = useState({ paystack: true, flutterwave: false })

  const [
    error,
    setError,
  ] = useState("")

  const searchParams =
    useSearchParams()

  const paymentResult =
    searchParams.get("payment")

  const paymentType =
    searchParams.get(
      "payment_type",
    )

  // =========================================================
  // LOAD REQUEST
  // =========================================================

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const resolved =
          await params

        if (cancelled) {
          return
        }

        const response =
          await fetch(
            `/api/client/requests/${resolved.id}`,
            {
              credentials:
                "include",
              cache:
                "no-store",
            },
          )

        const data =
          await response
            .json()
            .catch(
              () => null,
            )

        console.log(
          "PAYMENT PAGE REQUEST STATUS:",
          response.status,
        )

        console.log(
          "PAYMENT PAGE REQUEST DATA:",
          data,
        )

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Payment information unavailable",
          )
        }

        if (!cancelled) {
          setRequest(data)
          const providerResponse = await fetch(`/api/client/payments/providers?request_id=${encodeURIComponent(data.id)}`, { credentials: "include", cache: "no-store" })
          const providerData = await providerResponse.json().catch(() => null)
          if (providerResponse.ok && providerData?.providers) {
            const available = { paystack: Boolean(providerData.providers.paystack?.available), flutterwave: Boolean(providerData.providers.flutterwave?.available) }
            setProviders(available)
            if (!available.paystack && available.flutterwave) setProvider("flutterwave")
          }
        }
      } catch (err) {
        console.error(
          "PAYMENT PAGE LOAD ERROR",
          err,
        )

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load payment details",
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [params])

  // =========================================================
  // MARK NOTIFICATION AS READ
  // =========================================================

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

  // =========================================================
  // INITIALIZE PAYMENT
  // =========================================================

  async function handlePayment() {
    if (
      !request?.id ||
      paying
    ) {
      return
    }

    setPaying(true)
    setError("")

    try {
      const response =
        await fetch(
          provider === "flutterwave" ? "/api/client/payments/flutterwave/initialize" : "/api/client/payments/initialize",
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
        await response
          .json()
          .catch(
            () => null,
          )

      console.log(
        "PAYMENT INITIALIZE STATUS:",
        response.status,
      )

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to initialize payment",
        )
      }

      if (
        !(data?.authorization_url || data?.checkout_url)
      ) {
        throw new Error(
          "The payment provider did not return a checkout URL",
        )
      }

      window.location.assign(data.authorization_url || data.checkout_url)
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

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="p-6 text-sm text-white/45">
        Loading payment workflow...
      </div>
    )
  }

  // =========================================================
  // ERROR
  // =========================================================

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

  // =========================================================
  // PAYMENT STATUS
  // =========================================================

  // Redirect query parameters are informational only. Paid state comes from
  // the server-owned commercial history and verified payment record.
  const isPaid = request.commercial_history?.status === "paid"

  const canPay =
    request.status ===
      "awaiting_payment" ||
    request.status === "approved"

  // =========================================================
  // PAYMENT NOT AVAILABLE
  // =========================================================

  if (
    !canPay &&
    !isPaid
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

  // =========================================================
  // AMOUNT
  // =========================================================

  const amount =
    Number(
      request.approved_quote_amount ||
        0,
    )

  const currency =
    request.approved_quote_currency ||
    "NGN"

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-6 p-6 text-white">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="space-y-2 border-b border-[#143b28] pb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-[#20dc73]">
          Client Payment Workflow
        </p>

        <h1 className="text-3xl font-bold">
          {isPaid
            ? "Payment confirmed"
            : "Pay for "}
          {!isPaid &&
            (
              request.title ||
              "your investigation"
            )}
        </h1>

        <p className="text-sm text-white/55">
          {isPaid
            ? "Your payment has been verified by ShadowNode."
            : "Secure payment is required before your investigation can begin."}
        </p>
      </header>

      {/* =====================================================
          SUCCESS MESSAGE
          ===================================================== */}

      {paymentResult ===
        "success" && isPaid && (
        <div className="rounded-md border border-[#20dc73]/40 bg-[#20dc73]/10 p-5">
          <p className="font-semibold text-[#20dc73]">
            Payment confirmed
          </p>

          <p className="mt-1 text-sm text-white/65">
            Your payment has been verified and
            {paymentType === "training"
              ? " your training engagement is now active."
              : " your investigation is now active."}
          </p>
        </div>
      )}

      {/* =====================================================
          PENDING MESSAGE
          ===================================================== */}

      {paymentResult ===
        "pending" && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-5">
          <p className="font-semibold text-yellow-300">
            Payment is still processing
          </p>

          <p className="mt-1 text-sm text-white/65">
            Paystack has not yet reported a successful payment. Please wait a moment and check again.
          </p>
        </div>
      )}

      {/* =====================================================
          VERIFICATION FAILED
          ===================================================== */}

      {paymentResult ===
        "verification_failed" && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-5">
          <p className="font-semibold text-red-300">
            Payment verification failed
          </p>

          <p className="mt-1 text-sm text-white/65">
            We could not confirm the payment. Your investigation has not been activated.
          </p>
        </div>
      )}

      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* =====================================================
          PAYMENT CARD
          ===================================================== */}

      <div className="space-y-5 rounded-md border border-[#143b28] bg-[#06110f] p-6">
        {/* ===================================================
            AMOUNT + STATUS
            =================================================== */}

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

        {/* ===================================================
            REQUEST
            =================================================== */}

        <div className="rounded border border-[#143b28] bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">
            Request
          </p>

          <p className="mt-2 text-lg font-semibold">
            {request.title ||
              "Investigation Request"}
          </p>
        </div>

        {/* ===================================================
            NEXT STEP
            =================================================== */}

        <div className="rounded border border-[#143b28] bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">
            Next Step
          </p>

          <p className="mt-2 text-sm leading-7 text-white/65">
            {isPaid
              ? paymentType ===
                "training"
                ? "Payment has been confirmed. ShadowNode can now proceed with your training engagement."
                : "Payment has been confirmed. ShadowNode can now proceed with your investigation."
              : "Complete payment through your selected hosted provider. Your request becomes active only after server verification."}
          </p>
        </div>

        {/* ===================================================
            ACTIONS
            =================================================== */}

       {!isPaid && (
         <fieldset className="space-y-3">
           <legend className="text-sm font-semibold text-white">Payment provider</legend>
           <div className="flex flex-wrap gap-3">
             {providers.paystack && <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded border border-[#143b28] px-4 py-3"><input type="radio" name="payment-provider" checked={provider === "paystack"} onChange={() => setProvider("paystack")} /> Paystack</label>}
             {providers.flutterwave && <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded border border-[#143b28] px-4 py-3"><input type="radio" name="payment-provider" checked={provider === "flutterwave"} onChange={() => setProvider("flutterwave")} /> Flutterwave</label>}
           </div>
           {provider === "flutterwave" && <p className="text-sm leading-6 text-white/55">Available payment methods are determined securely by Flutterwave based on your country, currency and merchant configuration.</p>}
         </fieldset>
       )}

       <div className="flex flex-wrap gap-3">
  {!isPaid && (
    <button
      type="button"
      disabled={paying || (!providers.paystack && !providers.flutterwave)}
      onClick={handlePayment}
      className="rounded bg-[#20dc73] px-5 py-3 font-semibold text-black transition hover:bg-[#1bc965] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {paying
        ? `Opening ${provider === "flutterwave" ? "Flutterwave" : "Paystack"}...`
        : `Pay with ${provider === "flutterwave" ? "Flutterwave" : "Paystack"}`}
    </button>
  )}

  {isPaid &&
    request.training_engagement_id && (
      <Link
        href={`/dashboard/training/${request.training_engagement_id}`}
        className="rounded bg-[#20dc73] px-5 py-3 font-semibold text-black transition hover:bg-[#1bc965]"
      >
        Open Training
      </Link>
    )}

  {isPaid &&
    !request.training_engagement_id &&
    request.converted_case_id && (
      <Link
        href={`/dashboard/client/cases/${request.converted_case_id}`}
        className="rounded bg-[#20dc73] px-5 py-3 font-semibold text-black transition hover:bg-[#1bc965]"
      >
        View Investigation
      </Link>
    )}

  {isPaid &&
    !request.training_engagement_id &&
    !request.converted_case_id && (
      <Link
        href="/dashboard/client/cases"
        className="rounded bg-[#20dc73] px-5 py-3 font-semibold text-black transition hover:bg-[#1bc965]"
      >
        View Investigations
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