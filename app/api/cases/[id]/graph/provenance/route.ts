import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import {
  optionalText,
  requireCaseReadAccess,
  requireInvestigationWorkspace,
} from "@/lib/investigation-workspace"

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

    const [sources, evidence] =
      await Promise.all([
        query(
          `
            SELECT
              isrc.id AS id,
              isrc.source_type AS source_type,
              isrc.title AS title,
              isrc.url AS url,
              isrc.description AS description,
              isrc.reliability_score AS reliability_score,
              isrc.collected_at AS collected_at,
              isrc.created_at AS created_at
            FROM intelligence_sources isrc
            WHERE isrc.case_id = $1
            ORDER BY isrc.created_at DESC
          `,
          [access.caseId],
        ),

        query(
          `
            SELECT
              ff.id AS id,
              ff.file_name AS file_name,
              ff.file_type AS file_type,
              ff.file_hash AS file_hash,
              ff.evidence_type AS evidence_type,
              ff.description AS description,
              ff.created_at AS created_at
            FROM forensic_files ff
            WHERE ff.case_id = $1
            ORDER BY ff.created_at DESC
          `,
          [access.caseId],
        ),
      ])

    return NextResponse.json({
      sources: sources.rows,
      evidence: evidence.rows,
    })
  } catch (error) {
    console.error(
      "GET GRAPH PROVENANCE ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to load graph provenance. Has scripts/osint-graph-workspace.sql been applied?",
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
            "You are not authorized to link graph provenance.",
        },
        { status: 403 },
      )
    }

    const body = await request.json()
    const targetType =
      optionalText(body?.target_type)
    const targetId =
      optionalText(body?.target_id)
    const sourceId =
      optionalText(body?.source_id)
    const evidenceId =
      optionalText(body?.evidence_id)
    const notes =
      optionalText(body?.analyst_notes)

    if (!targetType || !targetId) {
      return NextResponse.json(
        {
          error:
            "Target type and target id are required.",
        },
        { status: 400 },
      )
    }

    if (!sourceId && !evidenceId) {
      return NextResponse.json(
        {
          error:
            "Source id or evidence id is required.",
        },
        { status: 400 },
      )
    }

    if (targetType === "entity") {
      const entity = await query(
        `
          SELECT ie.id AS id
          FROM investigation_entities ie
          WHERE ie.id = $1 AND ie.case_id = $2
          LIMIT 1
        `,
        [targetId, access.caseId],
      )

      if (!entity.rows[0]) {
        return NextResponse.json(
          { error: "Entity not found." },
          { status: 404 },
        )
      }

      if (sourceId) {
        await query(
          `
            INSERT INTO entity_sources (
              entity_id,
              source_id,
              analyst_notes
            )
            SELECT $1, $2, $3
            WHERE EXISTS (
              SELECT 1
              FROM intelligence_sources isrc
              WHERE isrc.id = $2 AND isrc.case_id = $4
            )
            ON CONFLICT DO NOTHING
          `,
          [
            targetId,
            sourceId,
            notes,
            access.caseId,
          ],
        )
      }

      if (evidenceId) {
        await query(
          `
            INSERT INTO entity_evidence (
              entity_id,
              forensic_file_id,
              analyst_notes
            )
            SELECT $1, $2, $3
            WHERE EXISTS (
              SELECT 1
              FROM forensic_files ff
              WHERE ff.id = $2 AND ff.case_id = $4
            )
            ON CONFLICT DO NOTHING
          `,
          [
            targetId,
            evidenceId,
            notes,
            access.caseId,
          ],
        )
      }
    } else if (targetType === "relationship") {
      const relationship = await query(
        `
          SELECT er.id AS id
          FROM entity_relationships er
          WHERE er.id = $1 AND er.case_id = $2
          LIMIT 1
        `,
        [targetId, access.caseId],
      )

      if (!relationship.rows[0]) {
        return NextResponse.json(
          {
            error:
              "Relationship not found.",
          },
          { status: 404 },
        )
      }

      if (sourceId) {
        await query(
          `
            INSERT INTO relationship_sources (
              relationship_id,
              source_id,
              analyst_notes
            )
            SELECT $1, $2, $3
            WHERE EXISTS (
              SELECT 1
              FROM intelligence_sources isrc
              WHERE isrc.id = $2 AND isrc.case_id = $4
            )
            ON CONFLICT DO NOTHING
          `,
          [
            targetId,
            sourceId,
            notes,
            access.caseId,
          ],
        )
      }

      if (evidenceId) {
        await query(
          `
            INSERT INTO relationship_evidence (
              relationship_id,
              forensic_file_id,
              analyst_notes
            )
            SELECT $1, $2, $3
            WHERE EXISTS (
              SELECT 1
              FROM forensic_files ff
              WHERE ff.id = $2 AND ff.case_id = $4
            )
            ON CONFLICT DO NOTHING
          `,
          [
            targetId,
            evidenceId,
            notes,
            access.caseId,
          ],
        )
      }
    } else {
      return NextResponse.json(
        {
          error:
            "Target type must be entity or relationship.",
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      ok: true,
    })
  } catch (error) {
    console.error(
      "LINK GRAPH PROVENANCE ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to link graph provenance. Has scripts/osint-graph-workspace.sql been applied?",
      },
      { status: 500 },
    )
  }
}
