"use client"

import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Fingerprint,
  LockKeyhole,
  Save,
  ShieldCheck,
  UserCheck,
} from "lucide-react"
import {
  useEffect,
  useMemo,
  useState,
} from "react"

export type EditableReportSection = {
  id: string
  section_type: string | null
  title: string | null
  content: string | null
  order_index: number
}

export type EditableCaseReport = {
  id: string
  case_id: string
  title: string
  summary?: string | null
  executive_summary?: string | null
  report_type?: string | null
  status?: string | null
  classification?: string | null
  created_by_username?: string | null
  approved_by_username?: string | null
  created_at?: string | null
  updated_at?: string | null
  sections?: EditableReportSection[]
}

type ReportEditorProps = {
  report: EditableCaseReport
  onSave?: (
    changes: {
      title: string
      executive_summary: string
      sections: EditableReportSection[]
    },
  ) => Promise<void> | void
  saving?: boolean
}

const SECTION_TYPES = [
  {
    value: "methodology",
    label: "Methodology",
  },
  {
    value: "finding",
    label: "Finding",
  },
  {
    value: "identity_analysis",
    label: "Identity Analysis",
  },
  {
    value: "corporate_analysis",
    label: "Corporate Analysis",
  },
  {
    value: "digital_intelligence",
    label: "Digital Intelligence",
  },
  {
    value: "timeline_analysis",
    label: "Timeline Analysis",
  },
  {
    value: "evidence",
    label: "Evidence Assessment",
  },
  {
    value: "analysis",
    label: "Analyst Analysis",
  },
  {
    value: "contradiction",
    label: "Contradiction / Limitation",
  },
  {
    value: "hypothesis",
    label: "Hypothesis",
  },
  {
    value: "conclusion",
    label: "Conclusion",
  },
  {
    value: "recommendation",
    label: "Recommendation",
  },
  {
    value: "source_notes",
    label: "Source Notes",
  },
]

const READ_ONLY_STATUSES =
  new Set([
    "approved",
    "delivered",
    "final",
    "published",
  ])

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

function cloneSections(
  sections:
    | EditableReportSection[]
    | undefined,
) {
  return [...(sections || [])]
    .sort(
      (a, b) =>
        Number(
          a.order_index || 0,
        ) -
        Number(
          b.order_index || 0,
        ),
    )
    .map(
      (section) => ({
        ...section,
        title:
          section.title ??
          "",
        content:
          section.content ??
          "",
        section_type:
          section.section_type ||
          "analysis",
        order_index:
          Number(
            section.order_index ||
              0,
          ),
      }),
    )
}

