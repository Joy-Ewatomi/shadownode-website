"use client"

import Link from "next/link"
import {
  Award,
  Download,
  ExternalLink,
  Printer,
  ShieldCheck,
} from "lucide-react"

import { useClientNotifications } from "@/components/notifications/ClientNotificationProvider"

export type ClientCertificateListItem = {
  id: string
  training_engagement_id: string
  training_participant_id: string | null
  certificate_number: string
  recipient_name: string
  organization_name: string | null
  training_title: string
  training_type: string | null
  issued_at: string | null
  status: string | null
  verification_url: string | null
  engagement_number: string | null
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function ClientCertificateList({
  certificates,
}: {
  certificates: ClientCertificateListItem[]
}) {
  const { getUnreadForResource } = useClientNotifications()

  function printCertificate(certificate: ClientCertificateListItem) {
    const url = `/dashboard/training/${certificate.training_engagement_id}/certificate?certificateId=${certificate.id}&print=1`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  if (certificates.length === 0) {
    return (
      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-8 text-center">
        <Award className="mx-auto h-9 w-9 text-[#20dc73]" />
        <h2 className="mt-4 text-lg font-semibold text-white">
          No certificates issued yet
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/45">
          Certificates will appear here once an authorized trainer
          or super administrator issues them after training completion.
        </p>
      </div>
    )
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {certificates.map((certificate) => {
        const certificateUnread =
          getUnreadForResource("certificate", certificate.id)
        const engagementUnread =
          getUnreadForResource(
            "certificate",
            certificate.training_engagement_id,
          )
        const unread =
          certificateUnread + engagementUnread

        return (
          <article
            key={certificate.id}
            className={`rounded-md border bg-[#06110f] p-5 transition ${
              unread > 0
                ? "border-[#20dc73]/40 bg-[#20dc73]/5"
                : "border-[#143b28]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]">
                <Award className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-lg font-semibold text-white">
                    {certificate.recipient_name}
                  </h2>

                  {unread > 0 && (
                    <span className="inline-flex items-center gap-1 rounded border border-[#20dc73]/40 bg-[#20dc73]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#20dc73]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#20dc73]" />
                      NEW{unread > 1 ? ` ${unread}` : ""}
                    </span>
                  )}
                </div>

                {certificate.organization_name && (
                  <p className="mt-1 break-words text-sm text-white/45">
                    of{" "}
                    <span className="text-white/70">
                      {certificate.organization_name}
                    </span>
                  </p>
                )}

                <p className="mt-3 break-words text-sm font-medium text-[#d7b34f]">
                  {certificate.training_title}
                </p>

                {certificate.training_type && (
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/30">
                    {certificate.training_type}
                  </p>
                )}
              </div>
            </div>

            <dl className="mt-5 grid gap-3 rounded-md border border-white/10 bg-black/15 p-4 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Certificate ID
                </dt>
                <dd className="mt-1 break-words font-mono text-xs text-white/70">
                  {certificate.certificate_number}
                </dd>
              </div>

              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Issue Date
                </dt>
                <dd className="mt-1 text-sm text-white/70">
                  {formatDate(certificate.issued_at)}
                </dd>
              </div>

              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Status
                </dt>
                <dd className="mt-1 text-sm text-white/70">
                  {certificate.status || "issued"}
                </dd>
              </div>

              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Training
                </dt>
                <dd className="mt-1 text-sm text-white/70">
                  {certificate.engagement_number ||
                    certificate.training_engagement_id}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/dashboard/training/${certificate.training_engagement_id}/certificate?certificateId=${certificate.id}`}
                className="inline-flex items-center gap-2 rounded border border-[#20dc73]/40 bg-[#20dc73]/10 px-3 py-2 text-xs font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/15"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Open Certificate
              </Link>

              <Link
                href={`/dashboard/training/${certificate.training_engagement_id}/certificate?certificateId=${certificate.id}`}
                download={`${certificate.certificate_number}.html`}
                className="inline-flex items-center gap-2 rounded border border-white/15 px-3 py-2 text-xs font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Link>

              <button
                type="button"
                onClick={() => printCertificate(certificate)}
                className="inline-flex items-center gap-2 rounded border border-white/15 px-3 py-2 text-xs font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>

              {certificate.verification_url && (
                <Link
                  href={certificate.verification_url}
                  className="inline-flex items-center gap-2 rounded border border-white/15 px-3 py-2 text-xs font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Verify
                </Link>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}
