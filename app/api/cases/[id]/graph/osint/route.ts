import { NextRequest, NextResponse } from "next/server"

import { query, withTransaction } from "@/lib/db"
import {
  optionalText,
  profileIdForUser,
  requireCaseReadAccess,
  requireInvestigationWorkspace,
} from "@/lib/investigation-workspace"
import {
  normalizeConfidence,
  normalizeEntityType,
  normalizeVerificationStatus,
  OSINT_TRANSFORMS,
  type NormalizedOsintResult,
} from "@/lib/osint-workspace"

function canManageGraph(
  role: string | null | undefined,
) {
  return [
    "super_administrator",
    "super-administrator",
    "administrator",
    "staff",
    "investigator",
    "analyst",
  ].includes(String(role))
}

function resultForManualReview(
  id: string,
  queryValue: string,
  queryType: string,
  sourceUrl: string | null,
  notes: string | null,
): NormalizedOsintResult {
  const retrievedAt =
    new Date().toISOString()

  return {
    id,
    title: `Review ${queryValue}`,
    entity_type: queryType || "LEAD",
    value: queryValue,
    description:
      notes ||
      "Manual OSINT review item staged for analyst validation. Add a source URL or notes before treating it as evidence.",
    provider: "manual",
    transform: "manual_open_source_review",
    source_url:
      sourceUrl ||
      (/^https?:\/\//i.test(
        queryValue,
      )
        ? queryValue
        : null),
    confidence: 25,
    verification_status: "candidate",
    retrieved_at: retrievedAt,
    safe_snapshot: {
      query: queryValue,
      query_type: queryType,
      source_url: sourceUrl,
      notes,
      retrieved_at: retrievedAt,
      provider_policy:
        "Manual entry only; no private or commercial database queried.",
    },
    terms_classification:
      "manual_open_source",
  }
}

