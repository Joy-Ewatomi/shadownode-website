"use client"

import { ArrowRight, Search, Shield } from "lucide-react"

type Props = {
  onSelect: (service: "osint" | "cybersecurity") => void
}

export default function RequestServiceSelector({ onSelect }: Props) {
  return (
    <div className="rounded-md border border-[#143b28] bg-[#06110f]">
      <div className="border-b border-[#143b28] px-6 py-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
          Create New Request
        </p>

        <h2 className="mt-2 text-2xl font-bold text-white">
          Choose a Service
        </h2>

        <p className="mt-2 text-sm text-white/55">
          Select the service you need. You'll be guided through a request form
          tailored to that service.
        </p>
      </div>

      <div className="space-y-5 p-6">
        {/* OSINT */}

        <button
          type="button"
          onClick={() => onSelect("osint")}
          className="group w-full rounded-md border border-[#143b28] bg-black/30 p-6 text-left transition hover:border-[#20dc73] hover:bg-[#20dc73]/5"
        >
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="rounded-md bg-[#20dc73]/10 p-3">
                <Search className="h-6 w-6 text-[#20dc73]" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">
                  Open Source Intelligence
                </h3>

                <p className="mt-2 text-sm text-white/55">
                  Digital investigations, background verification, fraud
                  analysis, online footprint investigations, due diligence,
                  threat intelligence, and evidence collection.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    "Background Checks",
                    "Fraud Investigation",
                    "Identity Verification",
                    "Digital Footprint",
                    "Threat Intelligence",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded border border-[#143b28] px-2 py-1 text-xs text-white/60"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <ArrowRight className="h-5 w-5 text-white/30 transition group-hover:text-[#20dc73]" />
          </div>
        </button>

        {/* Cybersecurity */}

        <button
          type="button"
          onClick={() => onSelect("cybersecurity")}
          className="group w-full rounded-md border border-[#143b28] bg-black/30 p-6 text-left transition hover:border-[#20dc73] hover:bg-[#20dc73]/5"
        >
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="rounded-md bg-[#20dc73]/10 p-3">
                <Shield className="h-6 w-6 text-[#20dc73]" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">
                  Cybersecurity Services
                </h3>

                <p className="mt-2 text-sm text-white/55">
                  Security awareness training, cybersecurity education,
                  consulting, assessments, and organizational security
                  improvement services.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    "Training",
                    "Awareness",
                    "Consulting",
                    "Assessments",
                    "Guidance",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded border border-[#143b28] px-2 py-1 text-xs text-white/60"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <ArrowRight className="h-5 w-5 text-white/30 transition group-hover:text-[#20dc73]" />
          </div>
        </button>
      </div>
    </div>
  )
}