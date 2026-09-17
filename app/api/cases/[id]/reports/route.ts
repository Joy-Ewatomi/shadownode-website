import { NextRequest, NextResponse } from "next/server"

import { auditLog } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  optionalText,
  profileIdForUser,
  recordInvestigationTimeline,
  requireCaseOperationalAccess,
  requireCaseReadAccess,
} from "@/lib/investigation-workspace"
import { emitCaseWorkspaceEvent } from "@/lib/realtime/workspace-events"
import {
  notifySuperAdmins,
  notifyUser,
} from "@/lib/services/notification-service"

const REPORT_STATUSES = [
  "draft",
  "review",
  "approved",
  "delivered",
  "final",
  "published",
]

const CLIENT_VISIBLE_STATUSES = new Set([
  "approved",
  "delivered",
  "final",
  "published",
])

const AI_REPORT_MODEL =
  process.env.OPENAI_REPORT_MODEL ||
  "gpt-5.6-luna"

type AiReportSection = {
  section_type: string
  title: string
  content: string
  order_index: number
}

type AiReportResult = {
  executive_summary: string
  methodology: string
  findings: AiReportSection[]
  identity_analysis: string
  corporate_analysis: string
  digital_intelligence: string
  timeline_analysis: string
  evidence_assessment: string
  contradictions: AiReportSection[]
  hypotheses: AiReportSection[]
  conclusion: string
  source_notes: string
}

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function canManageReports(
  role: string | null | undefined,
) {
  return (
    isSuperAdminRole(role) ||
    role === "administrator" ||
    role === "staff" ||
    role === "investigator" ||
    role === "analyst"
  )
}

function canApproveReports(
  role: string | null | undefined,
) {
  return (
    isSuperAdminRole(role) ||
    role === "administrator"
  )
}

function normalizeStatus(
  value: unknown,
) {
  const status =
    String(value || "draft")
      .trim()
      .toLowerCase()

  return REPORT_STATUSES.includes(status)
    ? status
    : null
}

