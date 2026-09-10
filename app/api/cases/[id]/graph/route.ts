import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireInvestigationWorkspace } from "@/lib/investigation-workspace"

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
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
        {
          error: access.error,
        },
        {
          status: access.status,
        },
      )
    }

    const [entities, relationships] =
      await Promise.all([
        query(
          `
            SELECT
              id,
              case_id,
              name,
              entity_type,
              description,
              verification_status,
              confidence_score,
              created_at,
              updated_at

            FROM investigation_entities

            WHERE case_id = $1

            ORDER BY created_at DESC
          `,
          [access.caseId],
        ),

        query(
          `
            SELECT
              id,
              case_id,
              source_entity_id,
              target_entity_id,
              relationship_type,
              description,
              verification_status,
              confidence_score,
              created_at,
              updated_at

            FROM entity_relationships

            WHERE case_id = $1

            ORDER BY created_at DESC
          `,
          [access.caseId],
        ),
      ])

    return NextResponse.json({
      entities: entities.rows,
      relationships: relationships.rows,
    })
  } catch (error) {
    console.error(
      "CASE GRAPH GET ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed loading graph",
      },
      {
        status: 500,
      },
    )
  }
}