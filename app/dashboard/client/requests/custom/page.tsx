"use client"

import { useState } from "react"

import RequestSubmitted from "@/components/client/RequestSubmitted"
import CustomRequestForm, { type CustomRequestData } from "@/components/requests/CustomRequestForm"

export default function ClientCustomRequestPage() {
  const [submitting, setSubmitting] = useState(false)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)

  async function submit(data: CustomRequestData) {
    setSubmitting(true)
    try {
      const response = await fetch("/api/client/requests/osint", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await response.json()

      if (!response.ok) {
        window.alert(result.error || "Unable to submit the custom request.")
        return
      }

      setSubmittedRef(result.case_number || result.id)
    } catch (error) {
      console.error("CUSTOM REQUEST SUBMISSION ERROR:", error)
      window.alert("Unable to submit the custom request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedRef) {
    return <RequestSubmitted referenceId={submittedRef} />
  }

  return <CustomRequestForm submitting={submitting} onSubmit={submit} />
}