function safeNumber(
  value: unknown,
) {
  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

function cleanString(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
}

function uniqueStrings(
  values: string[],
) {
  return Array.from(
    new Set(
      values.filter(Boolean),
    ),
  )
}

/*
 * ============================================================
 * CASE DATA FOR AI REPORT GENERATION
 * ============================================================
 *
 * The model is given structured investigative data only.
 * It must not invent facts, sources, relationships, or evidence.
 */
async function loadInvestigationData(
  caseId: string,
) {
  const [
    caseResult,
    entitiesResult,
    relationshipsResult,
    sourcesResult,
    observationsResult,
    timelineResult,
    evidenceResult,
    tasksResult,
    notesResult,
    graphProvenanceResult,
  ] = await Promise.all([
    query(
      `
        SELECT
          c.id,
          c.case_number,
          c.title,
          c.description,
          c.service_type,
          c.status,
          c.priority,
          c.progress,
          c.payment_status,
          c.started_at,
          c.estimated_completion,
          c.completed_at,
          c.created_at,
          c.updated_at,

          client_profile.full_name
            AS client_name,

          client_user.username
            AS client_username,

          assigned_profile.full_name
            AS assigned_operator_name,

          assigned_user.username
            AS assigned_operator_username

        FROM cases c

        LEFT JOIN user_profiles client_profile
          ON client_profile.id =
             c.client_profile_id

        LEFT JOIN app_users client_user
          ON client_user.id =
             client_profile.user_id

        LEFT JOIN user_profiles assigned_profile
          ON assigned_profile.id =
             c.assigned_to

        LEFT JOIN app_users assigned_user
          ON assigned_user.id =
             assigned_profile.user_id

        WHERE c.id = $1

        LIMIT 1
      `,
      [caseId],
    ),

    query(
      `
        SELECT
          ie.id,
          ie.entity_type,
          ie.name,
          ie.value,
          ie.description,
          ie.aliases,
          ie.source_provider,
          ie.source_reference,
          ie.retrieved_at,
          ie.verification_status,
          ie.confidence_score,
          ie.classification,
          ie.client_visible,
          ie.notes,
          ie.last_verified_at,
          ie.stale_at,
          ie.created_at,

          creator.username
            AS created_by_username

        FROM investigation_entities ie

        LEFT JOIN user_profiles creator_profile
          ON creator_profile.id =
             ie.created_by

        LEFT JOIN app_users creator
          ON creator.id =
             creator_profile.user_id

        WHERE ie.case_id = $1

        ORDER BY ie.created_at ASC
      `,
      [caseId],
    ),

    query(
      `
        SELECT
          er.id,
          er.source_entity_id,
          source_entity.name
            AS source_entity_name,
          er.target_entity_id,
          target_entity.name
            AS target_entity_name,
          er.relationship_type,
          er.direction,
          er.description,
          er.source_reference,
          er.client_visible,
          er.confidence_score,
          er.verification_status,
          er.created_at

        FROM entity_relationships er

        LEFT JOIN investigation_entities source_entity
          ON source_entity.id =
             er.source_entity_id

        LEFT JOIN investigation_entities target_entity
          ON target_entity.id =
             er.target_entity_id

        WHERE er.case_id = $1

        ORDER BY er.created_at ASC
      `,
      [caseId],
    ),

    query(
      `
        SELECT
          ins.id,
          ins.source_type,
          ins.title,
          ins.url,
          ins.description,
          ins.reliability_score,
          ins.collected_at,
          ins.created_at,

          collector.username
            AS collected_by_username

        FROM intelligence_sources ins

        LEFT JOIN user_profiles collector_profile
          ON collector_profile.id =
             ins.collected_by

        LEFT JOIN app_users collector
          ON collector.id =
             collector_profile.user_id

        WHERE ins.case_id = $1

        ORDER BY ins.created_at ASC
      `,
      [caseId],
    ),

    query(
      `
        SELECT
          io.id,
          io.observation_type,
          io.title,
          io.description,
          io.related_entities,
          io.related_sources,
          io.confidence_score,
          io.status,
          io.reviewed_at,
          io.created_at,

          reviewer.username
            AS reviewed_by_username

        FROM intelligence_observations io

        LEFT JOIN app_users reviewer
          ON reviewer.id =
             io.reviewed_by

        WHERE io.case_id = $1

        ORDER BY io.created_at ASC
      `,
      [caseId],
    ),

    query(
      `
        SELECT
          it.id,
          it.event_date,
          it.title,
          it.description,
          it.source_id,
          source.title
            AS source_title,
          source.url
            AS source_url,
          it.created_at

        FROM investigation_timeline it

        LEFT JOIN intelligence_sources source
          ON source.id =
             it.source_id

        WHERE it.case_id = $1

        ORDER BY
          it.event_date ASC NULLS LAST,
          it.created_at ASC
      `,
      [caseId],
    ),

    query(
      `
        SELECT
          ff.id,
          ff.file_name,
          ff.file_type,
          ff.file_size,
          ff.file_hash,
          ff.evidence_type,
          ff.description,
          ff.is_evidence,
          ff.created_at

        FROM forensic_files ff

        WHERE
          ff.case_id = $1
          AND (
            ff.is_evidence = true
            OR ff.is_evidence IS NULL
          )

        ORDER BY ff.created_at ASC
      `,
      [caseId],
    ),

    query(
      `
        SELECT
          it.id,
          it.title,
          it.status,
          it.priority,
          it.created_at

        FROM investigation_tasks it

        WHERE it.case_id = $1

        ORDER BY it.created_at ASC
      `,
      [caseId],
    ),

    query(
      `
        SELECT
          cn.id,
          cn.content,
          cn.created_at,
          au.username
            AS created_by_username

        FROM case_notes cn

        LEFT JOIN user_profiles profile
          ON profile.id =
             cn.created_by

        LEFT JOIN app_users au
          ON au.id =
             profile.user_id

        WHERE cn.case_id = $1

        ORDER BY cn.created_at ASC
      `,
      [caseId],
    ),

    query(
      `
        SELECT
          'entity_source' AS link_type,
          es.entity_id AS graph_record_id,
          ie.name AS graph_record_name,
          ins.id AS source_id,
          ins.title AS source_title,
          ins.url AS source_url,
          NULL::uuid AS evidence_id,
          NULL::text AS evidence_name,
          es.analyst_notes,
          es.created_at
        FROM entity_sources es
        JOIN investigation_entities ie
          ON ie.id = es.entity_id
        JOIN intelligence_sources ins
          ON ins.id = es.source_id
        WHERE ie.case_id = $1

        UNION ALL

        SELECT
          'relationship_source' AS link_type,
          rs.relationship_id AS graph_record_id,
          er.relationship_type AS graph_record_name,
          ins.id AS source_id,
          ins.title AS source_title,
          ins.url AS source_url,
          NULL::uuid AS evidence_id,
          NULL::text AS evidence_name,
          rs.analyst_notes,
          rs.created_at
        FROM relationship_sources rs
        JOIN entity_relationships er
          ON er.id = rs.relationship_id
        JOIN intelligence_sources ins
          ON ins.id = rs.source_id
        WHERE er.case_id = $1

        UNION ALL

        SELECT
          'entity_evidence' AS link_type,
          ee.entity_id AS graph_record_id,
          ie.name AS graph_record_name,
          NULL::uuid AS source_id,
          NULL::text AS source_title,
          NULL::text AS source_url,
          ff.id AS evidence_id,
          ff.file_name AS evidence_name,
          ee.analyst_notes,
          ee.created_at
        FROM entity_evidence ee
        JOIN investigation_entities ie
          ON ie.id = ee.entity_id
        JOIN forensic_files ff
          ON ff.id = ee.forensic_file_id
        WHERE ie.case_id = $1

        UNION ALL

        SELECT
          'relationship_evidence' AS link_type,
          re.relationship_id AS graph_record_id,
          er.relationship_type AS graph_record_name,
          NULL::uuid AS source_id,
          NULL::text AS source_title,
          NULL::text AS source_url,
          ff.id AS evidence_id,
          ff.file_name AS evidence_name,
          re.analyst_notes,
          re.created_at
        FROM relationship_evidence re
        JOIN entity_relationships er
          ON er.id = re.relationship_id
        JOIN forensic_files ff
          ON ff.id = re.forensic_file_id
        WHERE er.case_id = $1

        ORDER BY created_at ASC
      `,
      [caseId],
    ),
  ])

  return {
    case: caseResult.rows[0] ?? null,
    entities: entitiesResult.rows,
    relationships:
      relationshipsResult.rows,
    sources: sourcesResult.rows,
    observations:
      observationsResult.rows,
    timeline:
      timelineResult.rows,
    evidence:
      evidenceResult.rows,
    tasks:
      tasksResult.rows,
    notes:
      notesResult.rows,
    graph_provenance:
      graphProvenanceResult.rows,
  }
}

/*
 * ============================================================
 * READINESS
 * ============================================================
 */
function calculateReadiness(
  investigation: Awaited<
    ReturnType<typeof loadInvestigationData>
  >,
) {
  const entityCount =
    investigation.entities.length

  const relationshipCount =
    investigation.relationships.length

  const sourceCount =
    investigation.sources.length

  const observationCount =
    investigation.observations.length

  const evidenceCount =
    investigation.evidence.length

  const timelineCount =
    investigation.timeline.length

  const missing: string[] = []

  if (entityCount < 2) {
    missing.push(
      "At least 2 investigation entities",
    )
  }

  if (relationshipCount < 1) {
    missing.push(
      "At least 1 verified or investigated relationship",
    )
  }

  if (sourceCount < 1) {
    missing.push(
      "At least 1 intelligence source",
    )
  }

  if (evidenceCount < 1) {
    missing.push(
      "At least 1 evidence item",
    )
  }

  if (
    observationCount < 1 &&
    timelineCount < 1
  ) {
    missing.push(
      "At least 1 observation or timeline event",
    )
  }

  /*
   * Readiness is intentionally weighted toward
   * the core investigative graph.
   */
  const checks = [
    entityCount >= 2,
    relationshipCount >= 1,
    sourceCount >= 1,
    evidenceCount >= 1,
    observationCount > 0 ||
      timelineCount > 0,
  ]

  const passed =
    checks.filter(Boolean).length

  const score =
    Math.round(
      (passed / checks.length) *
        100,
    )

  return {
    ready:
      entityCount >= 2 &&
      relationshipCount >= 1 &&
      sourceCount >= 1 &&
      evidenceCount >= 1,

    score,

    entity_count:
      entityCount,

    relationship_count:
      relationshipCount,

    source_count:
      sourceCount,

    observation_count:
      observationCount,

    evidence_count:
      evidenceCount,

    timeline_count:
      timelineCount,

    missing,
  }
}

/*
 * ============================================================
 * REPORT DETAILS
 * ============================================================
 */
async function loadReportDetails(
  caseId: string,
  reportId?: string,
) {
  const reportFilter = reportId
    ? "AND cr.id = $2"
    : ""

  const values = reportId
    ? [caseId, reportId]
    : [caseId]

  const reports = await query(
    `
      SELECT
        cr.id,
        cr.case_id,
        cr.title,
        cr.file_url,
        cr.summary,
        cr.report_type,
        cr.status,
        cr.classification,
        cr.created_by,
        cr.approved_by,
        cr.created_at,
        cr.updated_at,

        creator.username AS created_by_username,
        approver.username AS approved_by_username

      FROM case_reports cr

      LEFT JOIN user_profiles creator_profile
        ON creator_profile.id =
           cr.created_by

      LEFT JOIN app_users creator
        ON creator.id =
           creator_profile.user_id

      LEFT JOIN user_profiles approver_profile
        ON approver_profile.id =
           cr.approved_by

      LEFT JOIN app_users approver
        ON approver.id =
           approver_profile.user_id

      WHERE
        cr.case_id = $1
        ${reportFilter}

      ORDER BY cr.created_at DESC
    `,
    values,
  )

  if (!reports.rows.length) {
    return []
  }

  const reportIds =
    reports.rows.map(
      (report) =>
        String(report.id),
    )

  const sections =
    await query(
      `
        SELECT
          id,
          report_id,
          section_type,
          title,
          content,
          order_index,
          created_by,
          created_at,
          updated_at

        FROM case_report_sections

        WHERE report_id =
          ANY($1::uuid[])

        ORDER BY
          order_index ASC,
          created_at ASC
      `,
      [reportIds],
    )

  const evidence =
    await query(
      `
        SELECT
          cre.report_id,
          ff.id,
          ff.file_name,
          ff.file_hash AS sha256_hash,
          ff.evidence_type,
          ff.created_at

        FROM case_report_evidence cre

        JOIN forensic_files ff
          ON ff.id =
             cre.forensic_file_id

        WHERE cre.report_id =
          ANY($1::uuid[])

        ORDER BY cre.created_at DESC
      `,
      [reportIds],
    )

  const entities =
    await query(
      `
        SELECT
          cre.report_id,
          ie.id,
          ie.name,
          ie.entity_type,
          ie.confidence_score,
          ie.verification_status

        FROM case_report_entities cre

        JOIN investigation_entities ie
          ON ie.id =
             cre.entity_id

        WHERE cre.report_id =
          ANY($1::uuid[])

        ORDER BY cre.created_at DESC
      `,
      [reportIds],
    )

  return reports.rows.map(
    (report) => ({
      ...report,

      report_type:
        report.report_type ||
        "intelligence",

      status:
        report.status ||
        "draft",

      classification:
        report.classification ||
        "confidential",

      executive_summary:
        report.summary,

      sections:
        sections.rows
          .filter(
            (section) =>
              String(
                section.report_id,
              ) ===
              String(report.id),
          )
          .map(
            (section) => ({
              id: String(
                section.id,
              ),
              section_type:
                section.section_type ||
                null,
              title:
                section.title ||
                null,
              content:
                section.content ||
                null,
              order_index:
                Number(
                  section.order_index ||
                    0,
                ),
            }),
          ),

      evidence:
        evidence.rows
          .filter(
            (item) =>
              String(
                item.report_id,
              ) ===
              String(report.id),
          )
          .map(
            (item) => ({
              id: String(
                item.id,
              ),
              file_name:
                item.file_name ||
                null,
              status:
                "submitted",
              sha256_hash:
                item.sha256_hash ||
                null,
            }),
          ),

    entities:
  entities.rows
    .filter(
      (item) =>
        String(item.report_id) ===
        String(report.id),
    )
    .map(
      (item) => ({
        id: String(item.id),
        name:
          item.name || null,
        entity_type:
          item.entity_type || null,
        confidence_score:
          item.confidence_score ===
          null
            ? null
            : Number(
                item.confidence_score,
              ),
        verification_status:
          item.verification_status ||
          "unverified",
      }),
    ),
    }),
  )
}

async function verifyReportBelongsToCase(
  reportId: string,
  caseId: string,
) {
  const result =
    await query<{
      id: string
      title: string | null
      status: string | null
    }>(
      `
        SELECT
          id,
          title,
          status

        FROM case_reports

        WHERE
          id = $1
          AND case_id = $2

        LIMIT 1
      `,
      [
        reportId,
        caseId,
      ],
    )

  return result.rows[0] || null
}

/*
 * ============================================================
 * OPENAI AI REPORT GENERATOR
 * ============================================================
 *
 * Uses the Responses API directly so no additional npm
 * dependency is required.
 */
async function generateAiReport(
  investigation: Awaited<
    ReturnType<typeof loadInvestigationData>
  >,
  options: {
    title: string
    reportType: string
    classification: string
  },
): Promise<{
  result: AiReportResult
  model: string
}> {
  const apiKey =
    process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add your OpenAI API key to the server environment before generating AI reports.",
    )
  }

  const sourceIndex =
    investigation.sources.map(
      (source, index) => ({
        reference:
          `S${index + 1}`,
        ...source,
      }),
    )

  const evidenceIndex =
    investigation.evidence.map(
      (item, index) => ({
        reference:
          `E${index + 1}`,
        ...item,
      }),
    )

  const entityIndex =
    investigation.entities.map(
      (entity, index) => ({
        reference:
          `N${index + 1}`,
        ...entity,
      }),
    )

  const relationshipIndex =
    investigation.relationships.map(
      (relationship, index) => ({
        reference:
          `R${index + 1}`,
        ...relationship,
      }),
    )

  const observationIndex =
    investigation.observations.map(
      (observation, index) => ({
        reference:
          `F${index + 1}`,
        ...observation,
      }),
    )

  const timelineIndex =
    investigation.timeline.map(
      (event, index) => ({
        reference:
          `T${index + 1}`,
        ...event,
      }),
    )

  const systemInstructions = `
You are ShadowNode's senior intelligence report analyst.

Your task is to convert a structured investigation into a professional,
evidence-grounded investigative report.

CRITICAL RULES:

1. Never invent facts.
2. Never invent a person, company, relationship, source, date, URL, finding,
   evidence item, or verification result.
3. Treat unverified information as unverified.
4. Treat inferred relationships as inferred.
5. Do not convert confidence into certainty.
6. Detect contradictions instead of silently resolving them.
7. Distinguish:
   - confirmed
   - corroborated
   - partially verified
   - unverified
   - inferred
   - unresolved
8. Every substantive finding should reference supporting source/evidence IDs
   using the supplied references such as [S1], [E2], [N4], [R3], or [T2].
9. Do not create citations that are not present in the supplied data.
10. If evidence is insufficient, explicitly state that it is insufficient.
11. The report is an analyst's structured assessment, not a statement of
    criminal guilt or legal liability.
12. Do not speculate beyond what the investigation data supports.
13. Preserve uncertainty where uncertainty exists.
14. Write in professional intelligence-analysis language.
15. The investigator will review the draft before it becomes final.

The report must include:
- executive summary
- methodology
- key findings
- identity analysis
- corporate analysis
- digital intelligence
- timeline analysis
- evidence assessment
- contradictions
- hypotheses
- conclusion
- source notes

For hypotheses, clearly label them as hypotheses and provide the evidence
that caused the hypothesis to be considered.

For contradictions, identify the conflicting claims and explain why they
remain unresolved unless the supplied evidence actually resolves them.
`

  const userInput = `
REPORT REQUEST

Title:
${options.title}

Report Type:
${options.reportType}

Classification:
${options.classification}

CASE

${JSON.stringify(
  investigation.case,
  null,
  2,
)}

ENTITIES

${JSON.stringify(
  entityIndex,
  null,
  2,
)}

RELATIONSHIPS

${JSON.stringify(
  relationshipIndex,
  null,
  2,
)}

INTELLIGENCE SOURCES

${JSON.stringify(
  sourceIndex,
  null,
  2,
)}

OBSERVATIONS / FINDINGS

${JSON.stringify(
  observationIndex,
  null,
  2,
)}

TIMELINE

${JSON.stringify(
  timelineIndex,
  null,
  2,
)}

EVIDENCE

${JSON.stringify(
  evidenceIndex,
  null,
  2,
)}

GRAPH PROVENANCE LINKS

${JSON.stringify(
  investigation.graph_provenance,
  null,
  2,
)}

INVESTIGATION TASKS

${JSON.stringify(
  investigation.tasks,
  null,
  2,
)}

CASE NOTES

${JSON.stringify(
  investigation.notes,
  null,
  2,
)}

Generate a complete structured investigation report.
`

  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model: AI_REPORT_MODEL,

          instructions:
            systemInstructions,

          input: userInput,

          store: false,

          max_output_tokens:
            12000,

          text: {
            format: {
              type: "json_schema",

              name:
                "shadownode_investigation_report",

              strict: true,

              schema: {
                type: "object",

                additionalProperties:
                  false,

                properties: {
                  executive_summary: {
                    type: "string",
                  },

                  methodology: {
                    type: "string",
                  },

                  findings: {
                    type: "array",

                    items: {
                      type: "object",

                      additionalProperties:
                        false,

                      properties: {
                        section_type: {
                          type: "string",
                        },

                        title: {
                          type: "string",
                        },

                        content: {
                          type: "string",
                        },

                        order_index: {
                          type: "integer",
                        },
                      },

                      required: [
                        "section_type",
                        "title",
                        "content",
                        "order_index",
                      ],
                    },
                  },

                  identity_analysis: {
                    type: "string",
                  },

                  corporate_analysis: {
                    type: "string",
                  },

                  digital_intelligence: {
                    type: "string",
                  },

                  timeline_analysis: {
                    type: "string",
                  },

                  evidence_assessment: {
                    type: "string",
                  },

                  contradictions: {
                    type: "array",

                    items: {
                      type: "object",

                      additionalProperties:
                        false,

                      properties: {
                        section_type: {
                          type: "string",
                        },

                        title: {
                          type: "string",
                        },

                        content: {
                          type: "string",
                        },

                        order_index: {
                          type: "integer",
                        },
                      },

                      required: [
                        "section_type",
                        "title",
                        "content",
                        "order_index",
                      ],
                    },
                  },

                  hypotheses: {
                    type: "array",

                    items: {
                      type: "object",

                      additionalProperties:
                        false,

                      properties: {
                        section_type: {
                          type: "string",
                        },

                        title: {
                          type: "string",
                        },

                        content: {
                          type: "string",
                        },

                        order_index: {
                          type: "integer",
                        },
                      },

                      required: [
                        "section_type",
                        "title",
                        "content",
                        "order_index",
                      ],
                    },
                  },

                  conclusion: {
                    type: "string",
                  },

                  source_notes: {
                    type: "string",
                  },
                },

                required: [
                  "executive_summary",
                  "methodology",
                  "findings",
                  "identity_analysis",
                  "corporate_analysis",
                  "digital_intelligence",
                  "timeline_analysis",
                  "evidence_assessment",
                  "contradictions",
                  "hypotheses",
                  "conclusion",
                  "source_notes",
                ],
              },
            },
          },
        }),
      },
    )

  const responseText =
    await response.text()

  if (!response.ok) {
    let providerMessage =
      "OpenAI report generation failed."

    try {
      const errorData =
        JSON.parse(responseText)

      providerMessage =
        errorData?.error?.message ||
        providerMessage
    } catch {
      if (responseText.trim()) {
        providerMessage =
          responseText
      }
    }

    throw new Error(
      providerMessage,
    )
  }

  let responseData: {
    output_text?: string
    output?: Array<{
      type?: string
      content?: Array<{
        type?: string
        text?: string
      }>
    }>
  }

  try {
    responseData =
      JSON.parse(responseText)
  } catch {
    throw new Error(
      "OpenAI returned an invalid response.",
    )
  }

  let outputText =
    cleanString(
      responseData.output_text,
    )

  /*
   * Defensive fallback in case output_text
   * is not present in a REST response.
   */
  if (!outputText) {
    const textParts: string[] = []

    for (const item of
      responseData.output || []) {
      for (const content of
        item.content || []) {
        if (
          content.type ===
            "output_text" &&
          content.text
        ) {
          textParts.push(
            content.text,
          )
        }
      }
    }

    outputText =
      textParts.join("\n")
  }

  if (!outputText) {
    throw new Error(
      "OpenAI returned no report content.",
    )
  }

  let result: AiReportResult

  try {
    result =
      JSON.parse(
        outputText,
      ) as AiReportResult
  } catch {
    throw new Error(
      "The AI report response could not be parsed as structured report data.",
    )
  }

  return {
    result,
    model:
      AI_REPORT_MODEL,
  }
}

