import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import {
  aliasesJson,
  optionalText,
  profileIdForUser,
  requireCaseReadAccess,
  requireInvestigationWorkspace,
} from "@/lib/investigation-workspace"
import {
  normalizeConfidence,
  normalizeEntityType,
  normalizeVerificationStatus,
} from "@/lib/osint-workspace"

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

// GET ALL ENTITIES FOR A CASE
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

    const result = await query(
      `
        SELECT
          ie.id AS id,
          ie.case_id AS case_id,
          ie.entity_type AS entity_type,
          ie.name AS name,
          ie.value AS value,
          ie.description AS description,
          ie.aliases AS aliases,
          ie.source_provider AS source_provider,
          ie.source_reference AS source_reference,
          ie.retrieved_at AS retrieved_at,
          ie.verification_status AS verification_status,
          ie.confidence_score AS confidence_score,
          ie.classification AS classification,
          ie.client_visible AS client_visible,
          ie.notes AS notes,
          ie.last_verified_at AS last_verified_at,
          ie.stale_at AS stale_at,
          ep.position_x AS position_x,
          ep.position_y AS position_y,
          ie.created_at AS created_at,
          ie.updated_at AS updated_at

        FROM investigation_entities ie

        LEFT JOIN entity_positions ep
          ON ep.entity_id =
             ie.id

        WHERE ie.case_id = $1

        ORDER BY ie.created_at DESC
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
      "GET GRAPH ENTITIES ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to load investigation entities",
      },
      {
        status: 500,
      },
    )
  }
}

// CREATE NEW ENTITY
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
            "You are not authorized to create investigation entities.",
        },
        {
          status: 403,
        },
      )
    }

    const body =
      await request.json()

    const name =
      optionalText(body?.name)

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Entity name required",
        },
        {
          status: 400,
        },
      )
    }

    const entityType =
      normalizeEntityType(
        body?.entity_type,
      )

    const description =
      optionalText(
        body?.description,
      )

    const verificationStatus =
      normalizeVerificationStatus(
        body?.verification_status,
      )

    const confidenceScore =
      normalizeConfidence(
        body?.confidence_score,
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
      await query(
        `
          INSERT INTO investigation_entities (
            case_id,
            entity_type,
            name,
            value,
            description,
            aliases,
            source_provider,
            source_reference,
            retrieved_at,
            verification_status,
            confidence_score,
            classification,
            client_visible,
            notes,
            last_verified_at,
            stale_at,
            created_by
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6::jsonb,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            $17
          )

          RETURNING
            id,
            case_id,
            entity_type,
            name,
            value,
            description,
            aliases,
            source_provider,
            source_reference,
            retrieved_at,
            verification_status,
            confidence_score,
            classification,
            client_visible,
            notes,
            last_verified_at,
            stale_at,
            created_at,
            updated_at
        `,
        [
          access.caseId,
          entityType,
          name,
          optionalText(body?.value),
          description,
          aliasesJson(body?.aliases),
          optionalText(body?.source_provider),
          optionalText(body?.source_reference),
          optionalText(body?.retrieved_at),
          verificationStatus,
          confidenceScore,
          optionalText(body?.classification) ||
            "confidential",
          Boolean(body?.client_visible) &&
            entityType !==
              "BANK_ACCOUNT_RESTRICTED",
          optionalText(body?.notes),
          optionalText(
            body?.last_verified_at,
          ),
          optionalText(body?.stale_at),
          actorProfileId,
        ],
      )

    const entity =
      result.rows[0]

    if (!entity) {
      throw new Error(
        "Entity creation returned no record",
      )
    }

    return NextResponse.json(
      entity,
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "CREATE GRAPH ENTITY ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to create investigation entity",
      },
      {
        status: 500,
      },
    )
  }
}

// UPDATE ENTITY REVIEW / PROVENANCE FIELDS
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
            "You are not authorized to update investigation entities.",
        },
        {
          status: 403,
        },
      )
    }

    const body =
      await request.json()

    const entityId =
      optionalText(body?.id)

    if (!entityId) {
      return NextResponse.json(
        {
          error: "Entity id required",
        },
        {
          status: 400,
        },
      )
    }

    const existing = await query(
      `
        SELECT ie.*
        FROM investigation_entities ie
        WHERE ie.id = $1 AND ie.case_id = $2
        LIMIT 1
      `,
      [entityId, access.caseId],
    )

    if (!existing.rows[0]) {
      return NextResponse.json(
        {
          error: "Entity not found",
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

    const nextName =
      optionalText(body?.name) ??
      existing.rows[0].name

    const nextType =
      body?.entity_type === undefined
        ? existing.rows[0].entity_type
        : normalizeEntityType(
            body.entity_type,
          )

    const verificationStatus =
      body?.verification_status ===
      undefined
        ? existing.rows[0]
            .verification_status
        : normalizeVerificationStatus(
            body.verification_status,
          )

    const confidenceScore =
      body?.confidence_score ===
      undefined
        ? existing.rows[0].confidence_score
        : normalizeConfidence(
            body.confidence_score,
          )

    const lastVerifiedAt =
      verificationStatus === "verified"
        ? new Date().toISOString()
        : optionalText(
            body?.last_verified_at,
          ) ??
          existing.rows[0]
            .last_verified_at

    const result = await query(
      `
        UPDATE investigation_entities ie
        SET
          entity_type = $1,
          name = $2,
          value = $3,
          description = $4,
          aliases = $5::jsonb,
          source_provider = $6,
          source_reference = $7,
          retrieved_at = $8,
          verification_status = $9,
          confidence_score = $10,
          classification = $11,
          client_visible = $12,
          notes = $13,
          last_verified_at = $14,
          stale_at = $15,
          updated_at = now()
        WHERE ie.id = $16 AND ie.case_id = $17
        RETURNING
          ie.id,
          ie.case_id,
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
          ie.updated_at
      `,
      [
        nextType,
        nextName,
        body?.value === undefined
          ? existing.rows[0].value
          : optionalText(body.value),
        body?.description === undefined
          ? existing.rows[0].description
          : optionalText(
              body.description,
            ),
        body?.aliases === undefined
          ? JSON.stringify(
              existing.rows[0].aliases ??
                [],
            )
          : aliasesJson(
              body.aliases,
            ),
        body?.source_provider ===
        undefined
          ? existing.rows[0]
              .source_provider
          : optionalText(
              body.source_provider,
            ),
        body?.source_reference ===
        undefined
          ? existing.rows[0]
              .source_reference
          : optionalText(
              body.source_reference,
            ),
        body?.retrieved_at === undefined
          ? existing.rows[0].retrieved_at
          : optionalText(
              body.retrieved_at,
            ),
        verificationStatus,
        confidenceScore,
        body?.classification ===
        undefined
          ? existing.rows[0]
              .classification
          : optionalText(
              body.classification,
            ) || "confidential",
        body?.client_visible ===
        undefined
          ? existing.rows[0]
              .client_visible
          : Boolean(
              body.client_visible,
            ) &&
            nextType !==
              "BANK_ACCOUNT_RESTRICTED",
        body?.notes === undefined
          ? existing.rows[0].notes
          : optionalText(body.notes),
        lastVerifiedAt,
        body?.stale_at === undefined
          ? existing.rows[0].stale_at
          : optionalText(body.stale_at),
        entityId,
        access.caseId,
      ],
    )

    await query(
      `
        INSERT INTO entity_history (
          entity_id,
          changed_by,
          action,
          old_data,
          new_data
        )
        VALUES ($1,$2,$3,$4::jsonb,$5::jsonb)
      `,
      [
        entityId,
        actorProfileId,
        "entity_updated",
        JSON.stringify(
          existing.rows[0],
        ),
        JSON.stringify(
          result.rows[0],
        ),
      ],
    )

    return NextResponse.json(
      result.rows[0],
    )
  } catch (error) {
    console.error(
      "UPDATE GRAPH ENTITY ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to update investigation entity",
      },
      {
        status: 500,
      },
    )
  }
}
