"use client"

import { useState } from "react"

import OsintRequestForm, {
  type InvestigationFormData,
} from "@/components/client/forms/OsintRequestForm"

import RequestSubmitted from "@/components/client/RequestSubmitted"

export default function OsintRequestPage() {
  const [submitting, setSubmitting] = useState(false)
  const [submittedRef, setSubmittedRef] =
    useState<string | null>(null)

  async function handleSubmit(
    data: InvestigationFormData,
  ) {
    setSubmitting(true)

    try {
      const evidenceFiles = data.evidence_files
        .map((item) => item.file)
        .filter((file): file is File => file instanceof File)

      const requestPayload = {
        ...data,
        // Evidence metadata is written only after the server has stored and
        // hashed each binary file.
        evidence_files: [],
      }

      const res = await fetch(
        "/api/client/requests/osint",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestPayload),
        },
      )

      const result = await res.json()

      if (!res.ok) {
        alert(
          result.error ||
            "Failed to submit OSINT request",
        )
        return
      }

      if (evidenceFiles.length > 0) {
        const evidenceBody = new FormData()
        evidenceFiles.forEach((file) => {
          evidenceBody.append("files", file)
        })

        const evidenceResponse = await fetch(
          `/api/client/requests/${result.id}/evidence`,
          {
            method: "POST",
            credentials: "include",
            body: evidenceBody,
          },
        )

        if (!evidenceResponse.ok) {
          const evidenceResult = await evidenceResponse
            .json()
            .catch(() => ({}))

          alert(
            evidenceResult.error ||
              "Your request was submitted, but its evidence files could not be uploaded. Contact operations before the request is reviewed.",
          )
        }
      }

      setSubmittedRef(
        result.case_number || result.id,
      )
    } catch (error) {
      console.error(
        "OSINT SUBMISSION ERROR:",
        error,
      )

      alert(
        "Unable to submit OSINT request. Please try again.",
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
            OSINT Request Submitted
          </h1>

          <p className="mt-2 text-sm text-white/55">
            Your investigation request has been
            securely submitted.
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
              OSINT Investigation Request
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-white/55">
              Provide the information required for
              ShadowNode analysts to assess your
              investigation.
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

      <OsintRequestForm
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  )
}