/*
 * ============================================================
 * SAFE SECTION COLLECTION
 * ============================================================
 */
function buildGeneratedSections(
  result: AiReportResult,
) {
  const sections: AiReportSection[] = []

  const pushTextSection = (
    sectionType: string,
    title: string,
    content: string,
    orderIndex: number,
  ) => {
    const cleanContent =
      cleanString(content)

    if (!cleanContent) {
      return
    }

    sections.push({
      section_type:
        sectionType,

      title,

      content:
        cleanContent,

      order_index:
        orderIndex,
    })
  }

  pushTextSection(
    "methodology",
    "Methodology",
    result.methodology,
    0,
  )

  pushTextSection(
    "identity_analysis",
    "Subject Identification & Identity Analysis",
    result.identity_analysis,
    10,
  )

  pushTextSection(
    "corporate_analysis",
    "Corporate Analysis",
    result.corporate_analysis,
    20,
  )

  pushTextSection(
    "digital_intelligence",
    "Digital Intelligence",
    result.digital_intelligence,
    30,
  )

  pushTextSection(
    "timeline_analysis",
    "Timeline Analysis",
    result.timeline_analysis,
    40,
  )

  pushTextSection(
    "evidence_assessment",
    "Evidence Assessment",
    result.evidence_assessment,
    50,
  )

  for (
    const finding of
      result.findings || []
  ) {
    if (
      cleanString(
        finding.title,
      ) &&
      cleanString(
        finding.content,
      )
    ) {
      sections.push({
        section_type:
          finding.section_type ||
          "finding",

        title:
          cleanString(
            finding.title,
          ),

        content:
          cleanString(
            finding.content,
          ),

        order_index:
          60 +
          safeNumber(
            finding.order_index,
          ),
      })
    }
  }

  for (
    const contradiction of
      result.contradictions || []
  ) {
    if (
      cleanString(
        contradiction.title,
      ) &&
      cleanString(
        contradiction.content,
      )
    ) {
      sections.push({
        section_type:
          contradiction.section_type ||
          "contradiction",

        title:
          cleanString(
            contradiction.title,
          ),

        content:
          cleanString(
            contradiction.content,
          ),

        order_index:
          200 +
          safeNumber(
            contradiction.order_index,
          ),
      })
    }
  }

  for (
    const hypothesis of
      result.hypotheses || []
  ) {
    if (
      cleanString(
        hypothesis.title,
      ) &&
      cleanString(
        hypothesis.content,
      )
    ) {
      sections.push({
        section_type:
          hypothesis.section_type ||
          "hypothesis",

        title:
          cleanString(
            hypothesis.title,
          ),

        content:
          cleanString(
            hypothesis.content,
          ),

        order_index:
          300 +
          safeNumber(
            hypothesis.order_index,
          ),
      })
    }
  }

  pushTextSection(
    "source_notes",
    "Source Notes",
    result.source_notes,
    400,
  )

  pushTextSection(
    "conclusion",
    "Conclusion",
    result.conclusion,
    500,
  )

  return sections
}

