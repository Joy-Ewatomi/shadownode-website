import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import {
  optionalText,
  requireCaseReadAccess,
  requireInvestigationWorkspace,
} from "@/lib/investigation-workspace"

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

function normalizeEntityType(
  value: unknown,
) {
  const normalized =
    String(value || "UNKNOWN")
      .trim()
      .toUpperCase()

  return normalized || "UNKNOWN"
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
          id,
          case_id,
          entity_type,
          name,
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
      optionalText(
        body?.verification_status,
      ) || "unverified"

    const confidenceScore =
      normalizeConfidence(
        body?.confidence_score,
      )

    const result =
      await query(
        `
          INSERT INTO investigation_entities (
            case_id,
            entity_type,
            name,
            description,
            verification_status,
            confidence_score
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )

          RETURNING
            id,
            case_id,
            entity_type,
            name,
            description,
            verification_status,
            confidence_score,
            created_at,
            updated_at
        `,
        [
          access.caseId,
          entityType,
          name,
          description,
          verificationStatus,
          confidenceScore,
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
