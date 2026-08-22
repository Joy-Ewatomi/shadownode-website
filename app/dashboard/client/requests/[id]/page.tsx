"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function ClientRequestDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const searchParams = useSearchParams()

  useEffect(() => {
    async function load() {
      const resolved = await params

      try {
        const res = await fetch(
          `/api/client/requests/${resolved.id}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        )

        if (!res.ok) {
          setError("Request not found")
          return
        }

        const data = await res.json()

        setRequest(data)
      } catch (err) {
        console.error(err)
        setError("Failed to load request")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params])

  /**
   * -------------------------------------------------------
   * MARK NOTIFICATION AS READ
   * -------------------------------------------------------
   */
  useEffect(() => {
    const notificationId =
      searchParams.get("notificationId")

    if (!notificationId) return

    fetch(
      `/api/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        credentials: "include",
      },
    ).catch(() => undefined)
  }, [searchParams])

  /**
   * -------------------------------------------------------
   * LOADING
   * -------------------------------------------------------
   */
  if (loading) {
    return (
      <div className="p-6 text-sm text-white/45">
        Loading request...
      </div>
    )
  }

  /**
   * -------------------------------------------------------
   * ERROR
   * -------------------------------------------------------
   */
  if (error || !request) {
    return (
      <div className="p-6 text-sm text-red-200">
        {error || "Request not found"}
      </div>
    )
  }

  /**
   * -------------------------------------------------------
   * REQUEST STATUS
   * -------------------------------------------------------
   */
  const status = String(
    request.status || "",
  ).toLowerCase()

  const isPendingBureauReview =
    status === "pending_bureau_review" ||
    status === "submitted" ||
    status === "pending_review"

  const isQuoteSent =
    status === "quote_sent" ||
    status === "revised_quote_sent" ||
    status === "client_decision_pending"

  /**
   * -------------------------------------------------------
   * SUBJECT
   * -------------------------------------------------------
   */
  const subjectType =
    request.subject_type ||
    request.subjectType ||
    null

  const subjectName =
    request.subject_name ||
    request.subjectName ||
    null

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden p-6 text-white">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="space-y-2 border-b border-[#143b28] pb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-[#20dc73]">
          Request Details
        </p>

        <h1 className="break-all text-3xl font-bold">
          {request.title ||
            request.service_type ||
            "Investigation Request"}
        </h1>

        <p className="text-sm text-white/45">
          Review the details of your submitted investigation
          request.
        </p>
      </header>

      {/* =====================================================
          PENDING BUREAU REVIEW
      ===================================================== */}
      {isPendingBureauReview && (
        <div className="mt-6 rounded-lg border border-[#143b28] bg-[#06110f] p-6">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-3 w-3 shrink-0 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]" />

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300">
                Pending Bureau Review
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white">
                Your request is under review
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/55">
                Your investigation request has been received
                and is currently being reviewed by the
                ShadowNode Bureau. No quote or pricing decision
                has been issued yet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          REQUEST DETAILS
      ===================================================== */}
      <section className="mt-6 rounded-lg border border-[#143b28] bg-[#06110f] p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">
            Request Details
          </p>

          <div className="mt-1 h-px bg-[#143b28]" />
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {/* SERVICE */}
          <div className="min-w-0 overflow-hidden rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Service
            </p>

            <p className="mt-2 break-all text-lg font-semibold text-white">
              {request.service_type ||
                request.title ||
                "Investigation request"}
            </p>
          </div>

          {/* OBJECTIVE */}
          <div className="min-w-0 overflow-hidden rounded border border-[#143b28] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Investigation Objective
            </p>

            <p className="mt-2 break-all text-sm leading-7 text-white/65">
              {request.investigation_objective ||
                request.description ||
                "No objective provided."}
            </p>
          </div>

          {/* SUBJECT TYPE */}
          {subjectType && (
            <div className="min-w-0 overflow-hidden rounded border border-[#143b28] bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Subject Type
              </p>

              <p className="mt-2 break-all text-sm font-semibold text-white">
                {subjectType}
              </p>
            </div>
          )}

          {/* SUBJECT NAME */}
          {subjectName && (
            <div className="min-w-0 overflow-hidden rounded border border-[#143b28] bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Subject Name
              </p>

              <p className="mt-2 break-all text-sm font-semibold text-white">
                {subjectName}
              </p>
            </div>
          )}

          {/* DESCRIPTION */}
          {request.description &&
            request.description !==
              request.investigation_objective && (
              <div className="min-w-0 overflow-hidden rounded border border-[#143b28] bg-black/30 p-4 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                  Additional Information
                </p>

                <p className="mt-2 break-all text-sm leading-7 text-white/65">
                  {request.description}
                </p>
              </div>
            )}
        </div>
      </section>

      {/* =====================================================
          QUOTE AREA
          ONLY SHOW AFTER BUREAU HAS SENT A QUOTE
      ===================================================== */}
      {isQuoteSent && (
        <section className="mt-6 rounded-lg border border-[#143b28] bg-[#06110f] p-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Quote
            </p>

            <div className="mt-1 h-px bg-[#143b28]" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* APPROVED QUOTE */}
            <div className="rounded border border-[#143b28] bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Approved Quote
              </p>

              <p className="mt-2 text-2xl font-semibold text-[#20dc73]">
                {request.approved_quote_currency ||
                  request.preferred_currency ||
                  "NGN"}{" "}
                {Number(
                  request.approved_quote_amount || 0,
                ).toLocaleString()}
              </p>
            </div>

            {/* TIMELINE */}
            <div className="rounded border border-[#143b28] bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Estimated Completion
              </p>

              <p className="mt-2 text-lg text-white">
                {request.approved_estimated_completion ||
                  "To be confirmed"}
              </p>
            </div>

            {/* NOTES */}
            <div className="rounded border border-[#143b28] bg-black/30 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Bureau Notes
              </p>

              <p className="mt-2 break-all text-sm leading-7 text-white/65">
                {request.approved_quote_notes ||
                  "No additional notes provided."}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          BACK
      ===================================================== */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/client/requests"
          className="rounded border border-[#143b28] px-4 py-2 text-sm text-white/70 transition hover:border-[#20dc73] hover:text-white"
        >
          Back to requests
        </Link>
      </div>
    </div>
  )
}