export default function ReportEditor({
  report,
  onSave,
  saving = false,
}: ReportEditorProps) {
  const [title, setTitle] =
    useState(report.title || "")

  const [
    executiveSummary,
    setExecutiveSummary,
  ] = useState(
    report.executive_summary ??
      report.summary ??
      "",
  )

  const [
    sections,
    setSections,
  ] = useState<
    EditableReportSection[]
  >(
    cloneSections(
      report.sections,
    ),
  )

  const [
    selectedSectionId,
    setSelectedSectionId,
  ] = useState("")

  const [
    dirty,
    setDirty,
  ] = useState(false)

  const [
    notice,
    setNotice,
  ] = useState<string | null>(
    null,
  )

  const [
    showNewSection,
    setShowNewSection,
  ] = useState(false)

  const [
    newSection,
    setNewSection,
  ] = useState({
    section_type: "finding",
    title: "",
    content: "",
  })

  const readOnly =
    READ_ONLY_STATUSES.has(
      String(
        report.status ||
          "draft",
      ).toLowerCase(),
    )

  useEffect(() => {
    setTitle(
      report.title || "",
    )

    setExecutiveSummary(
      report.executive_summary ??
        report.summary ??
        "",
    )

    setSections(
      cloneSections(
        report.sections,
      ),
    )

    setSelectedSectionId("")

    setDirty(false)
    setNotice(null)
  }, [
    report.id,
    report.title,
    report.executive_summary,
    report.summary,
    report.sections,
    report.status,
  ])

  const selectedSection =
    useMemo(
      () =>
        sections.find(
          (section) =>
            section.id ===
            selectedSectionId,
        ) ?? null,
      [
        sections,
        selectedSectionId,
      ],
    )

  function markDirty() {
    setDirty(true)
    setNotice(null)
  }

  function updateSection(
    sectionId: string,
    field:
      | "title"
      | "content"
      | "section_type",
    value: string,
  ) {
    setSections(
      (current) =>
        current.map(
          (section) =>
            section.id ===
            sectionId
              ? {
                  ...section,
                  [field]:
                    value,
                }
              : section,
        ),
    )

    markDirty()
  }

  function removeSection(
    sectionId: string,
  ) {
    const section =
      sections.find(
        (item) =>
          item.id ===
          sectionId,
      )

    if (!section) {
      return
    }

    const confirmed =
      window.confirm(
        `Remove "${section.title || "this section"}" from the working draft?`,
      )

    if (!confirmed) {
      return
    }

    setSections(
      (current) =>
        current
          .filter(
            (item) =>
              item.id !==
              sectionId,
          )
          .map(
            (
              item,
              index,
            ) => ({
              ...item,
              order_index:
                index,
            }),
          ),
    )

    if (
      selectedSectionId ===
      sectionId
    ) {
      setSelectedSectionId("")
    }

    markDirty()
  }

  function moveSection(
    sectionId: string,
    direction:
      | "up"
      | "down",
  ) {
    const index =
      sections.findIndex(
        (section) =>
          section.id ===
          sectionId,
      )

    if (index < 0) {
      return
    }

    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1

    if (
      targetIndex < 0 ||
      targetIndex >=
        sections.length
    ) {
      return
    }

    const reordered =
      [...sections]

    const [
      moved,
    ] =
      reordered.splice(
        index,
        1,
      )

    reordered.splice(
      targetIndex,
      0,
      moved,
    )

    setSections(
      reordered.map(
        (
          section,
          orderIndex,
        ) => ({
          ...section,
          order_index:
            orderIndex,
        }),
      ),
    )

    markDirty()
  }

  function addNewSection() {
    const sectionTitle =
      newSection.title.trim()

    const sectionContent =
      newSection.content.trim()

    if (
      !sectionTitle ||
      !sectionContent
    ) {
      setNotice(
        "Section title and content are required.",
      )
      return
    }

    const id =
      `local-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`

    const createdSection: EditableReportSection =
      {
        id,
        section_type:
          newSection.section_type,
        title:
          sectionTitle,
        content:
          sectionContent,
        order_index:
          sections.length,
      }

    setSections(
      (current) => [
        ...current,
        createdSection,
      ],
    )

    setSelectedSectionId(
      id,
    )

    setNewSection({
      section_type:
        "finding",
      title: "",
      content: "",
    })

    setShowNewSection(
      false,
    )

    markDirty()
  }

  async function saveChanges() {
    if (readOnly) {
      setNotice(
        "Approved or published reports are read-only.",
      )
      return
    }

    const cleanTitle =
      title.trim()

    if (!cleanTitle) {
      setNotice(
        "A report title is required.",
      )
      return
    }

    const invalidSection =
      sections.find(
        (section) =>
          !String(
            section.title ||
              "",
          ).trim() ||
          !String(
            section.content ||
              "",
          ).trim(),
      )

    if (
      invalidSection
    ) {
      setNotice(
        "Every report section must have a title and content.",
      )
      return
    }

    try {
      await onSave?.({
        title:
          cleanTitle,

        executive_summary:
          executiveSummary.trim(),

        sections:
          sections.map(
            (
              section,
              index,
            ) => ({
              ...section,
              title:
                String(
                  section.title ||
                    "",
                ).trim(),
              content:
                String(
                  section.content ||
                    "",
                ).trim(),
              order_index:
                index,
            }),
          ),
      })

      setDirty(false)

      setNotice(
        "Working report changes saved.",
      )
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Failed to save report changes.",
      )
    }
  }

  const status =
    String(
      report.status ||
        "draft",
    ).toLowerCase()

  return (
    <section className="overflow-hidden rounded-xl border border-[#143b28] bg-[#020604]">
      {/* ============================================================
          EDITOR HEADER
      ============================================================ */}

      <header className="border-b border-[#143b28] bg-[radial-gradient(circle_at_top_right,rgba(32,220,115,0.07),transparent_40%)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded border border-[#20dc73]/25 bg-[#20dc73]/7 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#20dc73]">
                <FileText className="h-3 w-3" />
                Report Editor
              </span>

              <span className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">
                {formatLabel(
                  status,
                )}
              </span>

              {dirty ? (
                <span className="rounded border border-yellow-400/25 bg-yellow-400/5 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-yellow-200">
                  Unsaved Changes
                </span>
              ) : null}
            </div>

            <h2 className="mt-3 text-xl font-semibold text-white">
              Human Review & Report Editing
            </h2>

            <p className="mt-1 max-w-3xl text-xs leading-6 text-white/40">
              Review the AI-assisted draft against
              the underlying investigation record.
              Human edits are part of the investigative
              review process and should preserve
              source traceability and uncertainty.
            </p>
          </div>

          <button
            type="button"
            onClick={saveChanges}
            disabled={
              saving ||
              readOnly ||
              !dirty
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#20dc73] px-4 text-sm font-bold text-black transition hover:bg-[#39ea87] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      </header>

      {/* ============================================================
          NOTICE
      ============================================================ */}

      {notice ? (
        <div
          className={`border-b px-5 py-3 text-xs sm:px-6 ${
            notice.includes(
              "saved",
            )
              ? "border-[#20dc73]/20 bg-[#20dc73]/5 text-[#7af2a9]"
              : "border-yellow-400/20 bg-yellow-400/5 text-yellow-200"
          }`}
        >
          {notice}
        </div>
      ) : null}

      {/* ============================================================
          READ-ONLY / APPROVED WARNING
      ============================================================ */}

      {readOnly ? (
        <div className="border-b border-blue-400/15 bg-blue-400/[0.025] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-200">
                Controlled Final-State Document
              </p>

              <p className="mt-1 text-xs leading-5 text-white/40">
                This report has reached a controlled
                approval or publication state. Editing
                is disabled to protect the integrity of
                the reviewed version.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ============================================================
          REPORT IDENTITY
      ============================================================ */}

      <div className="grid gap-5 border-b border-[#143b28] p-5 sm:p-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <div>
            <label className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/25">
              Report Title
            </label>

            <input
              value={title}
              disabled={readOnly}
              onChange={(event) => {
                setTitle(
                  event.target.value,
                )
                markDirty()
              }}
              className="mt-2 h-11 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm font-medium text-white outline-none placeholder:text-white/20 focus:border-[#20dc73]/50 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Investigation report title"
            />
          </div>

          <div>
            <label className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/25">
              Executive Summary
            </label>

            <textarea
              value={
                executiveSummary
              }
              disabled={readOnly}
              onChange={(event) => {
                setExecutiveSummary(
                  event.target.value,
                )
                markDirty()
              }}
              className="mt-2 min-h-40 w-full rounded-md border border-[#143b28] bg-black px-3 py-3 text-sm leading-7 text-white/70 outline-none placeholder:text-white/20 focus:border-[#20dc73]/50 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Summarize the investigation, principal findings, evidentiary position, limitations and overall assessment."
            />
          </div>
        </div>

        <div className="rounded-lg border border-[#143b28] bg-[#06110f] p-4">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-[#20dc73]" />

            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#20dc73]">
              Report Control
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <ControlRow
              label="Report ID"
              value={
                report.id
              }
              mono
            />

            <ControlRow
              label="Case ID"
              value={
                report.case_id
              }
              mono
            />

            <ControlRow
              label="Type"
              value={formatLabel(
                report.report_type ||
                  "intelligence",
              )}
            />

            <ControlRow
              label="Classification"
              value={formatLabel(
                report.classification ||
                  "confidential",
              )}
            />

            <ControlRow
              label="Prepared By"
              value={
                report.created_by_username ||
                "Not recorded"
              }
            />

            <ControlRow
              label="Approved By"
              value={
                report.approved_by_username ||
                "Not approved"
              }
            />
          </div>
        </div>
      </div>

      {/* ============================================================
          EDITING STANDARD
      ============================================================ */}

      <div className="border-b border-[#143b28] p-5 sm:p-6">
        <div className="rounded-lg border border-[#17462f] bg-[#06110f] p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#20dc73]" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7af2a9]">
                Court-Ready Editing Standard
              </p>

              <p className="mt-2 text-xs leading-6 text-white/40">
                Preserve the distinction between
                evidence, observed facts, corroborated
                information, analyst assessment,
                inference, hypothesis and unresolved
                information. Do not strengthen a statement
                beyond what its supporting record permits.
                Keep source and evidence references intact
                when editing investigative findings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION NAVIGATION
      ============================================================ */}

      <div className="grid min-h-[32rem] lg:grid-cols-[17rem_1fr]">
        <aside className="border-b border-[#143b28] bg-black/20 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-[#143b28] px-4 py-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/25">
                Sections
              </p>

              <p className="mt-0.5 text-xs text-white/40">
                {sections.length} sections
              </p>
            </div>

            <button
              type="button"
              disabled={
                readOnly
              }
              onClick={() =>
                setShowNewSection(
                  (value) =>
                    !value,
                )
              }
              className="rounded border border-[#20dc73]/25 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#20dc73] transition hover:bg-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Add
            </button>
          </div>

          <div className="max-h-[36rem] overflow-y-auto p-2">
            {sections.length ? (
              <div className="space-y-1">
                {sections.map(
                  (
                    section,
                    index,
                  ) => {
                    const active =
                      selectedSectionId ===
                      section.id

                    return (
                      <button
                        key={
                          section.id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedSectionId(
                            section.id,
                          )
                        }
                        className={`w-full rounded-md border px-3 py-3 text-left transition ${
                          active
                            ? "border-[#20dc73]/35 bg-[#20dc73]/8"
                            : "border-transparent hover:border-[#143b28] hover:bg-[#06110f]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-white/20">
                            {String(
                              index + 1,
                            ).padStart(
                              2,
                              "0",
                            )}
                          </span>

                          <span className="truncate text-xs font-medium text-white/65">
                            {section.title ||
                              "Untitled Section"}
                          </span>
                        </div>

                        <span className="mt-1 ml-6 block truncate text-[9px] uppercase tracking-[0.08em] text-white/20">
                          {formatLabel(
                            section.section_type,
                          )}
                        </span>
                      </button>
                    )
                  },
                )}
              </div>
            ) : (
              <div className="p-4 text-xs leading-5 text-white/30">
                No report sections exist yet.
              </div>
            )}
          </div>
        </aside>

        {/* ==========================================================
            SECTION EDITOR
        ========================================================== */}

        <div className="p-5 sm:p-6">
          {showNewSection ? (
            <div className="rounded-xl border border-[#17462f] bg-[#06110f] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#20dc73]">
                    New Section
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-white">
                    Add investigative content
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowNewSection(
                      false,
                    )
                  }
                  className="text-xs text-white/30 hover:text-white/60"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <select
                  value={
                    newSection.section_type
                  }
                  onChange={(event) =>
                    setNewSection({
                      ...newSection,
                      section_type:
                        event.target.value,
                    })
                  }
                  disabled={
                    readOnly
                  }
                  className="h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/50"
                >
                  {SECTION_TYPES.map(
                    (type) => (
                      <option
                        key={
                          type.value
                        }
                        value={
                          type.value
                        }
                      >
                        {type.label}
                      </option>
                    ),
                  )}
                </select>

                <input
                  value={
                    newSection.title
                  }
                  onChange={(event) =>
                    setNewSection({
                      ...newSection,
                      title:
                        event.target.value,
                    })
                  }
                  disabled={
                    readOnly
                  }
                  placeholder="Section title"
                  className="h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#20dc73]/50"
                />

                <textarea
                  value={
                    newSection.content
                  }
                  onChange={(event) =>
                    setNewSection({
                      ...newSection,
                      content:
                        event.target.value,
                    })
                  }
                  disabled={
                    readOnly
                  }
                  placeholder="Section content. Include source references such as [S1], [E2], [N3] where supported by the investigation record."
                  className="min-h-40 w-full rounded-md border border-[#143b28] bg-black px-3 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/20 focus:border-[#20dc73]/50"
                />

                <button
                  type="button"
                  onClick={
                    addNewSection
                  }
                  disabled={
                    readOnly
                  }
                  className="h-10 w-full rounded-md border border-[#20dc73]/30 bg-[#20dc73]/8 text-sm font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/15 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Add Section to Working Draft
                </button>
              </div>
            </div>
          ) : selectedSection ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-[#20dc73]/25 bg-[#20dc73]/7 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#20dc73]">
                      {formatLabel(
                        selectedSection.section_type ||
                          "analysis",
                      )}
                    </span>

                    <span className="font-mono text-[9px] text-white/20">
                      ORDER{" "}
                      {String(
                        selectedSection.order_index +
                          1,
                      ).padStart(
                        2,
                        "0",
                      )}
                    </span>
                  </div>

                  <h3 className="mt-2 text-lg font-semibold text-white">
                    Edit Section
                  </h3>
                </div>

                {!readOnly ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        moveSection(
                          selectedSection.id,
                          "up",
                        )
                      }
                      disabled={
                        selectedSection.order_index <=
                        0
                      }
                      className="h-8 rounded border border-white/10 px-2.5 text-[10px] text-white/40 transition hover:bg-white/5 disabled:opacity-20"
                    >
                      Move Up
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        moveSection(
                          selectedSection.id,
                          "down",
                        )
                      }
                      disabled={
                        selectedSection.order_index >=
                        sections.length -
                          1
                      }
                      className="h-8 rounded border border-white/10 px-2.5 text-[10px] text-white/40 transition hover:bg-white/5 disabled:opacity-20"
                    >
                      Move Down
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        removeSection(
                          selectedSection.id,
                        )
                      }
                      className="h-8 rounded border border-red-400/20 px-2.5 text-[10px] text-red-300 transition hover:bg-red-400/5"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/25">
                    Section Type
                  </label>

                  <select
                    value={
                      selectedSection.section_type ||
                      "analysis"
                    }
                    disabled={
                      readOnly
                    }
                    onChange={(event) =>
                      updateSection(
                        selectedSection.id,
                        "section_type",
                        event.target.value,
                      )
                    }
                    className="mt-2 h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {SECTION_TYPES.map(
                      (type) => (
                        <option
                          key={
                            type.value
                          }
                          value={
                            type.value
                          }
                        >
                          {type.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/25">
                    Section Title
                  </label>

                  <input
                    value={
                      selectedSection.title ||
                      ""
                    }
                    disabled={
                      readOnly
                    }
                    onChange={(event) =>
                      updateSection(
                        selectedSection.id,
                        "title",
                        event.target.value,
                      )
                    }
                    className="mt-2 h-11 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm font-medium text-white outline-none placeholder:text-white/20 focus:border-[#20dc73]/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/25">
                    Section Content
                  </label>

                  <textarea
                    value={
                      selectedSection.content ||
                      ""
                    }
                    disabled={
                      readOnly
                    }
                    onChange={(event) =>
                      updateSection(
                        selectedSection.id,
                        "content",
                        event.target.value,
                      )
                    }
                    className="mt-2 min-h-[22rem] w-full rounded-md border border-[#143b28] bg-black px-4 py-3 text-sm leading-7 text-white/70 outline-none placeholder:text-white/20 focus:border-[#20dc73]/50 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Investigative section content..."
                  />
                </div>
              </div>

              <div className="rounded-lg border border-yellow-400/15 bg-yellow-400/[0.025] p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-yellow-200">
                      Review Before Finalization
                    </p>

                    <p className="mt-1 text-xs leading-5 text-white/35">
                      Confirm that statements are
                      supported by the underlying record,
                      that references point to actual
                      sources or evidence, and that
                      uncertainty has not been removed
                      during editing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <CheckCircle2 className="h-9 w-9 text-[#20dc73]/30" />

              <h3 className="mt-4 text-lg font-semibold text-white">
                Select a section to edit
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/30">
                Choose a report section from the
                navigation panel, or add a new section
                to continue the investigator review.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          FINAL EDITOR FOOTER
      ============================================================ */}

      <footer className="border-t border-[#143b28] bg-black/25 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5 text-[#20dc73]" />

            <span className="text-[9px] uppercase tracking-[0.12em] text-white/25">
              Human investigator review required
            </span>
          </div>

          <div className="flex items-center gap-2">
            {dirty ? (
              <span className="font-mono text-[9px] text-yellow-200">
                UNSAVED
              </span>
            ) : (
              <span className="font-mono text-[9px] text-[#20dc73]/60">
                WORKING COPY SYNCHRONIZED
              </span>
            )}

            <span className="font-mono text-[9px] text-white/15">
              {formatLabel(
                report.classification ||
                  "confidential",
              )}
            </span>
          </div>
        </div>
      </footer>
    </section>
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