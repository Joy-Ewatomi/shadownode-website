"use client"

import { useState } from "react"

import CybersecurityTrainingForm, {
  type CybersecurityTrainingFormData,
} from "@/components/client/forms/CybersecurityTrainingForm"

import RequestSubmitted from "@/components/client/RequestSubmitted"

export default function CybersecurityRequestPage() {

  const [submitting, setSubmitting] = useState(false)
  const [submittedRef, setSubmittedRef] =
    useState<string | null>(null)

  async function handleSubmit(
    data: CybersecurityTrainingFormData,
  ) {
    setSubmitting(true)

    try {
      const res = await fetch(
        "/api/client/requests/cybersecurity",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      )

      const result = await res.json()

      if (!res.ok) {
        alert(
          result.error ||
            "Failed to submit cybersecurity request",
        )
        return
      }

      setSubmittedRef(
        result.case_number || result.id,
      )
    } catch (error) {
      console.error(
        "CYBERSECURITY SUBMISSION ERROR:",
        error,
      )

      alert(
        "Unable to submit cybersecurity request. Please try again.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedRef) {
    return (
      <div className="space-y-6">
        <header className="border-b border-[#143b28] pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
            ShadowNode Operations
          </p>

          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Cybersecurity Request Submitted
          </h1>

          <p className="mt-2 text-sm text-white/55">
            Your cybersecurity training request has
            been securely submitted.
          </p>
        </header>

        <RequestSubmitted
          referenceId={submittedRef}
        />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
              ShadowNode Operations
            </p>

            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Cybersecurity Training Request
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-white/55">
              Tell us about your organization,
              participants, objectives and training
              requirements.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/dashboard/client/requests"
            }}
            className="rounded border border-[#143b28] px-4 py-2 text-sm text-white/60 transition hover:border-[#20dc73] hover:text-[#20dc73]"
          >
            ← Back to Requests
          </button>
        </div>
      </header>

      <CybersecurityTrainingForm
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  )
}