/*
 * ============================================================
 * GET
 * ============================================================
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    const { id } =
      await params

    const access =
      await requireCaseReadAccess(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.error,
        },
        {
          status:
            access.status,
        },
      )
    }

    const allReports =
      await loadReportDetails(
        access.caseId,
      )

    const isClient =
      access.user.role ===
      "client"

    const reports =
      isClient
        ? allReports.filter(
            (report) =>
              CLIENT_VISIBLE_STATUSES.has(
                String(
                  report.status ||
                    "",
                ),
              ),
          )
        : allReports

    const [
      evidence,
      entities,
      investigation,
    ] = await Promise.all([
      query(
        `
          SELECT
            id,
            file_name,
            file_hash,
            evidence_type

          FROM forensic_files

          WHERE case_id = $1

          ORDER BY created_at DESC
        `,
        [access.caseId],
      ),

      query(
        `
          SELECT
            id,
            name,
            entity_type,
            confidence_score

          FROM investigation_entities

          WHERE case_id = $1

          ORDER BY created_at DESC
        `,
        [access.caseId],
      ),

      loadInvestigationData(
        access.caseId,
      ),
    ])

    const readiness =
      calculateReadiness(
        investigation,
      )

    await auditLog(
      access.user.id,
      "reports_viewed",
      request,
      {
        case_id:
          access.caseId,
      },
    )

    return NextResponse.json({
      case_id:
        access.caseId,

      reports,

      evidence:
        evidence.rows.map(
          (item) => ({
            id: String(
              item.id,
            ),
            file_name:
              item.file_name ||
              null,
            status:
              item.evidence_type ||
              "submitted",
            sha256_hash:
              item.file_hash ||
              null,
          }),
        ),

      entities:
        entities.rows.map(
          (item) => ({
            id: String(
              item.id,
            ),
            name:
              item.name ||
              null,
            entity_type:
              item.entity_type ||
              null,
            confidence_score:
              item.confidence_score ===
              null
                ? null
                : Number(
                    item.confidence_score,
                  ),
          }),
        ),

      readiness,
    })
  } catch (error) {
    console.error(
      "REPORTS GET ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to load reports",
      },
      {
        status: 500,
      },
    )
  }
}

/*
 * ============================================================
 * POST
 * ============================================================
 *
 * Normal:
 *   Creates a blank draft.
 *
 * AI:
 *   action = generate_ai_draft
 *
 * The AI flow creates one report and its generated sections.
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    const { id } =
      await params

    const access =
      await requireCaseOperationalAccess(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.error,
        },
        {
          status:
            access.status,
        },
      )
    }

    if (
      !canManageReports(
        access.user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to create reports.",
        },
        {
          status: 403,
        },
      )
    }

    const body =
      await request.json()

    const action =
      optionalText(
        body?.action,
      ) ||
      "create"

    /*
     * ==========================================================
     * AI REPORT GENERATION
     * ==========================================================
     */
    if (
      action ===
      "generate_ai_draft"
    ) {
      const investigation =
        await loadInvestigationData(
          access.caseId,
        )

      if (
        !investigation.case
      ) {
        return NextResponse.json(
          {
            error:
              "Case not found",
          },
          {
            status: 404,
          },
        )
      }

      const readiness =
        calculateReadiness(
          investigation,
        )

      if (!readiness.ready) {
        return NextResponse.json(
          {
            error:
              "Investigation is not ready for AI report generation.",
            readiness,
          },
          {
            status: 400,
          },
        )
      }

      const title =
        optionalText(
          body?.title,
        ) ||
        `${investigation.case.title || "Investigation"} — Intelligence Report`

      const reportType =
        optionalText(
          body?.report_type,
        ) ||
        "intelligence"

      const classification =
        optionalText(
          body?.classification,
        ) ||
        "confidential"

      const creatorProfileId =
        await profileIdForUser(
          access.user.id,
        )

      if (!creatorProfileId) {
        return NextResponse.json(
          {
            error:
              "User profile missing",
          },
          {
            status: 500,
          },
        )
      }

      /*
       * Generate before inserting the report so a failed AI
       * request does not leave an empty report record behind.
       */
      const generated =
        await generateAiReport(
          investigation,
          {
            title,
            reportType,
            classification,
          },
        )

      const summary =
        cleanString(
          generated.result
            .executive_summary,
        )

      const inserted =
        await query(
          `
            INSERT INTO case_reports (
              case_id,
              title,
              file_url,
              summary,
              created_by,
              report_type,
              status,
              classification,
              created_at,
              updated_at
            )

            VALUES (
              $1,
              $2,
              NULL,
              $3,
              $4,
              $5,
              'draft',
              $6,
              NOW(),
              NOW()
            )

            RETURNING *
          `,
          [
            access.caseId,
            title,
            summary || null,
            creatorProfileId,
            reportType,
            classification,
          ],
        )

      const report =
        inserted.rows[0]

      if (!report) {
        throw new Error(
          "AI report creation returned no record",
        )
      }

      const sections =
        buildGeneratedSections(
          generated.result,
        )

      /*
       * Save all generated report sections.
       */
      for (
        const generatedSection of
          sections
      ) {
        await query(
          `
            INSERT INTO case_report_sections (
              report_id,
              section_type,
              title,
              content,
              order_index,
              created_by,
              created_at,
              updated_at
            )

            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              NOW(),
              NOW()
            )
          `,
          [
            report.id,
            generatedSection.section_type,
            generatedSection.title,
            generatedSection.content,
            Math.max(
              0,
              Math.trunc(
                generatedSection.order_index,
              ),
            ),
            creatorProfileId,
          ],
        )
      }

      /*
       * Attach all investigation entities to the generated
       * report. This means ReportViewer can show the graph
       * entities that informed the report.
       */
      for (
        const entity of
          investigation.entities
      ) {
        await query(
          `
            INSERT INTO case_report_entities (
              report_id,
              entity_id,
              created_by,
              created_at
            )

            VALUES (
              $1,
              $2,
              $3,
              NOW()
            )

            ON CONFLICT (
              report_id,
              entity_id
            )
            DO NOTHING
          `,
          [
            report.id,
            entity.id,
            creatorProfileId,
          ],
        )
      }

      /*
       * Attach all evidence items.
       */
      for (
        const evidenceItem of
          investigation.evidence
      ) {
        await query(
          `
            INSERT INTO case_report_evidence (
              report_id,
              forensic_file_id,
              created_by,
              created_at
            )

            VALUES (
              $1,
              $2,
              $3,
              NOW()
            )

            ON CONFLICT (
              report_id,
              forensic_file_id
            )
            DO NOTHING
          `,
          [
            report.id,
            evidenceItem.id,
            creatorProfileId,
          ],
        )
      }

      /*
       * Record AI analysis history using the existing
       * ai_analysis_runs table when available.
       *
       * Failure here must not invalidate the generated report.
       */
      await query(
        `
          INSERT INTO ai_analysis_runs (
            case_id,
            model_name,
            analysis_summary,
            entities_checked,
            relationships_checked,
            observations_created,
            created_at
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            NOW()
          )
        `,
        [
          access.caseId,
          generated.model,
          summary ||
            "AI-generated investigative report draft.",
          investigation.entities.length,
          investigation.relationships.length,
          investigation.observations.length,
        ],
      ).catch(
        (analysisError) => {
          console.warn(
            "AI ANALYSIS RUN RECORDING FAILED",
            analysisError,
          )
        },
      )

      await recordInvestigationTimeline(
        access.caseId,
        access.user.id,
        "report_ai_generated",
        "AI Investigation Report Generated",
        title,
      )

      await emitCaseWorkspaceEvent({
        type:
          "report.created",

        case_id:
          access.caseId,

        actor_id:
          access.user.id,

        record_id:
          String(report.id),

        data: {
          title,
          status:
            "draft",
          generated_by_ai:
            true,
          model:
            generated.model,
        },
      })

      await auditLog(
        access.user.id,
        "report_ai_draft_generated",
        request,
        {
          case_id:
            access.caseId,
          report_id:
            report.id,
          model:
            generated.model,
          entities_checked:
            investigation.entities.length,
          relationships_checked:
            investigation.relationships.length,
          sources_checked:
            investigation.sources.length,
          observations_checked:
            investigation.observations.length,
          evidence_checked:
            investigation.evidence.length,
        },
      )

      const refreshed =
        await loadReportDetails(
          access.caseId,
          String(report.id),
        )

      return NextResponse.json(
        {
          report:
            refreshed[0] ||
            report,

          generated_by_ai:
            true,

          model:
            generated.model,

          readiness,
        },
        {
          status: 201,
        },
      )
    }

    /*
     * ==========================================================
     * NORMAL BLANK REPORT
     * ==========================================================
     */
    const title =
      optionalText(
        body?.title,
      )

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Report title required",
        },
        {
          status: 400,
        },
      )
    }

    const creatorProfileId =
      await profileIdForUser(
        access.user.id,
      )

    if (!creatorProfileId) {
      return NextResponse.json(
        {
          error:
            "User profile missing",
        },
        {
          status: 500,
        },
      )
    }

    const reportType =
      optionalText(
        body?.report_type,
      ) ||
      "intelligence"

    const classification =
      optionalText(
        body?.classification,
      ) ||
      "confidential"

    const summary =
      optionalText(
        body?.executive_summary,
      ) ??
      optionalText(
        body?.summary,
      )

    const inserted =
      await query(
        `
          INSERT INTO case_reports (
            case_id,
            title,
            file_url,
            summary,
            created_by,
            report_type,
            status,
            classification,
            created_at,
            updated_at
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            'draft',
            $7,
            NOW(),
            NOW()
          )

          RETURNING *
        `,
        [
          access.caseId,
          title,
          optionalText(
            body?.file_url,
          ),
          summary,
          creatorProfileId,
          reportType,
          classification,
        ],
      )

    const report =
      inserted.rows[0]

    if (!report) {
      throw new Error(
        "Report creation returned no record",
      )
    }

    await recordInvestigationTimeline(
      access.caseId,
      access.user.id,
      "report_created",
      "Report Created",
      title,
    )

    await emitCaseWorkspaceEvent({
      type:
        "report.created",
      case_id:
        access.caseId,
      actor_id:
        access.user.id,
      record_id:
        String(report.id),
      data: {
        title,
        status:
          "draft",
      },
    })

    await auditLog(
      access.user.id,
      "report_created",
      request,
      {
        case_id:
          access.caseId,
        report_id:
          report.id,
      },
    )

    return NextResponse.json(
      report,
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "REPORTS POST ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create report",
      },
      {
        status: 500,
      },
    )
  }
}

