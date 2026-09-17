import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import {
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
            "You are not authorized to update graph positions.",
        },
        { status: 403 },
      )
    }

    const body = await request.json()
    const positions = Array.isArray(
      body?.positions,
    )
      ? body.positions
      : []

    for (const position of positions) {
      const entityId = String(
        position?.id || "",
      )
      const x = Number(position?.x)
      const y = Number(position?.y)

      if (
        !entityId ||
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        continue
      }

      await query(
        `
          INSERT INTO entity_positions (
            entity_id,
            position_x,
            position_y,
            canvas_zoom,
            updated_at
          )
          SELECT $1, $2, $3, $4, now()
          WHERE EXISTS (
            SELECT 1
            FROM investigation_entities ie
            WHERE ie.id = $1 AND ie.case_id = $5
          )
          ON CONFLICT (entity_id)
          DO UPDATE SET
            position_x = EXCLUDED.position_x,
            position_y = EXCLUDED.position_y,
            canvas_zoom = EXCLUDED.canvas_zoom,
            updated_at = now()
        `,
        [
          entityId,
          x,
          y,
          Number(body?.zoom) || 1,
          access.caseId,
        ],
      )
    }

    return NextResponse.json({
      ok: true,
      saved: positions.length,
    })
  } catch (error) {
    console.error(
      "SAVE GRAPH POSITIONS ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to save graph positions. Has scripts/osint-graph-workspace.sql been applied?",
      },
      { status: 500 },
    )
  }
}
