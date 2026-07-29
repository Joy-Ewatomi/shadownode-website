"use client"

import { CheckCircle2, FileSpreadsheet } from "lucide-react"
import Link from "next/link"

type Props = {
  referenceId: string
}

export default function RequestSubmitted({ referenceId }: Props) {
  return (
    <div className="rounded-md border border-[#143b28] bg-[#06110f] p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#20dc73] bg-[#20dc73]/10">
        <CheckCircle2 className="h-8 w-8 text-[#20dc73]" />
      </div>

      <h2 className="mt-6 text-2xl font-bold text-white">Request Submitted Successfully</h2>
      <p className="mt-3 max-w-xl mx-auto text-sm text-white/60">
        Thank you for submitting your investigation request to ShadowNode Operations Bureau.
      </p>
      <p className="mt-2 max-w-xl mx-auto text-sm text-white/60">
        Our analysts will review your request.
      </p>
      <p className="mt-2 max-w-xl mx-auto text-sm text-white/60">
        Your official quotation, estimated completion timeline, and next steps will be delivered using your
        selected communication method.
      </p>

      <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-md border border-[#143b28] bg-black/30 px-5 py-3">
        <FileSpreadsheet className="h-5 w-5 text-[#20dc73]" />
        <span className="text-sm text-white/70">Reference ID:</span>
        <span className="font-mono font-bold text-[#20dc73]">{referenceId}</span>
      </div>

      <div className="mt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#20dc73]/30 bg-[#20dc73]/10 px-4 py-2 text-xs uppercase tracking-[0.12em] text-[#20dc73]">
          Status: Awaiting Bureau Review
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/dashboard/client/requests"
          className="inline-flex h-10 items-center gap-2 rounded border border-[#20dc73]/40 px-5 text-sm text-[#20dc73] hover:bg-[#20dc73]/10"
        >
          View My Requests
        </Link>
        <Link
          href="/dashboard/client"
          className="inline-flex h-10 items-center gap-2 rounded bg-[#20dc73] px-5 text-sm font-bold text-black hover:bg-[#20dc73]/80"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
