import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import {
  optionalText,
  profileIdForUser,
  recordInvestigationTimeline,
  requireInvestigationWorkspace,
} from "@/lib/investigation-workspace"
import { emitCaseWorkspaceEvent } from "@/lib/realtime/workspace-events"

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function canManageGraph(
  role: string | null | undefined,
) {
  return (
    isSuperAdminRole(role) ||
    role === "administrator" ||
    role === "investigator" ||
    role === "analyst"
  )
}

function normalizeConfidence(
  value: unknown,
) {
  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    return 0
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(numeric),
    ),
  )
}

type EntityRow = {
  id: string
  case_id: string
}

type RelationshipRow = {
  id: string
  case_id: string
  source_entity_id: string
  target_entity_id: string
  relationship_type: string
  description: string | null
  verification_status: string | null
  confidence_score: number | string | null
  created_at: string
  created_by: string | null
}

// ============================================================
// GET RELATIONSHIPS FOR A CASE
// ============================================================

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

    const result =
      await query<RelationshipRow>(
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
            created_by

          FROM entity_relationships

          WHERE case_id = $1

          ORDER BY created_at DESC
        `,
        [access.caseId],
      )

    return NextResponse.json(
      result.rows,
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      "GET GRAPH RELATIONSHIPS ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to load investigation relationships",
      },
      {
        status: 500,
      },
    )
  }
}

// ============================================================
// CREATE RELATIONSHIP
// ============================================================

export async function POST(
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

    if (
      !canManageGraph(
        access.user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to create investigation relationships.",
        },
        {
          status: 403,
        },
      )
    }

    const body =
      await request.json()

    const sourceEntityId =
      optionalText(
        body?.source_entity_id,
      )

    const targetEntityId =
      optionalText(
        body?.target_entity_id,
      )

    const relationshipType =
      optionalText(
        body?.relationship_type,
      )

    const description =
      optionalText(
        body?.description,
      )

    if (
      !sourceEntityId ||
      !targetEntityId
    ) {
      return NextResponse.json(
        {
          error:
            "Source and target entities are required.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      sourceEntityId ===
      targetEntityId
    ) {
      return NextResponse.json(
        {
          error:
            "An entity cannot be related to itself.",
        },
        {
          status: 400,
        },
      )
    }

    if (!relationshipType) {
      return NextResponse.json(
        {
          error:
            "Relationship type is required.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Both entities must exist and both must belong
     * to the case currently being accessed.
     */
    const entityResult =
      await query<EntityRow>(
        `
          SELECT
            id,
            case_id

          FROM investigation_entities

          WHERE id IN ($1, $2)

          LIMIT 2
        `,
        [
          sourceEntityId,
          targetEntityId,
        ],
      )

    if (
      entityResult.rows.length !==
      2
    ) {
      return NextResponse.json(
        {
          error:
            "One or both investigation entities were not found.",
        },
        {
          status: 404,
        },
      )
    }

    const sourceEntity =
      entityResult.rows.find(
        (entity) =>
          entity.id ===
          sourceEntityId,
      )

    const targetEntity =
      entityResult.rows.find(
        (entity) =>
          entity.id ===
          targetEntityId,
      )

    if (
      !sourceEntity ||
      !targetEntity
    ) {
      return NextResponse.json(
        {
          error:
            "One or both investigation entities were not found.",
        },
        {
          status: 404,
        },
      )
    }

    if (
      sourceEntity.case_id !==
        access.caseId ||
      targetEntity.case_id !==
        access.caseId
    ) {
      return NextResponse.json(
        {
          error:
            "Both entities must belong to this case.",
        },
        {
          status: 400,
        },
      )
    }

    const confidenceScore =
      normalizeConfidence(
        body?.confidence_score,
      )

    const verificationStatus =
      optionalText(
        body?.verification_status,
      ) || "unverified"

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

    const result =
      await query<RelationshipRow>(
        `
          INSERT INTO entity_relationships (
            case_id,
            source_entity_id,
            target_entity_id,
            relationship_type,
            description,
            verification_status,
            confidence_score,
            created_by
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
          )

          RETURNING
            id,
            case_id,
            source_entity_id,
            target_entity_id,
            relationship_type,
            description,
            verification_status,
            confidence_score,
            created_at,
            created_by
        `,
        [
          access.caseId,
          sourceEntityId,
          targetEntityId,
          relationshipType,
          description,
          verificationStatus,
          confidenceScore,
          actorProfileId,
        ],
      )

    const relationship =
      result.rows[0]

    if (!relationship) {
      throw new Error(
        "Relationship creation returned no record",
      )
    }

    await recordInvestigationTimeline(
      access.caseId,
      access.user.id,
      "relationship_created",
      "Investigation Relationship Created",
      `${relationshipType} relationship created between two investigation entities.`,
    )

    await emitCaseWorkspaceEvent({
      type: "relationship.created",
      case_id: access.caseId,
      actor_id: access.user.id,
      record_id: String(
        relationship.id,
      ),
      data: {
        source_entity_id:
          sourceEntityId,
        target_entity_id:
          targetEntityId,
        relationship_type:
          relationshipType,
        confidence_score:
          confidenceScore,
        verification_status:
          verificationStatus,
      },
    })

    return NextResponse.json(
      relationship,
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "CREATE GRAPH RELATIONSHIP ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to create investigation relationship",
      },
      {
        status: 500,
      },
    )
  }
}