/*
 * ============================================================
 * PATCH
 * ============================================================
 *
 * Existing actions retained:
 *
 * update_report
 * add_section
 * attach_evidence
 * attach_entity
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    const { id } =
      await params

    const access =
      await requireCaseOperationalAccess(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.error,
        },
        {
          status:
            access.status,
        },
      )
    }

    const body =
      await request.json()

    const reportId =
      optionalText(
        body?.report_id,
      )

    if (!reportId) {
      return NextResponse.json(
        {
          error:
            "Report id required",
        },
        {
          status: 400,
        },
      )
    }

    const report =
      await verifyReportBelongsToCase(
        reportId,
        access.caseId,
      )

    if (!report) {
      return NextResponse.json(
        {
          error:
            "Report not found",
        },
        {
          status: 404,
        },
      )
    }

    const action =
      optionalText(
        body?.action,
      ) ||
      "update_report"

    /*
     * ==========================================================
     * CLIENTS ARE READ-ONLY
     * ==========================================================
     */
    if (
      access.user.role ===
      "client"
    ) {
      return NextResponse.json(
        {
          error:
            "Clients cannot modify case reports.",
        },
        {
          status: 403,
        },
      )
    }

    /*
     * ==========================================================
     * ROLE AUTHORIZATION
     * ==========================================================
     */
    if (
      !canManageReports(
        access.user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to modify this report.",
        },
        {
          status: 403,
        },
      )
    }

    /*
     * ==========================================================
     * FINALIZED REPORT PROTECTION
     * ==========================================================
     *
     * Once approved/published, the report is no longer an
     * ordinary working document.
     */
    const currentStatus =
      String(
        report.status ||
          "draft",
      )
        .trim()
        .toLowerCase()

    const finalizedStatuses =
      new Set([
        "approved",
        "delivered",
        "final",
        "published",
      ])

    const isFinalized =
      finalizedStatuses.has(
        currentStatus,
      )

    const allowedAfterFinalization =
      new Set([
        "update_report",
      ])

    if (
      isFinalized &&
      !allowedAfterFinalization.has(
        action,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This report is in a controlled final state and can no longer be structurally edited.",
        },
        {
          status: 409,
        },
      )
    }

    const actorProfileId =
      await profileIdForUser(
        access.user.id,
      )

    if (!actorProfileId) {
      return NextResponse.json(
        {
          error:
            "User profile missing",
        },
        {
          status: 500,
        },
      )
    }

    /*
     * ==========================================================
     * ADD SECTION
     * ==========================================================
     */
    if (
      action ===
      "add_section"
    ) {
      const sectionTitle =
        optionalText(
          body?.title,
        )

      const sectionContent =
        optionalText(
          body?.content,
        )

      const sectionType =
        optionalText(
          body?.section_type,
        ) ||
        "analysis"

      if (
        !sectionTitle ||
        !sectionContent
      ) {
        return NextResponse.json(
          {
            error:
              "Section title and content are required.",
          },
          {
            status: 400,
          },
        )
      }

      const requestedOrder =
        Number(
          body?.order_index,
        )

      const orderIndex =
        Number.isFinite(
          requestedOrder,
        )
          ? Math.max(
              0,
              Math.trunc(
                requestedOrder,
              ),
            )
          : 0

      /*
       * Shift existing sections when inserting
       * into an occupied position.
       */
      await query(
        `
          UPDATE case_report_sections
          SET
            order_index =
              order_index + 1,
            updated_at =
              NOW()

          WHERE
            report_id = $1
            AND order_index >= $2
        `,
        [
          reportId,
          orderIndex,
        ],
      )

      const sectionResult =
        await query(
          `
            INSERT INTO case_report_sections (
              report_id,
              section_type,
              title,
              content,
              order_index,
              created_by,
              created_at,
              updated_at
            )

            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              NOW(),
              NOW()
            )

            RETURNING *
          `,
          [
            reportId,
            sectionType,
            sectionTitle,
            sectionContent,
            orderIndex,
            actorProfileId,
          ],
        )

      await query(
        `
          UPDATE case_reports

          SET
            updated_at =
              NOW(),

            status =
              CASE
                WHEN status = 'review'
                THEN 'draft'
                ELSE status
              END

          WHERE id = $1
        `,
        [reportId],
      )

      await recordInvestigationTimeline(
        access.caseId,
        access.user.id,
        "report_section_added",
        "Report Section Added",
        sectionTitle,
      )

      await auditLog(
        access.user.id,
        "report_section_added",
        request,
        {
          case_id:
            access.caseId,
          report_id:
            reportId,
          section_id:
            sectionResult.rows[0]
              ?.id,
          section_type:
            sectionType,
        },
      )

      const refreshed =
        await loadReportDetails(
          access.caseId,
          reportId,
        )

      return NextResponse.json(
        refreshed[0],
      )
    }

    /*
     * ==========================================================
     * UPDATE SECTION
     * ==========================================================
     */
    if (
      action ===
      "update_section"
    ) {
      const sectionId =
        optionalText(
          body?.section_id,
        )

      if (!sectionId) {
        return NextResponse.json(
          {
            error:
              "Section id required",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * The section must belong to this report and therefore
       * to this case.
       */
      const existingSection =
        await query<{
          id: string
          title: string | null
          content: string | null
          section_type:
            | string
            | null
          order_index: number
        }>(
          `
            SELECT
              id,
              title,
              content,
              section_type,
              order_index

            FROM case_report_sections

            WHERE
              id = $1
              AND report_id = $2

            LIMIT 1
          `,
          [
            sectionId,
            reportId,
          ],
        )

      const oldSection =
        existingSection.rows[0]

      if (!oldSection) {
        return NextResponse.json(
          {
            error:
              "Report section not found",
          },
          {
            status: 404,
          },
        )
      }

      const nextTitle =
        body?.title !==
        undefined
          ? optionalText(
              body.title,
            )
          : oldSection.title

      const nextContent =
        body?.content !==
        undefined
          ? optionalText(
              body.content,
            )
          : oldSection.content

      const nextType =
        body?.section_type !==
        undefined
          ? optionalText(
              body.section_type,
            ) ||
            "analysis"
          : oldSection.section_type ||
            "analysis"

      if (
        !nextTitle ||
        !nextContent
      ) {
        return NextResponse.json(
          {
            error:
              "Section title and content are required.",
          },
          {
            status: 400,
          },
        )
      }

      const updatedSection =
        await query(
          `
            UPDATE case_report_sections

            SET
              section_type =
                $2,

              title =
                $3,

              content =
                $4,

              updated_at =
                NOW()

            WHERE
              id = $1
              AND report_id = $5

            RETURNING *
          `,
          [
            sectionId,
            nextType,
            nextTitle,
            nextContent,
            reportId,
          ],
        )

      if (!updatedSection.rows[0]) {
        return NextResponse.json(
          {
            error:
              "Failed to update report section",
          },
          {
            status: 500,
          },
        )
      }

      /*
       * Any human edit after submission for review
       * returns the document to draft.
       */
      await query(
        `
          UPDATE case_reports

          SET
            updated_at = NOW(),

            status =
              CASE
                WHEN status = 'review'
                THEN 'draft'
                ELSE status
              END

          WHERE id = $1
        `,
        [reportId],
      )

      await recordInvestigationTimeline(
        access.caseId,
        access.user.id,
        "report_section_updated",
        "Report Section Updated",
        nextTitle,
      )

      await auditLog(
        access.user.id,
        "report_section_updated",
        request,
        {
          case_id:
            access.caseId,
          report_id:
            reportId,
          section_id:
            sectionId,
        },
      )

      const refreshed =
        await loadReportDetails(
          access.caseId,
          reportId,
        )

      return NextResponse.json(
        refreshed[0],
      )
    }

    /*
     * ==========================================================
     * DELETE SECTION
     * ==========================================================
     */
    if (
      action ===
      "delete_section"
    ) {
      const sectionId =
        optionalText(
          body?.section_id,
        )

      if (!sectionId) {
        return NextResponse.json(
          {
            error:
              "Section id required",
          },
          {
            status: 400,
          },
        )
      }

      const existingSection =
        await query<{
          id: string
          title: string | null
          order_index: number
        }>(
          `
            SELECT
              id,
              title,
              order_index

            FROM case_report_sections

            WHERE
              id = $1
              AND report_id = $2

            LIMIT 1
          `,
          [
            sectionId,
            reportId,
          ],
        )

      const section =
        existingSection.rows[0]

      if (!section) {
        return NextResponse.json(
          {
            error:
              "Report section not found",
          },
          {
            status: 404,
          },
        )
      }

      await query(
        `
          DELETE FROM case_report_sections

          WHERE
            id = $1
            AND report_id = $2
        `,
        [
          sectionId,
          reportId,
        ],
      )

      /*
       * Normalize remaining section order.
       */
      await query(
        `
          WITH ordered AS (
            SELECT
              id,
              ROW_NUMBER() OVER (
                ORDER BY
                  order_index ASC,
                  created_at ASC,
                  id ASC
              ) - 1 AS new_order

            FROM case_report_sections

            WHERE report_id = $1
          )

          UPDATE case_report_sections crs

          SET
            order_index =
              ordered.new_order,

            updated_at =
              NOW()

          FROM ordered

          WHERE
            crs.id =
              ordered.id
        `,
        [reportId],
      )

      await query(
        `
          UPDATE case_reports

          SET
            updated_at =
              NOW(),

            status =
              CASE
                WHEN status = 'review'
                THEN 'draft'
                ELSE status
              END

          WHERE id = $1
        `,
        [reportId],
      )

      await recordInvestigationTimeline(
        access.caseId,
        access.user.id,
        "report_section_deleted",
        "Report Section Deleted",
        section.title ||
          "Report section",
      )

      await auditLog(
        access.user.id,
        "report_section_deleted",
        request,
        {
          case_id:
            access.caseId,
          report_id:
            reportId,
          section_id:
            sectionId,
        },
      )

      const refreshed =
        await loadReportDetails(
          access.caseId,
          reportId,
        )

      return NextResponse.json(
        refreshed[0],
      )
    }

    /*
     * ==========================================================
     * REORDER SECTIONS
     * ==========================================================
     *
     * Body:
     *
     * {
     *   action: "reorder_sections",
     *   report_id: "...",
     *   section_ids: ["id1", "id2", "id3"]
     * }
     */
    if (
      action ===
      "reorder_sections"
    ) {
      const sectionIds =
        Array.isArray(
          body?.section_ids,
        )
          ? body.section_ids
              .map(
                (
                  value: unknown,
                ) =>
                  optionalText(
                    value,
                  ),
              )
              .filter(
                Boolean,
              )
          : []

      if (!sectionIds.length) {
        return NextResponse.json(
          {
            error:
              "Section ids required",
          },
          {
            status: 400,
          },
        )
      }

      const existing =
        await query<{
          id: string
        }>(
          `
            SELECT id

            FROM case_report_sections

            WHERE report_id = $1
          `,
          [reportId],
        )

      const existingIds =
        existing.rows.map(
          (row) =>
            String(row.id),
        )

      const requestedIds =
        uniqueStrings(
          sectionIds,
        )

      const sameSet =
        requestedIds.length ===
          existingIds.length &&
        requestedIds.every(
          (sectionId) =>
            existingIds.includes(
              sectionId,
            ),
        )

      if (!sameSet) {
        return NextResponse.json(
          {
            error:
              "The supplied section order does not match the report's sections.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * Temporary negative order values avoid
       * collisions during the update.
       */
      for (
        let index = 0;
        index <
        requestedIds.length;
        index += 1
      ) {
        await query(
          `
            UPDATE case_report_sections

            SET
              order_index =
                $3,

              updated_at =
                NOW()

            WHERE
              id = $1
              AND report_id = $2
          `,
          [
            requestedIds[index],
            reportId,
            -(
              index + 1
            ),
          ],
        )
      }

      for (
        let index = 0;
        index <
        requestedIds.length;
        index += 1
      ) {
        await query(
          `
            UPDATE case_report_sections

            SET
              order_index =
                $3,

              updated_at =
                NOW()

            WHERE
              id = $1
              AND report_id = $2
          `,
          [
            requestedIds[index],
            reportId,
            index,
          ],
        )
      }

      await query(
        `
          UPDATE case_reports

          SET
            updated_at =
              NOW(),

            status =
              CASE
                WHEN status = 'review'
                THEN 'draft'
                ELSE status
              END

          WHERE id = $1
        `,
        [reportId],
      )

      await recordInvestigationTimeline(
        access.caseId,
        access.user.id,
        "report_sections_reordered",
        "Report Sections Reordered",
        `Updated order for ${requestedIds.length} sections`,
      )

      await auditLog(
        access.user.id,
        "report_sections_reordered",
        request,
        {
          case_id:
            access.caseId,
          report_id:
            reportId,
          section_count:
            requestedIds.length,
        },
      )

      const refreshed =
        await loadReportDetails(
          access.caseId,
          reportId,
        )

      return NextResponse.json(
        refreshed[0],
      )
    }

    /*
     * ==========================================================
     * ATTACH EVIDENCE
     * ==========================================================
     */
    if (
      action ===
      "attach_evidence"
    ) {
      const evidenceId =
        optionalText(
          body?.evidence_id,
        )

      if (!evidenceId) {
        return NextResponse.json(
          {
            error:
              "Evidence id required",
          },
          {
            status: 400,
          },
        )
      }

      const evidence =
        await query<{
          id: string
        }>(
          `
            SELECT id

            FROM forensic_files

            WHERE
              id = $1
              AND case_id = $2

            LIMIT 1
          `,
          [
            evidenceId,
            access.caseId,
          ],
        )

      if (!evidence.rows[0]) {
        return NextResponse.json(
          {
            error:
              "Evidence not found for this case",
          },
          {
            status: 404,
          },
        )
      }

      await query(
        `
          INSERT INTO case_report_evidence (
            report_id,
            forensic_file_id,
            created_by,
            created_at
          )

          VALUES (
            $1,
            $2,
            $3,
            NOW()
          )

          ON CONFLICT (
            report_id,
            forensic_file_id
          )
          DO NOTHING
        `,
        [
          reportId,
          evidenceId,
          actorProfileId,
        ],
      )

      await query(
        `
          UPDATE case_reports

          SET
            updated_at =
              NOW(),

            status =
              CASE
                WHEN status = 'review'
                THEN 'draft'
                ELSE status
              END

          WHERE id = $1
        `,
        [reportId],
      )

      await auditLog(
        access.user.id,
        "report_evidence_attached",
        request,
        {
          case_id:
            access.caseId,
          report_id:
            reportId,
          evidence_id:
            evidenceId,
        },
      )

      const refreshed =
        await loadReportDetails(
          access.caseId,
          reportId,
        )

      return NextResponse.json(
        refreshed[0],
      )
    }

    /*
     * ==========================================================
     * ATTACH ENTITY
     * ==========================================================
     */
    if (
      action ===
      "attach_entity"
    ) {
      const entityId =
        optionalText(
          body?.entity_id,
        )

      if (!entityId) {
        return NextResponse.json(
          {
            error:
              "Entity id required",
          },
          {
            status: 400,
          },
        )
      }

      const entity =
        await query<{
          id: string
        }>(
          `
            SELECT id

            FROM investigation_entities

            WHERE
              id = $1
              AND case_id = $2

            LIMIT 1
          `,
          [
            entityId,
            access.caseId,
          ],
        )

      if (!entity.rows[0]) {
        return NextResponse.json(
          {
            error:
              "Entity not found for this case",
          },
          {
            status: 404,
          },
        )
      }

      await query(
        `
          INSERT INTO case_report_entities (
            report_id,
            entity_id,
            created_by,
            created_at
          )

          VALUES (
            $1,
            $2,
            $3,
            NOW()
          )

          ON CONFLICT (
            report_id,
            entity_id
          )
          DO NOTHING
        `,
        [
          reportId,
          entityId,
          actorProfileId,
        ],
      )

      await query(
        `
          UPDATE case_reports

          SET
            updated_at =
              NOW(),

            status =
              CASE
                WHEN status = 'review'
                THEN 'draft'
                ELSE status
              END

          WHERE id = $1
        `,
        [reportId],
      )

      await auditLog(
        access.user.id,
        "report_entity_attached",
        request,
        {
          case_id:
            access.caseId,
          report_id:
            reportId,
          entity_id:
            entityId,
        },
      )

      const refreshed =
        await loadReportDetails(
          access.caseId,
          reportId,
        )

      return NextResponse.json(
        refreshed[0],
      )
    }

    /*
     * ==========================================================
     * STATUS / GENERAL REPORT UPDATE
     * ==========================================================
     */
    const requestedStatus =
      body?.status !==
      undefined
        ? normalizeStatus(
            body.status,
          )
        : null

    if (
      body?.status !==
        undefined &&
      !requestedStatus
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid report status.",
        },
        {
          status: 400,
        },
      )
    }

    const approvalAction =
      action === "approve"

    const deliveryAction =
      action === "deliver"

    const publishAction =
      action === "publish"

    if (
      (approvalAction ||
        deliveryAction ||
        publishAction ||
        requestedStatus ===
          "approved" ||
        requestedStatus ===
          "delivered" ||
        requestedStatus ===
          "final" ||
        requestedStatus ===
          "published") &&
      !canApproveReports(
        access.user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Only an administrator or Super Administrator can approve, finalize, deliver, or publish reports.",
        },
        {
          status: 403,
        },
      )
    }

    let nextStatus =
      requestedStatus

    if (approvalAction) {
      nextStatus =
        "approved"
    } else if (
      deliveryAction
    ) {
      nextStatus =
        "delivered"
    } else if (
      publishAction
    ) {
      nextStatus =
        "published"
    }

    /*
     * ==========================================================
     * STATUS TRANSITION VALIDATION
     * ==========================================================
     */
    const statusTransitions:
      Record<
        string,
        string[]
      > = {
        draft: [
          "draft",
          "review",
        ],

        review: [
          "review",
          "draft",
          "approved",
        ],

        approved: [
          "approved",
          "delivered",
          "final",
          "published",
        ],

        delivered: [
          "delivered",
          "final",
          "published",
        ],

        final: [
          "final",
          "published",
        ],

        published: [
          "published",
        ],
      }

    if (
      nextStatus &&
      !statusTransitions[
        currentStatus
      ]?.includes(
        nextStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            `Invalid report transition from ${currentStatus} to ${nextStatus}.`,
        },
        {
          status: 409,
        },
      )
    }

    /*
     * ==========================================================
     * GENERAL FIELDS
     * ==========================================================
     */
    const title =
      optionalText(
        body?.title,
      )

    const fileUrl =
      optionalText(
        body?.file_url,
      )

    const summary =
      optionalText(
        body?.summary,
      ) ??
      optionalText(
        body?.executive_summary,
      )

    const reportType =
      optionalText(
        body?.report_type,
      )

    const classification =
      optionalText(
        body?.classification,
      )

    /*
     * ==========================================================
     * FINAL/APPROVAL REQUIREMENTS
     * ==========================================================
     *
     * Before approval/finalization/publishing, verify that the
     * report actually contains investigative material.
     */
    if (
      nextStatus &&
      [
        "approved",
        "delivered",
        "final",
        "published",
      ].includes(
        nextStatus,
      )
    ) {
      const readiness =
        await query<{
          section_count: number
          evidence_count: number
          entity_count: number
        }>(
          `
            SELECT
              (
                SELECT COUNT(*)
                FROM case_report_sections
                WHERE report_id = $1
              )::int AS section_count,

              (
                SELECT COUNT(*)
                FROM case_report_evidence
                WHERE report_id = $1
              )::int AS evidence_count,

              (
                SELECT COUNT(*)
                FROM case_report_entities
                WHERE report_id = $1
              )::int AS entity_count
          `,
          [reportId],
        )

      const readinessRow =
        readiness.rows[0]

      if (
        !readinessRow ||
        Number(
          readinessRow.section_count,
        ) < 1
      ) {
        return NextResponse.json(
          {
            error:
              "A report must contain at least one substantive section before approval.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * Evidence and entity linkage are required for formal
       * approval unless the administrator deliberately works
       * with a narrative-only report.
       *
       * We do not hard-fail on missing evidence here because
       * some legitimate intelligence reports may be based on
       * source records rather than uploaded files.
       */
    }

    /*
     * ==========================================================
     * UPDATE REPORT
     * ==========================================================
     */
    const updated =
      await query(
        `
          UPDATE case_reports

          SET
            title = COALESCE(
              $2,
              title
            ),

            file_url = COALESCE(
              $3,
              file_url
            ),

            summary = COALESCE(
              $4,
              summary
            ),

            report_type = COALESCE(
              $5,
              report_type
            ),

            classification = COALESCE(
              $6,
              classification
            ),

            status = COALESCE(
              $7,
              status
            ),

            approved_by =
              CASE
                WHEN $7 IN (
                  'approved',
                  'delivered',
                  'final',
                  'published'
                )
                THEN $8

                WHEN $7 = 'draft'
                THEN NULL

                ELSE approved_by
              END,

            updated_at =
              NOW()

          WHERE
            id = $1
            AND case_id = $9

          RETURNING *
        `,
        [
          reportId,
          title,
          fileUrl,
          summary,
          reportType,
          classification,
          nextStatus,
          actorProfileId,
          access.caseId,
        ],
      )

    if (!updated.rows[0]) {
      return NextResponse.json(
        {
          error:
            "Report not found",
        },
        {
          status: 404,
        },
      )
    }

    const updatedReport =
      updated.rows[0]

    const finalTitle =
      typeof updatedReport.title ===
        "string" &&
      updatedReport.title.trim()
        ? updatedReport.title.trim()
      : "Case report"

    if (nextStatus === "review") {
      await notifySuperAdmins({
        caseId:
          access.caseId,
        type:
          "report_pending_approval",
        title:
          "Report pending approval",
        message: `${finalTitle} is ready for review.`,
        metadata: {
          report_id:
            reportId,
          case_id:
            access.caseId,
          resource_type:
            "report",
          resource_id:
            reportId,
          target_page:
            "report_review",
          audience:
            "super_administrator",
          action:
            "review_report",
        },
      })
    }

    if (nextStatus === "approved") {
      const author =
        await query<{
          user_id: string | null
        }>(
          `
            SELECT user_id
            FROM user_profiles
            WHERE id = $1
            LIMIT 1
          `,
          [
            updatedReport.created_by,
          ],
        )

      const authorUserId =
        author.rows[0]?.user_id || null

      if (
        authorUserId &&
        authorUserId !==
          access.user.id
      ) {
        await notifyUser(authorUserId, {
          caseId:
            access.caseId,
          type:
            "report_approved",
          title:
            "Report approved",
          message: `${finalTitle} has been approved.`,
          metadata: {
            report_id:
              reportId,
            case_id:
              access.caseId,
            resource_type:
              "report",
            resource_id:
              reportId,
            target_page:
              "report_review",
            audience:
              "staff",
            action:
              "view_report",
          },
        })
      }
    }

    /*
     * ==========================================================
     * TIMELINE
     * ==========================================================
     */
    if (
      nextStatus
    ) {
      const timelineType =
        nextStatus ===
        "approved"
          ? "report_approved"
          : nextStatus ===
              "published"
            ? "report_published"
            : nextStatus ===
                "delivered"
              ? "report_delivered"
              : nextStatus ===
                  "final"
                ? "report_finalized"
                : nextStatus ===
                    "review"
                  ? "report_submitted_for_review"
                  : "report_status_updated"

      await recordInvestigationTimeline(
        access.caseId,
        access.user.id,
        timelineType,
        `Report ${formatLabel(
          nextStatus,
        )}`,
        finalTitle,
      )
    } else {
      await recordInvestigationTimeline(
        access.caseId,
        access.user.id,
        "report_updated",
        "Report Updated",
        finalTitle,
      )
    }

    /*
     * ==========================================================
     * REALTIME EVENT
     * ==========================================================
     */
    if (
      nextStatus ===
      "published"
    ) {
      await emitCaseWorkspaceEvent({
        type:
          "report.published",

        case_id:
          access.caseId,

        actor_id:
          access.user.id,

        record_id:
          String(reportId),

        data: {
          title:
            finalTitle,

          status:
            nextStatus,
        },
      })
    }

    /*
     * ==========================================================
     * AUDIT
     * ==========================================================
     */
    const auditAction =
      nextStatus ===
        "approved"
        ? "report_approved"
        : nextStatus ===
            "published"
          ? "report_published"
          : nextStatus ===
              "delivered"
            ? "report_delivered"
            : nextStatus ===
                "final"
              ? "report_finalized"
              : nextStatus ===
                  "review"
                ? "report_submitted_for_review"
                : "report_updated"

    await auditLog(
      access.user.id,
      auditAction,
      request,
      {
        case_id:
          access.caseId,

        report_id:
          reportId,

        status:
          nextStatus,

        previous_status:
          currentStatus,
      },
    )

    const refreshed =
      await loadReportDetails(
        access.caseId,
        reportId,
      )

    return NextResponse.json(
      refreshed[0] ||
        updatedReport,
    )
  } catch (error) {
    console.error(
      "REPORTS PATCH ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update report",
      },
      {
        status: 500,
      },
    )
  }
}
function formatLabel(nextStatus: string) {
  throw new Error("Function not implemented.")
}
