"use client"

import { useState } from "react"

import RequestSubmitted from "@/components/client/RequestSubmitted"
import CustomRequestForm, { type CustomRequestData } from "@/components/requests/CustomRequestForm"

export default function ClientCustomRequestPage() {
  const [submitting, setSubmitting] = useState(false)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(data: CustomRequestData) {
    setSubmitting(true)
    setNotice(null)
    try {
      const { files, ...payload } = data
      const response = await fetch("/api/client/requests/custom", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        setNotice(result.error || "Unable to submit the custom request.")
        return
      }

      if (files.length > 0) {
        const upload = new FormData()
        files.forEach((file) => upload.append("files", file))
        const uploadResponse = await fetch(`/api/client/requests/${encodeURIComponent(result.id)}/evidence`, {
          method: "POST",
          credentials: "include",
          body: upload,
        })
        if (!uploadResponse.ok) {
          setNotice("Your request was submitted, but one or more supporting files could not be uploaded. You can add them from the request page.")
        }
      }
      setSubmittedRef(result.case_number || result.id)
    } catch {
      setNotice("Unable to submit the custom request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedRef) {
    return (
      <>
        {notice && <p role="status" className="mx-auto mt-6 max-w-3xl rounded-md border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">{notice}</p>}
        <RequestSubmitted referenceId={submittedRef} />
      </>
    )
  }

  return (
    <>
      {notice && <p role="alert" className="mx-auto mt-6 max-w-3xl rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{notice}</p>}
      <CustomRequestForm submitting={submitting} onSubmit={submit} />
    </>
  )
}
