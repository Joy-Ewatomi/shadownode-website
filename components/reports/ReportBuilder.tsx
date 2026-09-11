"use client"

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleAlert,
  Eye,
  FilePlus2,
  FileText,
  Link2,
  Loader2,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import ReportEditor from "./ReportEditor"
import ReportViewer, {
  CaseReport,
  ReportSection,
} from "./ReportViewer"

type EvidenceOption = {
  id: string
  file_name: string | null
  status: string | null
  sha256_hash: string | null
}

type EntityOption = {
  id: string
  name: string | null
  entity_type: string | null
  confidence_score: number | null
}

type Readiness = {
  ready: boolean
  score: number
  entity_count: number
  relationship_count: number
  source_count: number
  observation_count: number
  evidence_count: number
  timeline_count: number
  missing: string[]
}

type ReportPayload = {
  reports: CaseReport[]
  evidence: EvidenceOption[]
  entities: EntityOption[]
  readiness?: Readiness
}

type LocalSection = ReportSection & {
  id: string
  section_type: string | null
  title: string | null
  content: string | null
  order_index: number
}

const reportStatuses = [
  "draft",
  "review",
  "approved",
  "delivered",
  "final",
  "published",
]

const lockedStatuses = new Set([
  "approved",
  "delivered",
  "final",
  "published",
])

const statusLabels: Record<
  string,
  string
> = {
  draft: "Draft",
  review: "Under Review",
  approved: "Approved",
  delivered: "Delivered",
  final: "Final",
  published: "Published",
}

const statusClasses: Record<
  string,
  string
> = {
  draft:
    "border-white/15 bg-white/5 text-white/55",

  review:
    "border-yellow-400/25 bg-yellow-400/10 text-yellow-200",

  approved:
    "border-blue-400/25 bg-blue-400/10 text-blue-200",

  delivered:
    "border-[#20dc73]/25 bg-[#20dc73]/10 text-[#20dc73]",

  final:
    "border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]",

  published:
    "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",
}

function formatStatus(
  value:
    | string
    | null
    | undefined,
) {
  const normalized =
    String(
      value || "draft",
    ).toLowerCase()

  return (
    statusLabels[
      normalized
    ] ||
    normalized
  )
}

function normalizeSection(
  section: ReportSection,
  index: number,
): LocalSection {
  return {
    id:
      String(
        section.id ||
          `section-${index}`,
      ),

    section_type:
      section.section_type ||
      "analysis",

    title:
      section.title ||
      "Untitled Section",

    content:
      section.content ||
      "",

    order_index:
      Number(
        section.order_index ??
          index,
      ),
  }
}