function paginationValue(
  value: string | null,
  fallback: number,
  max: number,
) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(
    max,
    Math.max(
      1,
      Math.floor(parsed),
    ),
  )
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  },
) {
  try {
    const { id } = await context.params
    const access =
      await requireCaseReadAccess(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      )
    }

    const url = new URL(
      request.url,
    )
    const page = paginationValue(
      url.searchParams.get("page"),
      1,
      1000,
    )
    const pageSize = paginationValue(
      url.searchParams.get("page_size"),
      25,
      100,
    )
    const offset =
      (page - 1) * pageSize

    const [result, count] =
      await Promise.all([
        query(
      `
        SELECT
          osr.id AS id,
          osr.case_id AS case_id,
          osr.query_entity_id AS query_entity_id,
          osr.exact_query_value AS exact_query_value,
          osr.query_type AS query_type,
          osr.provider AS provider,
          osr.transform AS transform,
          osr.title AS title,
          osr.entity_type AS entity_type,
          osr.value AS value,
          osr.description AS description,
          osr.source_url AS source_url,
          osr.retrieved_at AS retrieved_at,
          osr.search_time_ms AS search_time_ms,
          osr.normalized_result AS normalized_result,
          osr.import_decision AS import_decision,
          osr.confidence AS confidence,
          osr.verification_status AS verification_status,
          osr.terms_classification AS terms_classification,
          osr.imported_entity_id AS imported_entity_id,
          osr.imported_relationship_id AS imported_relationship_id,
          osr.created_at AS created_at
        FROM osint_search_results osr
        WHERE osr.case_id = $1
        ORDER BY osr.created_at DESC
        LIMIT $2 OFFSET $3
      `,
          [
            access.caseId,
            pageSize,
            offset,
          ],
        ),

        query<{ total: string }>(
          `
            SELECT COUNT(*)::text AS total
            FROM osint_search_results osr
            WHERE osr.case_id = $1
          `,
          [access.caseId],
        ),
      ])

    const total = Number(
      count.rows[0]?.total ?? 0,
    )

    return NextResponse.json({
      transforms: OSINT_TRANSFORMS,
      results: result.rows,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages:
          Math.max(
            1,
            Math.ceil(total / pageSize),
          ),
      },
    })
  } catch (error) {
    console.error(
      "GET OSINT RESULTS ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to load staged OSINT results. Has scripts/osint-graph-workspace.sql been applied?",
      },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  },
) {
  try {
    const { id } = await context.params
    const access =
      await requireInvestigationWorkspace(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      )
    }

    if (!canManageGraph(access.user.role)) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to run OSINT graph searches.",
        },
        { status: 403 },
      )
    }

    const body = await request.json()
    const queryValue =
      optionalText(body?.query) ||
      optionalText(body?.exact_query_value)
    const queryType =
      normalizeEntityType(
        body?.query_type || "LEAD",
      )
    const transformId =
      optionalText(body?.transform) ||
      "manual_open_source_review"
    const sourceUrl = optionalText(
      body?.source_url,
    )
    const notes = optionalText(
      body?.notes,
    )
    const selectedTransform =
      OSINT_TRANSFORMS.find(
        (transform) =>
          transform.id === transformId,
      )

    if (!queryValue) {
      return NextResponse.json(
        { error: "Search query is required." },
        { status: 400 },
      )
    }

    if (
      !selectedTransform ||
      !selectedTransform.configured
    ) {
      return NextResponse.json(
        {
          error:
            "Selected provider transform is not configured with approved credentials.",
        },
        { status: 400 },
      )
    }

    const startedAt = Date.now()

    const normalized =
      resultForManualReview(
        crypto.randomUUID(),
        queryValue,
        queryType,
        sourceUrl,
        notes,
      )

    const searchTimeMs =
      Date.now() - startedAt

    const result = await query(
      `
        INSERT INTO osint_search_results (
          case_id,
          query_entity_id,
          exact_query_value,
          query_type,
          provider,
          transform,
          title,
          entity_type,
          value,
          description,
          source_url,
          retrieved_at,
          search_time_ms,
          normalized_result,
          raw_result_snapshot,
          import_decision,
          confidence,
          verification_status,
          terms_classification
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
          $13,$14::jsonb,$15::jsonb,$16,$17,$18,$19
        )
        RETURNING *
      `,
      [
        access.caseId,
        optionalText(body?.query_entity_id),
        queryValue,
        queryType,
        normalized.provider,
        normalized.transform,
        normalized.title,
        normalized.entity_type,
        normalized.value,
        normalized.description,
        normalized.source_url,
        normalized.retrieved_at,
        searchTimeMs,
        JSON.stringify(normalized),
        JSON.stringify(normalized.safe_snapshot),
        "staged",
        normalized.confidence,
        normalized.verification_status,
        normalized.terms_classification,
      ],
    )

    return NextResponse.json(
      {
        transforms: OSINT_TRANSFORMS,
        result: result.rows[0],
      },
      { status: 201 },
    )
  } catch (error) {
    console.error(
      "CREATE OSINT RESULT ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to stage OSINT result. Has scripts/osint-graph-workspace.sql been applied?",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  },
) {
  try {
    const { id } = await context.params
    const access =
      await requireInvestigationWorkspace(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      )
    }

    if (!canManageGraph(access.user.role)) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to import OSINT graph results.",
        },
        { status: 403 },
      )
    }

    const body = await request.json()
    const resultId = optionalText(body?.result_id)
    const decision =
      optionalText(body?.decision) || "review"

    if (!resultId) {
      return NextResponse.json(
        { error: "Result id is required." },
        { status: 400 },
      )
    }

    const actorProfileId =
      await profileIdForUser(
        access.user.id,
      )

    if (!actorProfileId) {
      return NextResponse.json(
        { error: "User profile missing" },
        { status: 500 },
      )
    }

    const staged = await query<{
      id: string
      title: string
      entity_type: string
      value: string
      description: string | null
      provider: string
      transform: string
      source_url: string | null
      confidence: number | string | null
      verification_status: string
      retrieved_at: string
      normalized_result: Record<string, unknown>
    }>(
      `
        SELECT osr.*
        FROM osint_search_results osr
        WHERE osr.id = $1 AND osr.case_id = $2
        LIMIT 1
      `,
      [resultId, access.caseId],
    )

    const row = staged.rows[0]

    if (!row) {
      return NextResponse.json(
        { error: "Staged result not found." },
        { status: 404 },
      )
    }

    if (
      decision === "ignore" ||
      decision === "review"
    ) {
      const updated = await query(
        `
          UPDATE osint_search_results osr
          SET
            import_decision = $1,
            imported_by = $2,
            updated_at = now()
          WHERE osr.id = $3 AND osr.case_id = $4
          RETURNING osr.*
        `,
        [
          decision === "ignore"
            ? "ignored"
            : "marked_for_review",
          actorProfileId,
          resultId,
          access.caseId,
        ],
      )

      return NextResponse.json(
        updated.rows[0],
      )
    }

    let relationshipId: string | null = null
    const queryEntityId = optionalText(
      body?.query_entity_id,
    )
    const relationshipType =
      optionalText(
        body?.relationship_type,
      ) || "derived_from"

    const updated = await withTransaction(
      async (client) => {
        if (
          decision ===
            "add_with_relationship" &&
          queryEntityId
        ) {
          const existingEntity =
            await client.query(
              `
                SELECT ie.id AS id
                FROM investigation_entities ie
                WHERE ie.id = $1 AND ie.case_id = $2
                LIMIT 1
              `,
              [
                queryEntityId,
                access.caseId,
              ],
            )

          if (!existingEntity.rows[0]) {
            throw new Error(
              "Query entity does not belong to this case.",
            )
          }
        }

        const source =
          await client.query<{
            id: string
          }>(
            `
              INSERT INTO intelligence_sources (
                case_id,
                source_type,
                title,
                url,
                description,
                reliability_score,
                collected_by,
                collected_at
              )
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
              RETURNING id
            `,
            [
              access.caseId,
              row.provider,
              row.title,
              row.source_url,
              row.description,
              normalizeConfidence(
                row.confidence,
              ),
              actorProfileId,
              row.retrieved_at,
            ],
          )

        const entity =
          await client.query<{
            id: string
          }>(
            `
              INSERT INTO investigation_entities (
                case_id,
                entity_type,
                name,
                value,
                description,
                source_provider,
                source_reference,
                retrieved_at,
                verification_status,
                confidence_score,
                created_by,
                original_result_id
              )
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
              RETURNING id
            `,
            [
              access.caseId,
              normalizeEntityType(
                row.entity_type,
              ),
              row.title,
              row.value,
              row.description,
              row.provider,
              row.source_url,
              row.retrieved_at,
              normalizeVerificationStatus(
                body?.verification_status ||
                  row.verification_status,
              ),
              normalizeConfidence(
                body?.confidence ??
                  row.confidence,
              ),
              actorProfileId,
              row.id,
            ],
          )

        await client.query(
          `
            INSERT INTO entity_sources (
              entity_id,
              source_id,
              analyst_notes
            )
            VALUES ($1,$2,$3)
            ON CONFLICT DO NOTHING
          `,
          [
            entity.rows[0].id,
            source.rows[0].id,
            "Imported from staged OSINT result.",
          ],
        )

        if (
          decision ===
            "add_with_relationship" &&
          queryEntityId
        ) {
          const relationship =
            await client.query<{
              id: string
            }>(
              `
                INSERT INTO entity_relationships (
                  case_id,
                  source_entity_id,
                  target_entity_id,
                  relationship_type,
                  description,
                  confidence_score,
                  verification_status,
                  created_by,
                  source_reference
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                RETURNING id
              `,
              [
                access.caseId,
                queryEntityId,
                entity.rows[0].id,
                relationshipType,
                "Relationship imported from staged OSINT result and requires analyst verification.",
                normalizeConfidence(
                  body?.confidence ??
                    row.confidence,
                ),
                normalizeVerificationStatus(
                  body?.verification_status ||
                    "candidate",
                ),
                actorProfileId,
                row.source_url,
              ],
            )

          relationshipId =
            relationship.rows[0].id

          await client.query(
            `
              INSERT INTO relationship_sources (
                relationship_id,
                source_id,
                analyst_notes
              )
              VALUES ($1,$2,$3)
              ON CONFLICT DO NOTHING
            `,
            [
              relationshipId,
              source.rows[0].id,
              "Imported from staged OSINT result.",
            ],
          )
        }

        return client.query(
          `
            UPDATE osint_search_results
            SET
              import_decision = $1,
              imported_by = $2,
              imported_entity_id = $3,
              imported_relationship_id = $4,
              updated_at = now()
            WHERE osint_search_results.id = $5
              AND osint_search_results.case_id = $6
            RETURNING *
          `,
          [
            relationshipId
              ? "imported_with_relationship"
              : "imported_entity",
            actorProfileId,
            entity.rows[0].id,
            relationshipId,
            resultId,
            access.caseId,
          ],
        )
      },
    )

    return NextResponse.json(
      updated.rows[0],
    )
  } catch (error) {
    console.error(
      "IMPORT OSINT RESULT ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to update staged OSINT result. Has scripts/osint-graph-workspace.sql been applied?",
      },
      { status: 500 },
    )
  }
}
