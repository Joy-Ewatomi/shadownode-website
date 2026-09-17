"use client"

import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Download,
  FileCheck2,
  FileText,
  Fingerprint,
  Link2,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
} from "lucide-react"

export type ReportSection = {
  id: string
  section_type: string | null
  title: string | null
  content: string | null
  order_index: number
}

export type ReportEvidence = {
  id: string
  file_name: string | null
  status: string | null
  sha256_hash: string | null
}

export type ReportEntity = {
  id: string
  name: string | null
  entity_type: string | null
  confidence_score: number | null
  verification_status?: string | null
}

export type CaseReport = {
  id: string
  case_id: string
  title: string
  file_url?: string | null
  summary?: string | null
  executive_summary?: string | null
  report_type?: string | null
  status?: string | null
  classification?: string | null
  created_by?: string | null
  created_by_username?: string | null
  approved_by?: string | null
  approved_by_username?: string | null
  created_at?: string | null
  updated_at?: string | null
  sections?: ReportSection[]
  evidence?: ReportEvidence[]
  entities?: ReportEntity[]
}

const statusStyles: Record<
  string,
  string
> = {
  draft:
    "border-white/15 bg-white/5 text-white/55",

  review:
    "border-yellow-400/30 bg-yellow-400/10 text-yellow-200",

  approved:
    "border-blue-400/30 bg-blue-400/10 text-blue-200",

  delivered:
    "border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]",

  final:
    "border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]",

  published:
    "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
}

function formatLabel(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "—"
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function formatDate(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "—"
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date)
}

function sectionKind(
  section:
    | ReportSection
    | null
    | undefined,
) {
  const type =
    String(
      section?.section_type ||
        "",
    ).toLowerCase()

  if (
    type.includes(
      "finding",
    )
  ) {
    return "finding"
  }

  if (
    type.includes(
      "hypothesis",
    )
  ) {
    return "hypothesis"
  }

  if (
    type.includes(
      "contradiction",
    )
  ) {
    return "contradiction"
  }

  if (
    type.includes(
      "conclusion",
    )
  ) {
    return "conclusion"
  }

  if (
    type.includes(
      "methodology",
    )
  ) {
    return "methodology"
  }

  if (
    type.includes(
      "evidence",
    )
  ) {
    return "evidence"
  }

  return "analysis"
}

function SectionIcon({
  kind,
}: {
  kind: string
}) {
  if (
    kind ===
    "finding"
  ) {
    return (
      <CheckCircle2 className="h-4 w-4 text-[#20dc73]" />
    )
  }

  if (
    kind ===
    "contradiction"
  ) {
    return (
      <AlertTriangle className="h-4 w-4 text-yellow-300" />
    )
  }

  if (
    kind ===
    "hypothesis"
  ) {
    return (
      <CircleAlert className="h-4 w-4 text-blue-300" />
    )
  }

  if (
    kind ===
    "methodology"
  ) {
    return (
      <Fingerprint className="h-4 w-4 text-[#20dc73]" />
    )
  }

  if (
    kind ===
    "evidence"
  ) {
    return (
      <FileCheck2 className="h-4 w-4 text-[#20dc73]" />
    )
  }

  if (
    kind ===
    "conclusion"
  ) {
    return (
      <ShieldCheck className="h-4 w-4 text-[#20dc73]" />
    )
  }

  return (
    <FileText className="h-4 w-4 text-white/45" />
  )
}

