import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireCaseReadAccess } from "@/lib/investigation-workspace"

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
      await requireCaseReadAccess(
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
              ie.id AS id,
              ie.case_id AS case_id,
              ie.name AS name,
              ie.entity_type AS entity_type,
              ie.description AS description,
              ie.verification_status AS verification_status,
              ie.confidence_score AS confidence_score,
              ie.created_at AS created_at,
              ie.updated_at AS updated_at

            FROM investigation_entities ie

            WHERE ie.case_id = $1

            ORDER BY ie.created_at DESC
          `,
          [access.caseId],
        ),

        query(
          `
            SELECT
              er.id AS id,
              er.case_id AS case_id,
              er.source_entity_id AS source_entity_id,
              er.target_entity_id AS target_entity_id,
              er.relationship_type AS relationship_type,
              er.description AS description,
              er.verification_status AS verification_status,
              er.confidence_score AS confidence_score,
              er.created_at AS created_at,
              er.updated_at AS updated_at

            FROM entity_relationships er

            WHERE er.case_id = $1

            ORDER BY er.created_at DESC
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
