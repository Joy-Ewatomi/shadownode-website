"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

import CybersecurityTrainingForm, { type CybersecurityTrainingFormData } from "@/components/client/forms/CybersecurityTrainingForm"
import OsintRequestForm, { type InvestigationFormData } from "@/components/client/forms/OsintRequestForm"
import CustomRequestForm, { type CustomRequestData } from "@/components/requests/CustomRequestForm"

export default function AnonymousServiceRequestPage() {
  const params = useParams<{ service: string }>()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const service = params.service

  async function submit(data: InvestigationFormData | CybersecurityTrainingFormData | CustomRequestData) {
    setSubmitting(true)
    try {
      const payload = {
        ...data,
        evidence_files: "evidence_files" in data
          ? data.evidence_files.map(({ file: _file, ...metadata }) => metadata)
          : undefined,
      }
      const response = await fetch("/api/requests/anonymous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (!response.ok) {
        window.alert(result.error || "Unable to submit the request.")
        return
      }

      router.push(`/status/${result.token}`)
    } catch (error) {
      console.error("ANONYMOUS REQUEST SUBMISSION ERROR:", error)
      window.alert("Unable to submit the request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (service === "cybersecurity") {
    return <CybersecurityTrainingForm anonymous submitting={submitting} onSubmit={submit} />
  }

  if (service === "custom") {
    return <CustomRequestForm submitting={submitting} onSubmit={submit} />
  }

  if (service === "osint") {
    return <OsintRequestForm anonymous submitting={submitting} onSubmit={submit} />
  }

  router.replace("/request/anonymous")
  return null
}