function SectionBadge({
  kind,
}: {
  kind: string
}) {
  const label =
    kind ===
    "finding"
      ? "Finding"
      : kind ===
          "hypothesis"
        ? "Hypothesis"
        : kind ===
            "contradiction"
          ? "Unresolved / Contradiction"
          : kind ===
              "methodology"
            ? "Methodology"
            : kind ===
                "conclusion"
              ? "Conclusion"
              : kind ===
                  "evidence"
                ? "Evidence Assessment"
                : "Analyst Analysis"

  const classes =
    kind ===
    "finding"
      ? "border-[#20dc73]/25 bg-[#20dc73]/8 text-[#7af2a9]"
      : kind ===
          "hypothesis"
        ? "border-blue-400/25 bg-blue-400/8 text-blue-200"
        : kind ===
            "contradiction"
          ? "border-yellow-400/25 bg-yellow-400/8 text-yellow-200"
          : "border-white/10 bg-white/5 text-white/45"

  return (
    <span
      className={`rounded border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${classes}`}
    >
      {label}
    </span>
  )
}

export default function ReportViewer({
  report,
}: {
  report: CaseReport
}) {
  const status =
    String(
      report.status ||
        "draft",
    ).toLowerCase()

  const sections =
    [...(report.sections || [])]
      .sort(
        (a, b) =>
          Number(
            a.order_index || 0,
          ) -
          Number(
            b.order_index || 0,
          ),
      )

  const evidence =
    report.evidence ||
    []

  const entities =
    report.entities ||
    []

  const executiveSummary =
    report.executive_summary ??
    report.summary ??
    ""

  const classification =
    report.classification ||
    "confidential"

  const approved =
    [
      "approved",
      "delivered",
      "final",
      "published",
    ].includes(status)

  return (
    <article className="overflow-hidden rounded-xl border border-[#143b28] bg-[#020604]">
      {/* ============================================================
          DOCUMENT CONTROL HEADER
      ============================================================ */}

      <header className="border-b border-[#143b28] bg-[linear-gradient(180deg,rgba(32,220,115,0.055),transparent)]">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded border border-[#20dc73]/25 bg-[#20dc73]/7 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#20dc73]">
                  <ShieldCheck className="h-3 w-3" />
                  ShadowNode Intelligence
                </span>

                <span
                  className={`rounded border px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] ${
                    statusStyles[
                      status
                    ] ||
                    statusStyles.draft
                  }`}
                >
                  {formatLabel(
                    status,
                  )}
                </span>

                <a
                  href={`/api/reports/${encodeURIComponent(report.id)}/export`}
                  className="inline-flex items-center gap-1.5 rounded border border-[#20dc73]/25 px-2.5 py-1 text-[9px] uppercase tracking-[0.1em] text-[#20dc73] transition hover:bg-[#20dc73]/10"
                >
                  <Download className="h-3 w-3" />
                  Download Word
                </a>
              </div>

              <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">
                Investigative Report
              </p>

              <h2 className="mt-2 max-w-4xl break-words text-2xl font-bold leading-tight text-white sm:text-3xl">
                {report.title ||
                  "Untitled Investigation Report"}
              </h2>

              <p className="mt-2 text-sm text-white/40">
                {formatLabel(
                  report.report_type ||
                    "intelligence",
                )}
              </p>
            </div>

            <div className="shrink-0 rounded-lg border border-[#143b28] bg-black/30 p-4 lg:w-64">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-[#20dc73]" />

                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#20dc73]">
                  Document Control
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <ControlRow
                  label="Report ID"
                  value={report.id}
                  mono
                />

                <ControlRow
                  label="Case ID"
                  value={report.case_id}
                  mono
                />

                <ControlRow
                  label="Classification"
                  value={formatLabel(
                    classification,
                  )}
                />

                <ControlRow
                  label="Created"
                  value={formatDate(
                    report.created_at,
                  )}
                />

                <ControlRow
                  label="Updated"
                  value={formatDate(
                    report.updated_at,
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CLASSIFICATION STRIP */}

        <div className="border-t border-[#143b28] bg-black/25 px-5 py-2.5 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">
              {formatLabel(
                classification,
              )} — Controlled Intelligence
            </span>

            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/20">
              ShadowNode Operations Bureau Limited
            </span>
          </div>
        </div>
      </header>

      {/* ============================================================
          REVIEW / PROVENANCE NOTICE
      ============================================================ */}

      <section className="border-b border-yellow-400/15 bg-yellow-400/[0.025] px-5 py-4 sm:px-7">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-yellow-200">
              Investigative Status Notice
            </p>

            <p className="mt-1 text-xs leading-5 text-white/45">
              This document is an investigative
              work product. Its findings must be
              assessed against the underlying
              evidence, source material, collection
              records, and applicable legal
              requirements before being relied upon
              in formal proceedings.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          EXECUTIVE SUMMARY
      ============================================================ */}

      {executiveSummary ? (
        <section className="border-b border-[#143b28] p-5 sm:p-7">
          <SectionHeading
            icon={
              <FileText className="h-4 w-4 text-[#20dc73]" />
            }
            eyebrow="01"
            title="Executive Summary"
          />

          <div className="mt-5 rounded-lg border border-[#17462f] bg-[#06110f] p-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-white/70">
              {executiveSummary}
            </p>
          </div>
        </section>
      ) : null}

      {/* ============================================================
          INVESTIGATION SNAPSHOT
      ============================================================ */}

      <section className="border-b border-[#143b28] p-5 sm:p-7">
        <SectionHeading
          icon={
            <Fingerprint className="h-4 w-4 text-[#20dc73]" />
          }
          eyebrow="02"
          title="Investigation Snapshot"
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SnapshotCard
            label="Entities"
            value={entities.length}
            icon={
              <Fingerprint className="h-4 w-4" />
            }
          />

          <SnapshotCard
            label="Evidence Items"
            value={evidence.length}
            icon={
              <FileCheck2 className="h-4 w-4" />
            }
          />

          <SnapshotCard
            label="Report Sections"
            value={sections.length}
            icon={
              <FileText className="h-4 w-4" />
            }
          />

          <SnapshotCard
            label="Verification"
            value={
              approved
                ? "Approved"
                : formatLabel(
                    status,
                  )
            }
            icon={
              <ShieldCheck className="h-4 w-4" />
            }
          />
        </div>
      </section>

      {/* ============================================================
          REPORT CONTENT
      ============================================================ */}

      {sections.length ? (
        <section className="border-b border-[#143b28] p-5 sm:p-7">
          <SectionHeading
            icon={
              <FileText className="h-4 w-4 text-[#20dc73]" />
            }
            eyebrow="03"
            title="Report Analysis"
          />

          <div className="mt-6 space-y-5">
            {sections.map(
              (
                section,
                index,
              ) => {
                const kind =
                  sectionKind(
                    section,
                  )

                return (
                  <section
                    key={
                      section.id ||
                      `${section.title}-${index}`
                    }
                    className="overflow-hidden rounded-xl border border-[#143b28] bg-[#06110f]"
                  >
                    <div className="border-b border-white/6 bg-black/20 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-white/8 bg-black/30">
                          <SectionIcon
                            kind={kind}
                          />
                        </div>

                        <SectionBadge
                          kind={kind}
                        />

                        <span className="font-mono text-[9px] text-white/20">
                          SEC{" "}
                          {String(
                            index + 1,
                          ).padStart(
                            2,
                            "0",
                          )}
                        </span>
                      </div>

                      <h3 className="mt-3 text-base font-semibold text-white">
                        {section.title ||
                          "Untitled Section"}
                      </h3>
                    </div>

                    <div className="px-4 py-5">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-white/65">
                        {section.content ||
                          "No content recorded for this section."}
                      </p>
                    </div>
                  </section>
                )
              },
            )}
          </div>
        </section>
      ) : null}

      {/* ============================================================
          ENTITY REGISTER
      ============================================================ */}

      {entities.length ? (
        <section className="border-b border-[#143b28] p-5 sm:p-7">
          <SectionHeading
            icon={
              <Fingerprint className="h-4 w-4 text-[#20dc73]" />
            }
            eyebrow="04"
            title="Investigative Entity Register"
          />

          <div className="mt-5 overflow-hidden rounded-lg border border-[#143b28]">
            <div className="hidden grid-cols-[1fr_10rem_8rem_8rem] border-b border-[#143b28] bg-black/30 px-4 py-3 text-[9px] uppercase tracking-[0.12em] text-white/25 sm:grid">
              <span>Entity</span>
              <span>Type</span>
              <span>Confidence</span>
              <span>Verification</span>
            </div>

            <div className="divide-y divide-white/6">
              {entities.map(
                (entity) => (
                  <div
                    key={
                      entity.id
                    }
                    className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_10rem_8rem_8rem] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-white">
                        {entity.name ||
                          "Unnamed entity"}
                      </p>

                      <p className="mt-1 break-all font-mono text-[9px] text-white/20">
                        {entity.id}
                      </p>
                    </div>

                    <div className="text-xs text-white/45">
                      {formatLabel(
                        entity.entity_type,
                      )}
                    </div>

                    <div className="text-xs font-mono text-white/55">
                      {entity.confidence_score ===
                      null ||
                      entity.confidence_score ===
                        undefined
                        ? "—"
                        : `${entity.confidence_score}%`}
                    </div>

                    <div>
                      <VerificationBadge
                        status={
                          entity.verification_status
                        }
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* ============================================================
          EVIDENCE REGISTER
      ============================================================ */}

      {evidence.length ? (
        <section className="border-b border-[#143b28] p-5 sm:p-7">
          <SectionHeading
            icon={
              <FileCheck2 className="h-4 w-4 text-[#20dc73]" />
            }
            eyebrow="05"
            title="Evidence Register"
          />

          <div className="mt-5 space-y-3">
            {evidence.map(
              (
                item,
                index,
              ) => (
                <div
                  key={
                    item.id
                  }
                  className="rounded-lg border border-[#143b28] bg-[#06110f] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#17462f] bg-black/30">
                        <FileText className="h-4 w-4 text-[#20dc73]" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#20dc73]">
                            Exhibit{" "}
                            {String(
                              index + 1,
                            ).padStart(
                              3,
                              "0",
                            )}
                          </span>

                          <VerificationBadge
                            status={
                              item.status
                            }
                          />
                        </div>

                        <p className="mt-2 break-words text-sm font-semibold text-white">
                          {item.file_name ||
                            "Evidence file"}
                        </p>

                        <p className="mt-1 break-all font-mono text-[9px] text-white/20">
                          {item.id}
                        </p>
                      </div>
                    </div>

                    <div className="lg:max-w-md">
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/20">
                        SHA-256
                      </p>

                      <p className="mt-1 break-all font-mono text-[10px] leading-5 text-white/50">
                        {item.sha256_hash ||
                          "Hash not recorded in report data."}
                      </p>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}

      {/* ============================================================
          REPORT AUTHORIZATION
      ============================================================ */}

      <section className="border-b border-[#143b28] p-5 sm:p-7">
        <SectionHeading
          icon={
            <UserCheck className="h-4 w-4 text-[#20dc73]" />
          }
          eyebrow="06"
          title="Preparation & Authorization"
        />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <ControlPanel
            label="Prepared By"
            value={
              report.created_by_username ||
              report.created_by ||
              "Not recorded"
            }
            icon={
              <UserCheck className="h-4 w-4" />
            }
          />

          <ControlPanel
            label="Approved By"
            value={
              report.approved_by_username ||
              report.approved_by ||
              "Not yet approved"
            }
            icon={
              <ShieldCheck className="h-4 w-4" />
            }
          />
        </div>
      </section>

      {/* ============================================================
          AI DISCLOSURE
      ============================================================ */}

      <section className="border-b border-[#143b28] bg-[#06110f] p-5 sm:p-7">
        <div className="rounded-xl border border-[#17462f] bg-black/25 p-5">
          <div className="flex items-start gap-3">
            <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-[#20dc73]" />

            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#20dc73]">
                AI Assistance Disclosure
              </p>

              <h3 className="mt-2 text-sm font-semibold text-white">
                Analytical assistance was used in preparation
              </h3>

              <p className="mt-2 text-xs leading-6 text-white/40">
                AI-assisted analysis may have been used
                to organize, summarize, compare, or draft
                material from the investigation record.
                The AI system is not treated as an
                independent evidentiary source. The
                underlying investigation data, source
                material, evidence, and human review remain
                the basis for investigative conclusions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          REPORT INTEGRITY NOTICE
      ============================================================ */}

      <footer className="bg-black/30 p-5 sm:p-7">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/20">
              Report Integrity
            </p>

            <p className="mt-2 text-xs leading-5 text-white/35">
              Report content should be evaluated together
              with the underlying evidence register,
              source records, collection history, hashes,
              and applicable chain-of-custody records.
            </p>
          </div>

          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/20">
              Legal Caution
            </p>

            <p className="mt-2 text-xs leading-5 text-white/35">
              Professional formatting and provenance
              controls do not by themselves establish
              admissibility in court. Applicable evidentiary
              and procedural requirements must be assessed
              for the relevant jurisdiction.
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-white/6 pt-4">
          <div className="flex flex-col gap-2 text-[9px] uppercase tracking-[0.12em] text-white/15 sm:flex-row sm:items-center sm:justify-between">
            <span>
              ShadowNode Operations Bureau Limited
            </span>

            <span>
              Investigation Record • Report {report.id}
            </span>
          </div>
        </div>
      </footer>
    </article>
  )
}

function SectionHeading({
  icon,
  eyebrow,
  title,
}: {
  icon: React.ReactNode
  eyebrow: string
  title: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#17462f] bg-[#081b11]">
        {icon}
      </div>

      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/20">
          {eyebrow}
        </p>

        <h3 className="text-base font-semibold text-white">
          {title}
        </h3>
      </div>
    </div>
  )
}

function ControlRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.12em] text-white/20">
        {label}
      </p>

      <p
        className={`mt-1 break-all text-[10px] text-white/55 ${
          mono
            ? "font-mono"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function SnapshotCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-[#143b28] bg-[#06110f] p-4">
      <div className="flex items-center justify-between">
        <span className="text-white/30">
          {icon}
        </span>

        <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/20">
          Record
        </span>
      </div>

      <p className="mt-4 font-mono text-xl font-semibold text-white">
        {value}
      </p>

      <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/25">
        {label}
      </p>
    </div>
  )
}

function VerificationBadge({
  status,
}: {
  status:
    | string
    | null
    | undefined
}) {
  const normalized =
    String(
      status ||
        "unverified",
    ).toLowerCase()

  const verified =
    normalized ===
      "verified" ||
    normalized ===
      "confirmed" ||
    normalized ===
      "corroborated"

  const inferred =
    normalized ===
      "inferred" ||
    normalized ===
      "partially_verified"

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] ${
        verified
          ? "border-[#20dc73]/25 bg-[#20dc73]/8 text-[#7af2a9]"
          : inferred
            ? "border-blue-400/25 bg-blue-400/8 text-blue-200"
            : "border-white/10 bg-white/5 text-white/35"
      }`}
    >
      {verified ? (
        <CheckCircle2 className="h-2.5 w-2.5" />
      ) : inferred ? (
        <CircleAlert className="h-2.5 w-2.5" />
      ) : (
        <CircleAlert className="h-2.5 w-2.5" />
      )}

      {formatLabel(
        normalized,
      )}
    </span>
  )
}

function ControlPanel({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-[#143b28] bg-[#06110f] p-4">
      <div className="flex items-center gap-2 text-white/30">
        {icon}

        <span className="font-mono text-[9px] uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>

      <p className="mt-3 break-words text-sm font-medium text-white/70">
        {value}
      </p>
    </div>
  )
}