export default function ReportBuilder({
  caseId,
}: {
  caseId: string
}) {
  const [payload, setPayload] =
    useState<ReportPayload>({
      reports: [],
      evidence: [],
      entities: [],
    })

  const [
    selectedReportId,
    setSelectedReportId,
  ] = useState("")

  const [loading, setLoading] =
    useState(true)

  const [generating, setGenerating] =
    useState(false)

  const [creating, setCreating] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [message, setMessage] =
    useState("")

  const [error, setError] =
    useState("")

  const [editorMode, setEditorMode] =
    useState(false)

  const [draft, setDraft] =
    useState({
      title: "",
      report_type:
        "intelligence",
      classification:
        "confidential",
      executive_summary:
        "",
    })

  const [section, setSection] =
    useState({
      section_type:
        "analysis",
      title: "",
      content: "",
    })

  const [evidenceId, setEvidenceId] =
    useState("")

  const [entityId, setEntityId] =
    useState("")

  const selectedReport =
    useMemo(
      () =>
        payload.reports.find(
          (report) =>
            report.id ===
            selectedReportId,
        ) ??
        payload.reports[0] ??
        null,

      [
        payload.reports,
        selectedReportId,
      ],
    )

  const selectedStatus =
    String(
      selectedReport?.status ||
        "draft",
    ).toLowerCase()

  const reportLocked =
    lockedStatuses.has(
      selectedStatus,
    )

  async function loadReports(
    preserveSelection = true,
  ) {
    try {
      setError("")

      const res =
        await fetch(
          `/api/cases/${encodeURIComponent(
            caseId,
          )}/reports`,
          {
            credentials:
              "include",

            cache:
              "no-store",
          },
        )

      if (!res.ok) {
        throw new Error(
          "Failed to load investigation reports.",
        )
      }

      const data =
        await res.json()

      const reports =
        Array.isArray(
          data.reports,
        )
          ? data.reports
          : []

      setPayload({
        reports,

        evidence:
          Array.isArray(
            data.evidence,
          )
            ? data.evidence
            : [],

        entities:
          Array.isArray(
            data.entities,
          )
            ? data.entities
            : [],

        readiness:
          data.readiness ||
          undefined,
      })

      const currentSelection =
        preserveSelection
          ? reports.find(
              (
                report: CaseReport,
              ) =>
                report.id ===
                selectedReportId,
            )
          : null

      if (
        currentSelection
      ) {
        setSelectedReportId(
          currentSelection.id,
        )
      } else if (
        reports[0]?.id
      ) {
        setSelectedReportId(
          reports[0].id,
        )
      } else {
        setSelectedReportId("")
      }
    } catch (loadError) {
      console.error(
        "REPORT BUILDER LOAD ERROR",
        loadError,
      )

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load reports.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (caseId) {
      void loadReports(false)
    }
  }, [caseId])

  async function createBlankReport() {
    if (
      !draft.title.trim() ||
      creating
    ) {
      return
    }

    try {
      setCreating(true)
      setError("")
      setMessage("")

      const res =
        await fetch(
          `/api/cases/${encodeURIComponent(
            caseId,
          )}/reports`,
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                title:
                  draft.title.trim(),

                report_type:
                  draft.report_type.trim() ||
                  "intelligence",

                classification:
                  draft.classification.trim() ||
                  "confidential",

                executive_summary:
                  draft.executive_summary.trim() ||
                  null,
              }),
          },
        )

      const data =
        await res.json()

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Failed to create report.",
        )
      }

      if (data?.id) {
        setSelectedReportId(
          String(data.id),
        )
      }

      setDraft({
        title: "",
        report_type:
          "intelligence",
        classification:
          "confidential",
        executive_summary:
          "",
      })

      setMessage(
        "Report draft created.",
      )

      await loadReports()
    } catch (createError) {
      console.error(
        "REPORT CREATE ERROR",
        createError,
      )

      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create report.",
      )
    } finally {
      setCreating(false)
    }
  }

  async function generateAiDraft() {
    if (generating) {
      return
    }

    if (
      payload.readiness &&
      !payload.readiness.ready
    ) {
      setError(
        "This investigation is not ready for AI report generation.",
      )

      return
    }

    try {
      setGenerating(true)
      setError("")
      setMessage("")

      const title =
        draft.title.trim() ||
        undefined

      const res =
        await fetch(
          `/api/cases/${encodeURIComponent(
            caseId,
          )}/reports`,
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "generate_ai_draft",

                title,

                report_type:
                  draft.report_type.trim() ||
                  "intelligence",

                classification:
                  draft.classification.trim() ||
                  "confidential",
              }),
          },
        )

      const data =
        await res.json()

      if (!res.ok) {
        const readinessMessage =
          data?.readiness?.missing?.length
            ? ` Missing: ${data.readiness.missing.join(
                ", ",
              )}.`
            : ""

        throw new Error(
          `${data?.error || "Failed to generate AI report."}${readinessMessage}`,
        )
      }

      if (
        data?.report?.id
      ) {
        setSelectedReportId(
          String(
            data.report.id,
          ),
        )
      }

      setDraft({
        title: "",
        report_type:
          "intelligence",
        classification:
          "confidential",
        executive_summary:
          "",
      })

      setMessage(
        `AI investigation report draft generated${
          data?.model
            ? ` using ${data.model}`
            : ""
        }.`,
      )

      await loadReports()
    } catch (generationError) {
      console.error(
        "AI REPORT GENERATION ERROR",
        generationError,
      )

      setError(
        generationError instanceof Error
          ? generationError.message
          : "Failed to generate AI report.",
      )
    } finally {
      setGenerating(false)
    }
  }

  async function patchReport(
    body: Record<
      string,
      unknown
    >,
  ) {
    if (
      !selectedReport?.id
    ) {
      return null
    }

    try {
      setError("")
      setMessage("")

      const res =
        await fetch(
          `/api/cases/${encodeURIComponent(
            caseId,
          )}/reports`,
          {
            method:
              "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                report_id:
                  selectedReport.id,

                ...body,
              }),
          },
        )

      const data =
        await res.json()

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Failed to update report.",
        )
      }

      /*
       * Keep the returned report immediately available
       * so the editor/preview does not have to wait for
       * another request to display the change.
       */
      if (
        data?.id ||
        data?.report
      ) {
        const returnedReport =
          data.report ||
          data

        if (
          returnedReport?.id
        ) {
          setPayload(
            (
              current,
            ) => ({
              ...current,

              reports:
                current.reports.map(
                  (
                    report,
                  ) =>
                    report.id ===
                    returnedReport.id
                      ? {
                          ...report,
                          ...returnedReport,
                        }
                      : report,
                ),
            }),
          )
        }
      }

      await loadReports()

      return data
    } catch (patchError) {
      console.error(
        "REPORT PATCH ERROR",
        patchError,
      )

      setError(
        patchError instanceof Error
          ? patchError.message
          : "Failed to update report.",
      )

      return null
    }
  }

  async function saveEditedReport({
    title,
    executive_summary,
    sections,
  }: {
    title: string
    executive_summary: string
    sections: LocalSection[]
  }) {
    if (
      !selectedReport?.id ||
      reportLocked
    ) {
      return
    }

    try {
      setSaving(true)
      setError("")
      setMessage("")

      /*
       * Save report-level fields first.
       */
      const reportUpdate =
        await patchReport({
          action:
            "update_report",

          title:
            title.trim(),

          executive_summary:
            executive_summary.trim(),
        })

      if (!reportUpdate) {
        throw new Error(
          "Failed to save report details.",
        )
      }

      /*
       * Existing sections are updated individually.
       * New local sections are inserted through add_section.
       */
      const latestSections =
        selectedReport.sections ||
        []

      for (
        const editedSection of
          sections
      ) {
        const titleValue =
          String(
            editedSection.title ||
              "",
          ).trim()

        const contentValue =
          String(
            editedSection.content ||
              "",
          ).trim()

        if (
          !titleValue ||
          !contentValue
        ) {
          continue
        }

        const isLocalSection =
          editedSection.id.startsWith(
            "local-",
          )

        if (
          isLocalSection
        ) {
          await patchReport({
            action:
              "add_section",

            section_type:
              editedSection.section_type ||
              "analysis",

            title:
              titleValue,

            content:
              contentValue,

            order_index:
              editedSection.order_index,
          })
        } else {
          await patchReport({
            action:
              "update_section",

            section_id:
              editedSection.id,

            section_type:
              editedSection.section_type ||
              "analysis",

            title:
              titleValue,

            content:
              contentValue,
          })
        }
      }

      /*
       * Remove database sections that the editor no longer
       * contains.
       */
      const editedIds =
        new Set(
          sections
            .filter(
              (
                item,
              ) =>
                !item.id.startsWith(
                  "local-",
                ),
            )
            .map(
              (
                item,
              ) =>
                item.id,
            ),
        )

      for (
        const existingSection of
          latestSections
      ) {
        if (
          !editedIds.has(
            existingSection.id,
          )
        ) {
          await patchReport({
            action:
              "delete_section",

            section_id:
              existingSection.id,
          })
        }
      }

      /*
       * Persist final ordering using the database IDs
       * returned after the newly created sections are
       * refreshed.
       */
      await loadReports()

     await loadReports()

const refreshedResponse =
  await fetch(
    `/api/cases/${encodeURIComponent(
      caseId,
    )}/reports`,
    {
      credentials: "include",
      cache: "no-store",
    },
  )

if (refreshedResponse.ok) {
  const refreshedData =
    await refreshedResponse.json()

  const refreshedReport =
    refreshedData.reports?.find(
      (item: CaseReport) =>
        item.id ===
        selectedReport.id,
    )

  if (
    refreshedReport?.sections?.length
  ) {
    await patchReport({
      action:
        "reorder_sections",

      section_ids:
        [...refreshedReport.sections]
          .sort(
            (
              a: ReportSection,
              b: ReportSection,
            ) =>
              Number(
                a.order_index || 0,
              ) -
              Number(
                b.order_index || 0,
              ),
          )
          .map(
            (
              item: ReportSection,
            ) => item.id,
          ),
    })
  }
}
      setEditorMode(false)

      setMessage(
        "Report changes saved successfully.",
      )

      await loadReports()
    } catch (saveError) {
      console.error(
        "REPORT EDITOR SAVE ERROR",
        saveError,
      )

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save report changes.",
      )
    } finally {
      setSaving(false)
    }
  }

  async function addSection() {
    if (
      !selectedReport ||
      reportLocked
    ) {
      return
    }

    if (
      !section.title.trim() ||
      !section.content.trim()
    ) {
      return
    }

    const saved =
      await patchReport({
        action:
          "add_section",

        section_type:
          section.section_type,

        title:
          section.title.trim(),

        content:
          section.content.trim(),

        order_index:
          selectedReport.sections
            ?.length ?? 0,
      })

    if (saved) {
      setSection({
        section_type:
          "analysis",

        title: "",

        content: "",
      })

      setMessage(
        "Report section added.",
      )
    }
  }

  async function attachEvidence() {
    if (
      !selectedReport ||
      reportLocked ||
      !evidenceId
    ) {
      return
    }

    const saved =
      await patchReport({
        action:
          "attach_evidence",

        evidence_id:
          evidenceId,
      })

    if (saved) {
      setEvidenceId("")

      setMessage(
        "Evidence attached to report.",
      )
    }
  }

  async function attachEntity() {
    if (
      !selectedReport ||
      reportLocked ||
      !entityId
    ) {
      return
    }

    const saved =
      await patchReport({
        action:
          "attach_entity",

        entity_id:
          entityId,
      })

    if (saved) {
      setEntityId("")

      setMessage(
        "Investigation entity attached to report.",
      )
    }
  }

  async function changeStatus(
    status: string,
  ) {
    if (
      !selectedReport
    ) {
      return
    }

    if (
      status ===
      selectedStatus
    ) {
      return
    }

    await patchReport({
      action:
        "update_report",

      status,
    })
  }

  const editorReport =
    selectedReport
      ? {
          ...selectedReport,

          executive_summary:
            selectedReport.executive_summary ??
            selectedReport.summary ??
            "",

          sections:
            (
              selectedReport.sections ||
              []
            )
              .map(
                normalizeSection,
              )
              .sort(
                (
                  a,
                  b,
                ) =>
                  a.order_index -
                  b.order_index,
              ),
        }
      : null

  return (
    <section className="rounded-xl border border-[#143b28] bg-[#06110f] p-5 shadow-[0_0_60px_rgba(32,220,115,0.04)] sm:p-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-[#20dc73]/20 bg-[#20dc73]/5 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#20dc73]">
              <ShieldCheck className="h-3 w-3" />
              Intelligence Reports
            </span>

            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/20">
              Case Report System
            </span>
          </div>

          <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl">
            Investigation Report Builder
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            Build evidence-grounded investigative
            reports from the case record, then subject
            the resulting draft to human review and
            controlled approval.
          </p>
        </div>

        <button
          onClick={() => {
            void loadReports()
          }}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#20dc73]/30 bg-black/30 px-4 text-sm font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw
            className={`h-4 w-4 ${
              loading
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh
        </button>
      </div>

      {/* MESSAGES */}

      {message ? (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#20dc73]/20 bg-[#20dc73]/5 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#20dc73]" />

          <p className="text-xs leading-5 text-[#9ef4bd]">
            {message}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />

          <p className="text-xs leading-5 text-red-200">
            {error}
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        {/* LEFT SIDEBAR */}

        <aside className="space-y-5">
          {/* READINESS */}

          <div className="rounded-xl border border-[#143b28] bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/25">
                  Investigation Readiness
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {payload.readiness?.ready
                    ? "Ready for AI drafting"
                    : "Not ready for AI drafting"}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#20dc73]/20 bg-[#20dc73]/5">
                <span className="font-mono text-sm font-bold text-[#20dc73]">
                  {payload.readiness?.score ??
                    0}
                  %
                </span>
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[#20dc73] transition-all"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      payload.readiness
                        ?.score ?? 0,
                    ),
                  )}%`,
                }}
              />
            </div>

            {payload.readiness &&
            !payload.readiness.ready &&
            payload.readiness.missing
              .length ? (
              <div className="mt-4 space-y-2">
                {payload.readiness.missing.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={`${item}-${index}`}
                      className="flex gap-2"
                    >
                      <CircleAlert className="mt-0.5 h-3 w-3 shrink-0 text-yellow-300" />

                      <p className="text-[10px] leading-4 text-white/40">
                        {item}
                      </p>
                    </div>
                  ),
                )}
              </div>
            ) : null}

            {payload.readiness?.ready ? (
              <p className="mt-4 text-[10px] leading-4 text-[#7af2a9]">
                The investigation contains enough
                structured material for an AI-assisted
                report draft.
              </p>
            ) : null}
          </div>

          {/* CREATE */}

          <div className="rounded-xl border border-[#143b28] bg-black/20 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <FilePlus2 className="h-4 w-4 text-[#20dc73]" />
              Create Report
            </h3>

            <div className="mt-4 space-y-3">
              <input
                value={
                  draft.title
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,
                    title:
                      event.target
                        .value,
                  })
                }
                placeholder="Report title"
                className="h-10 w-full rounded-lg border border-[#143b28] bg-black px-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#20dc73]/40"
              />

              <input
                value={
                  draft.report_type
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,
                    report_type:
                      event.target
                        .value,
                  })
                }
                placeholder="Report type"
                className="h-10 w-full rounded-lg border border-[#143b28] bg-black px-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#20dc73]/40"
              />

              <input
                value={
                  draft.classification
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,
                    classification:
                      event.target
                        .value,
                  })
                }
                placeholder="Classification"
                className="h-10 w-full rounded-lg border border-[#143b28] bg-black px-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#20dc73]/40"
              />

              <textarea
                value={
                  draft.executive_summary
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,
                    executive_summary:
                      event.target
                        .value,
                  })
                }
                placeholder="Optional executive summary for a manual draft"
                className="min-h-28 w-full rounded-lg border border-[#143b28] bg-black px-3 py-2 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-[#20dc73]/40"
              />

              <button
                onClick={() => {
                  void createBlankReport()
                }}
                disabled={
                  creating ||
                  !draft.title.trim()
                }
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#20dc73]/30 bg-[#20dc73]/10 text-sm font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}

                Create Blank Draft
              </button>

              <button
                onClick={() => {
                  void generateAiDraft()
                }}
                disabled={
                  generating ||
                  !payload.readiness?.ready
                }
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#20dc73] text-sm font-bold text-black transition hover:bg-[#35ed85] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}

                {generating
                  ? "Generating AI Draft..."
                  : "Generate AI Report Draft"}
              </button>

              <div className="flex items-start gap-2 rounded-lg border border-[#143b28] bg-black/30 p-3">
                <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#20dc73]" />

                <p className="text-[9px] leading-4 text-white/30">
                  AI output is an investigative draft.
                  It must be reviewed by an authorized
                  human investigator or administrator
                  before formal approval.
                </p>
              </div>
            </div>
          </div>

          {/* QUEUE */}

          <div className="rounded-xl border border-[#143b28] bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-white">
                Report Queue
              </h3>

              <span className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[8px] text-white/30">
                {payload.reports.length}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-white/40">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading reports...
                </div>
              ) : null}

              {!loading &&
              !payload.reports.length ? (
                <div className="rounded-lg border border-dashed border-[#143b28] p-4 text-center">
                  <FileText className="mx-auto h-5 w-5 text-white/20" />

                  <p className="mt-2 text-sm text-white/40">
                    No reports drafted yet.
                  </p>
                </div>
              ) : null}

              {payload.reports.map(
                (
                  report,
                ) => {
                  const reportStatus =
                    String(
                      report.status ||
                        "draft",
                    ).toLowerCase()

                  return (
                    <button
                      key={
                        report.id
                      }
                      onClick={() => {
                        setSelectedReportId(
                          report.id,
                        )

                        setEditorMode(
                          false,
                        )

                        setError("")
                        setMessage("")
                      }}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                        selectedReport?.id ===
                        report.id
                          ? "border-[#20dc73]/40 bg-[#20dc73]/8"
                          : "border-[#143b28] bg-[#06110f] hover:border-[#20dc73]/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 break-words text-sm font-semibold text-white">
                          {report.title ||
                            "Untitled report"}
                        </span>

                        <span
                          className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em] ${
                            statusClasses[
                              reportStatus
                            ] ||
                            statusClasses.draft
                          }`}
                        >
                          {formatStatus(
                            reportStatus,
                          )}
                        </span>
                      </div>

                      <p className="mt-2 break-all font-mono text-[8px] text-white/20">
                        {report.id}
                      </p>
                    </button>
                  )
                },
              )}
            </div>
          </div>
        </aside>

        {/* MAIN */}

        <div className="min-w-0 space-y-5">
          {selectedReport ? (
            <>
              {/* REPORT CONTROL BAR */}

              <div className="rounded-xl border border-[#143b28] bg-black/20 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded border border-[#20dc73]/20 bg-[#20dc73]/5 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#20dc73]">
                        <FileText className="h-3 w-3" />
                        Selected Report
                      </span>

                      <span
                        className={`rounded border px-2 py-1 text-[8px] uppercase tracking-[0.12em] ${
                          statusClasses[
                            selectedStatus
                          ] ||
                          statusClasses.draft
                        }`}
                      >
                        {formatStatus(
                          selectedStatus,
                        )}
                      </span>

                      {reportLocked ? (
                        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/30">
                          <ShieldCheck className="h-3 w-3" />
                          Controlled State
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 break-words text-base font-semibold text-white">
                      {selectedReport.title}
                    </p>

                    <p className="mt-1 break-all font-mono text-[8px] text-white/20">
                      {selectedReport.id}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!reportLocked ? (
                      <button
                        onClick={() =>
                          setEditorMode(
                            (
                              current,
                            ) =>
                              !current,
                          )
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#20dc73]/30 bg-[#20dc73]/5 px-3 text-sm font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/10"
                      >
                        <FileText className="h-4 w-4" />

                        {editorMode
                          ? "Close Editor"
                          : "Edit Report"}
                      </button>
                    ) : null}

                    <select
                      value={
                        selectedStatus
                      }
                      disabled={
                        reportLocked ||
                        saving
                      }
                      onChange={(
                        event,
                      ) => {
                        void changeStatus(
                          event.target.value,
                        )
                      }}
                      className="h-10 rounded-lg border border-[#143b28] bg-black px-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {reportStatuses.map(
                        (
                          status,
                        ) => (
                          <option
                            key={
                              status
                            }
                            value={
                              status
                            }
                          >
                            {formatStatus(
                              status,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>

                {/* STATUS FLOW */}

                <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {reportStatuses.map(
                    (
                      status,
                    ) => {
                      const active =
                        status ===
                        selectedStatus

                      return (
                        <div
                          key={
                            status
                          }
                          className={`rounded-lg border px-3 py-2 ${
                            active
                              ? "border-[#20dc73]/30 bg-[#20dc73]/7"
                              : "border-white/6 bg-black/20"
                          }`}
                        >
                          <p
                            className={`font-mono text-[8px] uppercase tracking-[0.1em] ${
                              active
                                ? "text-[#20dc73]"
                                : "text-white/20"
                            }`}
                          >
                            {formatStatus(
                              status,
                            )}
                          </p>
                        </div>
                      )
                    },
                  )}
                </div>
              </div>

              {/* EDITOR */}

              {editorMode &&
              editorReport ? (
                <div className="rounded-xl border border-[#143b28] bg-black/20 p-4 sm:p-5">
                  <ReportEditor
                    report={
                      editorReport
                    }
                    saving={
                      saving
                    }
                    onSave={
                      async ({
                        title,
                        executive_summary,
                        sections,
                      }) => {
                        await saveEditedReport(
                          {
                            title,

                            executive_summary,

                            sections:
                              sections as LocalSection[],
                          },
                        )
                      }
                    }
                  />
                </div>
              ) : null}

              {/* ADD SECTION */}

              {!editorMode &&
              !reportLocked ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-[#143b28] bg-black/20 p-4">
                    <h3 className="flex items-center gap-2 font-semibold text-white">
                      <Plus className="h-4 w-4 text-[#20dc73]" />
                      Add Section
                    </h3>

                    <div className="mt-4 space-y-3">
                      <input
                        value={
                          section.section_type
                        }
                        onChange={(
                          event,
                        ) =>
                          setSection({
                            ...section,

                            section_type:
                              event
                                .target
                                .value,
                          })
                        }
                        placeholder="Section type"
                        className="h-10 w-full rounded-lg border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#20dc73]/40"
                      />

                      <input
                        value={
                          section.title
                        }
                        onChange={(
                          event,
                        ) =>
                          setSection({
                            ...section,

                            title:
                              event
                                .target
                                .value,
                          })
                        }
                        placeholder="Section title"
                        className="h-10 w-full rounded-lg border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#20dc73]/40"
                      />

                      <textarea
                        value={
                          section.content
                        }
                        onChange={(
                          event,
                        ) =>
                          setSection({
                            ...section,

                            content:
                              event
                                .target
                                .value,
                          })
                        }
                        placeholder="Section content"
                        className="min-h-28 w-full rounded-lg border border-[#143b28] bg-black px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-[#20dc73]/40"
                      />

                      <button
                        onClick={() => {
                          void addSection()
                        }}
                        className="h-10 w-full rounded-lg border border-[#20dc73]/30 bg-[#20dc73]/5 text-sm font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/10"
                      >
                        Add Section
                      </button>
                    </div>
                  </div>

                  {/* ATTACH */}

                  <div className="rounded-xl border border-[#143b28] bg-black/20 p-4">
                    <h3 className="flex items-center gap-2 font-semibold text-white">
                      <Link2 className="h-4 w-4 text-[#20dc73]" />
                      Attach Evidence & Entities
                    </h3>

                    <div className="mt-4 space-y-3">
                      <select
                        value={
                          evidenceId
                        }
                        onChange={(
                          event,
                        ) =>
                          setEvidenceId(
                            event
                              .target
                              .value,
                          )
                        }
                        className="h-10 w-full rounded-lg border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
                      >
                        <option value="">
                          Select evidence
                        </option>

                        {payload.evidence.map(
                          (
                            item,
                          ) => (
                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                            >
                              {item.file_name ||
                                item.id}
                            </option>
                          ),
                        )}
                      </select>

                      <button
                        onClick={() => {
                          void attachEvidence()
                        }}
                        disabled={
                          !evidenceId
                        }
                        className="h-10 w-full rounded-lg border border-[#20dc73]/30 bg-[#20dc73]/5 text-sm font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Attach Evidence
                      </button>

                      <select
                        value={
                          entityId
                        }
                        onChange={(
                          event,
                        ) =>
                          setEntityId(
                            event
                              .target
                              .value,
                          )
                        }
                        className="h-10 w-full rounded-lg border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
                      >
                        <option value="">
                          Select entity
                        </option>

                        {payload.entities.map(
                          (
                            entity,
                          ) => (
                            <option
                              key={
                                entity.id
                              }
                              value={
                                entity.id
                              }
                            >
                              {entity.name ||
                                entity.id}
                            </option>
                          ),
                        )}
                      </select>

                      <button
                        onClick={() => {
                          void attachEntity()
                        }}
                        disabled={
                          !entityId
                        }
                        className="h-10 w-full rounded-lg border border-[#20dc73]/30 bg-[#20dc73]/5 text-sm font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Attach Entity
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* VIEWER */}

              {!editorMode ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 font-semibold text-white">
                      <Eye className="h-4 w-4 text-[#20dc73]" />
                      Report Preview
                    </h3>

                    {selectedReport.status ? (
                      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/20">
                        {formatStatus(
                          selectedReport.status,
                        )}
                      </span>
                    ) : null}
                  </div>

                  <ReportViewer
                    report={
                      selectedReport
                    }
                  />
                </div>
              ) : null}

              {/* LOCK NOTICE */}

              {reportLocked ? (
                <div className="flex items-start gap-3 rounded-xl border border-[#20dc73]/15 bg-[#20dc73]/5 p-4">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#20dc73]" />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7af2a9]">
                      Controlled Report State
                    </p>

                    <p className="mt-1 text-xs leading-5 text-white/40">
                      This report is currently{" "}
                      <strong className="text-white/60">
                        {formatStatus(
                          selectedStatus,
                        )}
                      </strong>
                      . Structural editing is locked
                      to preserve controlled report
                      lifecycle boundaries.
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex min-h-[30rem] items-center justify-center rounded-xl border border-dashed border-[#143b28] bg-black/20 p-8 text-center">
              <div className="max-w-md">
                <FileText className="mx-auto h-10 w-10 text-white/15" />

                <h3 className="mt-4 text-lg font-semibold text-white">
                  No Investigation Report Selected
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/35">
                  Create a blank report or generate an
                  AI-assisted investigative draft once
                  the investigation contains sufficient
                  structured evidence.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}

      <div className="mt-6 border-t border-white/6 pt-5">
        <div className="flex flex-col gap-2 text-[8px] uppercase tracking-[0.12em] text-white/15 sm:flex-row sm:items-center sm:justify-between">
          <span>
            ShadowNode Operations Bureau Limited
          </span>

          <span>
            Evidence-Grounded Investigative Reporting
          </span>
        </div>
      </div>
    </section>
  )
}