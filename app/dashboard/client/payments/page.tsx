"use client"

import Link from "next/link"

export default function ClientPaymentsPage() {
  return (
    <div className="space-y-6 p-6 text-white">
      <header className="space-y-2 border-b border-[#143b28] pb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-[#20dc73]">Client Payments</p>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-sm text-white/55">Your payment workflow is now available from notification links and request pages.</p>
      </header>

      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6">
        <p className="text-sm text-white/65">Use the request-specific payment pages to complete payments and upload proof.</p>
        <Link href="/dashboard/client/requests" className="mt-4 inline-flex rounded bg-[#20dc73] px-4 py-2 text-sm font-semibold text-black">
          Go to requests
        </Link>
      </div>
    </div>
  )
}
