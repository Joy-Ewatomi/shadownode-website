import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import {
  optionalText,
  profileIdForUser,
  recordInvestigationTimeline,
  requireCaseReadAccess,
  requireInvestigationWorkspace,
} from "@/lib/investigation-workspace"
import {
  normalizeConfidence,
  normalizeVerificationStatus,
} from "@/lib/osint-workspace"
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
    role === "staff" ||
    role === "investigator" ||
    role === "analyst"
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
  direction?: string | null
  description: string | null
  source_reference?: string | null
  client_visible?: boolean | null
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

    const result =
      await query<RelationshipRow>(
        `
          SELECT
            er.id AS id,
            er.case_id AS case_id,
            er.source_entity_id AS source_entity_id,
            er.target_entity_id AS target_entity_id,
            er.relationship_type AS relationship_type,
            er.direction AS direction,
            er.description AS description,
            er.source_reference AS source_reference,
            er.client_visible AS client_visible,
            er.verification_status AS verification_status,
            er.confidence_score AS confidence_score,
            er.created_at AS created_at,
            er.created_by AS created_by

          FROM entity_relationships er

          WHERE er.case_id = $1

          ORDER BY er.created_at DESC
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
            ie.id AS id,
            ie.case_id AS case_id

          FROM investigation_entities ie

          WHERE ie.id IN ($1, $2)
            AND ie.case_id = $3

          LIMIT 2
        `,
        [
          sourceEntityId,
          targetEntityId,
          access.caseId,
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
      normalizeVerificationStatus(
        body?.verification_status,
      )

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
            direction,
            description,
            source_reference,
            client_visible,
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
            $8,
            $9,
            $10,
            $11
          )

          RETURNING
            id,
            case_id,
            source_entity_id,
            target_entity_id,
            relationship_type,
            direction,
            description,
            source_reference,
            client_visible,
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
          optionalText(body?.direction) ||
            "directed",
          description,
          optionalText(
            body?.source_reference,
          ),
          Boolean(body?.client_visible),
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
      type: "relationship.updated",
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

// ============================================================
// UPDATE RELATIONSHIP REVIEW / PROVENANCE FIELDS
// ============================================================

export async function PATCH(
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
            "You are not authorized to update investigation relationships.",
        },
        {
          status: 403,
        },
      )
    }

    const body =
      await request.json()

    const relationshipId =
      optionalText(body?.id)

    if (!relationshipId) {
      return NextResponse.json(
        {
          error:
            "Relationship id is required.",
        },
        {
          status: 400,
        },
      )
    }

    const existing =
      await query<RelationshipRow>(
        `
          SELECT er.*
          FROM entity_relationships er
          WHERE er.id = $1 AND er.case_id = $2
          LIMIT 1
        `,
        [
          relationshipId,
          access.caseId,
        ],
      )

    const current =
      existing.rows[0]

    if (!current) {
      return NextResponse.json(
        {
          error:
            "Relationship not found.",
        },
        {
          status: 404,
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

    const relationshipType =
      optionalText(
        body?.relationship_type,
      ) ?? current.relationship_type

    const verificationStatus =
      body?.verification_status ===
      undefined
        ? current.verification_status
        : normalizeVerificationStatus(
            body.verification_status,
          )

    const confidenceScore =
      body?.confidence_score ===
      undefined
        ? current.confidence_score
        : normalizeConfidence(
            body.confidence_score,
          )

    const result =
      await query<RelationshipRow>(
        `
          UPDATE entity_relationships er
          SET
            relationship_type = $1,
            direction = $2,
            description = $3,
            source_reference = $4,
            client_visible = $5,
            verification_status = $6,
            confidence_score = $7,
            updated_at = now()
          WHERE er.id = $8 AND er.case_id = $9
          RETURNING
            er.id,
            er.case_id,
            er.source_entity_id,
            er.target_entity_id,
            er.relationship_type,
            er.direction,
            er.description,
            er.source_reference,
            er.client_visible,
            er.verification_status,
            er.confidence_score,
            er.created_at,
            er.created_by
        `,
        [
          relationshipType,
          body?.direction ===
          undefined
            ? current.direction ||
              "directed"
            : optionalText(
                body.direction,
              ) || "directed",
          body?.description ===
          undefined
            ? current.description
            : optionalText(
                body.description,
              ),
          body?.source_reference ===
          undefined
            ? current.source_reference
            : optionalText(
                body.source_reference,
              ),
          body?.client_visible ===
          undefined
            ? current.client_visible
            : Boolean(
                body.client_visible,
              ),
          verificationStatus,
          confidenceScore,
          relationshipId,
          access.caseId,
        ],
      )

    await recordInvestigationTimeline(
      access.caseId,
      access.user.id,
      "relationship_updated",
      "Investigation Relationship Updated",
      `${relationshipType} relationship review state updated.`,
    )

    await emitCaseWorkspaceEvent({
      type: "relationship.created",
      case_id: access.caseId,
      actor_id: access.user.id,
      record_id: String(
        relationshipId,
      ),
      data: {
        action:
          "relationship_updated",
        relationship_type:
          relationshipType,
        confidence_score:
          confidenceScore,
        verification_status:
          verificationStatus,
        changed_by:
          actorProfileId,
      },
    })

    return NextResponse.json(
      result.rows[0],
    )
  } catch (error) {
    console.error(
      "UPDATE GRAPH RELATIONSHIP ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to update investigation relationship",
      },
      {
        status: 500,
      },
    )
  }
}
