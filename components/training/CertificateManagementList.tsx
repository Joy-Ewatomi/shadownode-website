"use client"

import { Award, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import CertificateDownloadActions from "@/components/training/CertificateDownloadActions"

export type CertificateParticipant = {
  id: string
  certificateName: string
  email: string | null
  eligible: boolean
  certificateId: string | null
  certificateNumber: string | null
  certificateStatus: string | null
}

export default function CertificateManagementList({
  engagementId,
  participants,
  canIssue,
}: {
  engagementId: string
  participants: CertificateParticipant[]
  canIssue: boolean
}) {
  const router = useRouter()
  const [issuing, setIssuing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function issue(participantId: string) {
    if (issuing) return
    setIssuing(participantId)
    setError(null)
    try {
      const response = await fetch(`/api/training/${encodeURIComponent(engagementId)}/certificate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_id: participantId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Unable to issue certificate.")
      router.refresh()
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : "Unable to issue certificate.")
    } finally {
      setIssuing(null)
    }
  }

  if (!participants.length) {
    return <div className="rounded-md border border-[#143b28] bg-[#06110f] p-8 text-sm text-white/50">No training participants are available.</div>
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      {participants.map((participant) => (
        <article key={participant.id} className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"><Award className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0">
                <h2 className="break-words font-semibold text-white">{participant.certificateName}</h2>
                {participant.email && <p className="mt-1 break-all text-xs text-white/35">{participant.email}</p>}
                <p className="mt-2 font-mono text-xs text-white/45">{participant.certificateNumber || (participant.eligible ? "Eligible for issuance" : "Not currently eligible")}</p>
              </div>
            </div>
            <div className="w-full shrink-0 sm:w-auto sm:min-w-72">
              {participant.certificateId && participant.certificateStatus === "issued" ? (
                <CertificateDownloadActions engagementId={engagementId} certificateId={participant.certificateId} />
              ) : canIssue && participant.eligible ? (
                <button type="button" disabled={Boolean(issuing)} onClick={() => issue(participant.id)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#20dc73] px-4 text-sm font-semibold text-black disabled:cursor-wait disabled:opacity-60">
                  {issuing === participant.id && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                  {issuing === participant.id ? "Issuing..." : "Issue certificate"}
                </button>
              ) : (
                <p className="rounded-md border border-white/10 px-3 py-3 text-center text-xs text-white/40">No certificate download is available.</p>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
