"use client"

import RequestServiceSelector from "@/components/client/requests/RequestServiceSelector"

export default function AnonymousRequestPage() {
  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="border-b border-[#143b28] pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
            Secure Intake
          </p>
          <h1 className="mt-2 text-3xl font-bold">Submit a Request</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
            Choose the closest service. No account is required; communication will use the external channel selected in the form.
          </p>
        </header>

        <RequestServiceSelector
          onSelect={(service) => {
            window.location.href = `/request/anonymous/${service}`
          }}
        />
      </div>
    </main>
  )
}
