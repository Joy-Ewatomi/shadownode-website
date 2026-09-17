import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import {
  profileIdForUser,
  recordInvestigationTimeline,
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

function taskPriority(
  status: string | null,
  confidence: number | string | null,
) {
  const numericConfidence =
    Number(confidence ?? 0)

  if (
    status === "disputed" ||
    status === "stale"
  ) {
    return "high"
  }

  if (numericConfidence < 35) {
    return "high"
  }

  if (
    status === "candidate" ||
    status === "unreviewed"
  ) {
    return "normal"
  }

  return "low"
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
            "You are not authorized to run graph automation.",
        },
        { status: 403 },
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

    const [entities, relationships] =
      await Promise.all([
        query<{
          id: string
          name: string
          entity_type: string
          verification_status: string | null
          confidence_score: number | string | null
          stale_at: string | null
        }>(
          `
            SELECT
              ie.id AS id,
              ie.name AS name,
              ie.entity_type AS entity_type,
              ie.verification_status AS verification_status,
              ie.confidence_score AS confidence_score,
              ie.stale_at AS stale_at
            FROM investigation_entities ie
            WHERE ie.case_id = $1
              AND (
                ie.verification_status IN (
                  'unreviewed',
                  'candidate',
                  'disputed',
                  'stale'
                )
                OR ie.confidence_score < 50
                OR ie.stale_at <= now()
              )
            ORDER BY ie.updated_at DESC NULLS LAST, ie.created_at DESC
            LIMIT 25
          `,
          [access.caseId],
        ),

        query<{
          id: string
          relationship_type: string
          source_entity_name: string | null
          target_entity_name: string | null
          verification_status: string | null
          confidence_score: number | string | null
        }>(
          `
            SELECT
              er.id,
              er.relationship_type,
              source_entity.name AS source_entity_name,
              target_entity.name AS target_entity_name,
              er.verification_status,
              er.confidence_score
            FROM entity_relationships er
            LEFT JOIN investigation_entities source_entity
              ON source_entity.id = er.source_entity_id
            LEFT JOIN investigation_entities target_entity
              ON target_entity.id = er.target_entity_id
            WHERE er.case_id = $1
              AND (
                er.verification_status IN (
                  'unreviewed',
                  'candidate',
                  'disputed',
                  'stale'
                )
                OR er.confidence_score < 50
              )
            ORDER BY er.updated_at DESC NULLS LAST, er.created_at DESC
            LIMIT 25
          `,
          [access.caseId],
        ),
      ])

    let created = 0

    for (const entity of entities.rows) {
      const title =
        `Review ${entity.entity_type}: ${entity.name}`

      const existing = await query(
        `
          SELECT it.id AS id
          FROM investigation_tasks it
          WHERE it.case_id = $1
            AND it.title = $2
            AND it.status <> 'completed'
          LIMIT 1
        `,
        [access.caseId, title],
      )

      if (existing.rows[0]) {
        continue
      }

      await query(
        `
          INSERT INTO investigation_tasks (
            case_id,
            assigned_to,
            title,
            status,
            priority
          )
          VALUES ($1,$2,$3,$4,$5)
        `,
        [
          access.caseId,
          actorProfileId,
          title,
          "pending",
          taskPriority(
            entity.verification_status,
            entity.confidence_score,
          ),
        ],
      )

      created += 1
    }

    for (const relationship of relationships.rows) {
      const title =
        `Review relationship: ${relationship.source_entity_name || "Unknown"} ${relationship.relationship_type} ${relationship.target_entity_name || "Unknown"}`

      const existing = await query(
        `
          SELECT it.id AS id
          FROM investigation_tasks it
          WHERE it.case_id = $1
            AND it.title = $2
            AND it.status <> 'completed'
          LIMIT 1
        `,
        [access.caseId, title],
      )

      if (existing.rows[0]) {
        continue
      }

      await query(
        `
          INSERT INTO investigation_tasks (
            case_id,
            assigned_to,
            title,
            status,
            priority
          )
          VALUES ($1,$2,$3,$4,$5)
        `,
        [
          access.caseId,
          actorProfileId,
          title,
          "pending",
          taskPriority(
            relationship.verification_status,
            relationship.confidence_score,
          ),
        ],
      )

      created += 1
    }

    await recordInvestigationTimeline(
      access.caseId,
      access.user.id,
      "graph_automation_run",
      "Graph Review Automation Run",
      `${created} graph review task${created === 1 ? "" : "s"} created from stale, low-confidence, or unresolved intelligence.`,
    )

    return NextResponse.json({
      ok: true,
      created,
      inspected: {
        entities: entities.rows.length,
        relationships:
          relationships.rows.length,
      },
    })
  } catch (error) {
    console.error(
      "GRAPH AUTOMATION ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to run graph automation.",
      },
      { status: 500 },
    )
  }
}
