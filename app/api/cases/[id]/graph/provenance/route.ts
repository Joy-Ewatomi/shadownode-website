import { NextRequest, NextResponse } from "next/server"

import { auditLog } from "@/lib/auth"
import { query, withTransaction } from "@/lib/db"
import {
  optionalText,
  profileIdForUser,
  recordInvestigationTimeline,
  requireCaseReadAccess,
  requireInvestigationWorkspace,
} from "@/lib/investigation-workspace"
import { emitCaseWorkspaceEvent } from "@/lib/realtime/workspace-events"

type AssociationTargetType = "entity" | "relationship"

type EvidenceAssociation = {
  association_id: string
  target_type: AssociationTargetType
  target_id: string
  target_label: string
  evidence_id: string
  evidence_file_name: string
  evidence_type: string | null
  evidence_description: string | null
  evidence_sha256: string | null
  created_at: string
  created_by: string | null
  created_by_username: string | null
}

function canManageGraph(role: string | null | undefined) {
  return [
    "super_administrator",
    "super-administrator",
    "administrator",
    "staff",
    "investigator",
    "analyst",
  ].includes(String(role))
}

function associationType(targetType: AssociationTargetType) {
  return targetType === "entity" ? "entity_evidence" : "relationship_evidence"
}

function normalizeTargetType(value: string | null): AssociationTargetType | null {
  return value === "entity" || value === "relationship" ? value : null
}

async function assertTargetBelongsToCase(
  targetType: AssociationTargetType,
  targetId: string,
  caseId: string,
) {
  const table = targetType === "entity" ? "investigation_entities" : "entity_relationships"
  const result = await query<{ id: string }>(
    `SELECT id FROM ${table} WHERE id = $1 AND case_id = $2 LIMIT 1`,
    [targetId, caseId],
  )
  return Boolean(result.rows[0])
}

async function assertEvidenceBelongsToCase(evidenceId: string, caseId: string) {
  const result = await query<{ id: string }>(
    "SELECT id FROM forensic_files WHERE id = $1 AND case_id = $2 LIMIT 1",
    [evidenceId, caseId],
  )
  return Boolean(result.rows[0])
}

async function listTargetEvidenceAssociations(
  targetType: AssociationTargetType,
  targetId: string,
  caseId: string,
) {
  if (targetType === "entity") {
    return query<EvidenceAssociation>(
      `
        SELECT
          CONCAT('entity:', ee.entity_id::text, ':', ee.forensic_file_id::text) AS association_id,
          'entity'::text AS target_type,
          ee.entity_id AS target_id,
          ie.name AS target_label,
          ff.id AS evidence_id,
          ff.file_name AS evidence_file_name,
          ff.evidence_type,
          ff.description AS evidence_description,
          ff.file_hash AS evidence_sha256,
          ee.created_at,
          ee.created_by,
          creator.username AS created_by_username
        FROM entity_evidence ee
        JOIN investigation_entities ie ON ie.id = ee.entity_id
        JOIN forensic_files ff ON ff.id = ee.forensic_file_id
        LEFT JOIN user_profiles creator_profile ON creator_profile.id = ee.created_by
        LEFT JOIN app_users creator ON creator.id = creator_profile.user_id
        WHERE ee.entity_id = $1
          AND ie.case_id = $2
          AND ff.case_id = $2
        ORDER BY ee.created_at DESC, ff.file_name ASC
      `,
      [targetId, caseId],
    )
  }

  return query<EvidenceAssociation>(
    `
      SELECT
        CONCAT('relationship:', re.relationship_id::text, ':', re.forensic_file_id::text) AS association_id,
        'relationship'::text AS target_type,
        re.relationship_id AS target_id,
        er.relationship_type AS target_label,
        ff.id AS evidence_id,
        ff.file_name AS evidence_file_name,
        ff.evidence_type,
        ff.description AS evidence_description,
        ff.file_hash AS evidence_sha256,
        re.created_at,
        re.created_by,
        creator.username AS created_by_username
      FROM relationship_evidence re
      JOIN entity_relationships er ON er.id = re.relationship_id
      JOIN forensic_files ff ON ff.id = re.forensic_file_id
      LEFT JOIN user_profiles creator_profile ON creator_profile.id = re.created_by
      LEFT JOIN app_users creator ON creator.id = creator_profile.user_id
      WHERE re.relationship_id = $1
        AND er.case_id = $2
        AND ff.case_id = $2
      ORDER BY re.created_at DESC, ff.file_name ASC
    `,
    [targetId, caseId],
  )
}

async function listEvidenceGraphAssociations(evidenceId: string, caseId: string) {
  return query<EvidenceAssociation>(
    `
      SELECT
        CONCAT('entity:', ee.entity_id::text, ':', ee.forensic_file_id::text) AS association_id,
        'entity'::text AS target_type,
        ee.entity_id AS target_id,
        ie.name AS target_label,
        ff.id AS evidence_id,
        ff.file_name AS evidence_file_name,
        ff.evidence_type,
        ff.description AS evidence_description,
        ff.file_hash AS evidence_sha256,
        ee.created_at,
        ee.created_by,
        creator.username AS created_by_username
      FROM entity_evidence ee
      JOIN investigation_entities ie ON ie.id = ee.entity_id
      JOIN forensic_files ff ON ff.id = ee.forensic_file_id
      LEFT JOIN user_profiles creator_profile ON creator_profile.id = ee.created_by
      LEFT JOIN app_users creator ON creator.id = creator_profile.user_id
      WHERE ee.forensic_file_id = $1
        AND ie.case_id = $2
        AND ff.case_id = $2

      UNION ALL

      SELECT
        CONCAT('relationship:', re.relationship_id::text, ':', re.forensic_file_id::text) AS association_id,
        'relationship'::text AS target_type,
        re.relationship_id AS target_id,
        er.relationship_type AS target_label,
        ff.id AS evidence_id,
        ff.file_name AS evidence_file_name,
        ff.evidence_type,
        ff.description AS evidence_description,
        ff.file_hash AS evidence_sha256,
        re.created_at,
        re.created_by,
        creator.username AS created_by_username
      FROM relationship_evidence re
      JOIN entity_relationships er ON er.id = re.relationship_id
      JOIN forensic_files ff ON ff.id = re.forensic_file_id
      LEFT JOIN user_profiles creator_profile ON creator_profile.id = re.created_by
      LEFT JOIN app_users creator ON creator.id = creator_profile.user_id
      WHERE re.forensic_file_id = $1
        AND er.case_id = $2
        AND ff.case_id = $2

      ORDER BY created_at DESC, target_label ASC
    `,
    [evidenceId, caseId],
  )
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const access = await requireCaseReadAccess(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const url = new URL(request.url)
    const requestedTargetType = optionalText(url.searchParams.get("target_type"))
    const targetId = optionalText(url.searchParams.get("target_id"))
    const evidenceId = optionalText(url.searchParams.get("evidence_id"))

    if (evidenceId && (requestedTargetType || targetId)) {
      return NextResponse.json({ error: "Request either a graph target or an evidence record, not both." }, { status: 400 })
    }

    if (requestedTargetType || targetId) {
      const targetType = normalizeTargetType(requestedTargetType)
      if (!targetType || !targetId) {
        return NextResponse.json({ error: "A valid target type and target id are required." }, { status: 400 })
      }
      if (!await assertTargetBelongsToCase(targetType, targetId, access.caseId)) {
        return NextResponse.json({ error: "Graph target not found." }, { status: 404 })
      }
      const associations = await listTargetEvidenceAssociations(targetType, targetId, access.caseId)
      return NextResponse.json({ associations: associations.rows })
    }

    if (evidenceId) {
      if (!await assertEvidenceBelongsToCase(evidenceId, access.caseId)) {
        return NextResponse.json({ error: "Evidence not found." }, { status: 404 })
      }
      const associations = await listEvidenceGraphAssociations(evidenceId, access.caseId)
      return NextResponse.json({ associations: associations.rows })
    }

    const [sources, evidence] = await Promise.all([
      query(
        `
          SELECT isrc.id, isrc.source_type, isrc.title, isrc.url, isrc.description,
                 isrc.reliability_score, isrc.collected_at, isrc.created_at
          FROM intelligence_sources isrc
          WHERE isrc.case_id = $1
          ORDER BY isrc.created_at DESC
        `,
        [access.caseId],
      ),
      query(
        `
          SELECT ff.id, ff.file_name, ff.file_type, ff.file_hash, ff.evidence_type,
                 ff.description, ff.created_at
          FROM forensic_files ff
          WHERE ff.case_id = $1
          ORDER BY ff.created_at DESC
        `,
        [access.caseId],
      ),
    ])

    return NextResponse.json({ sources: sources.rows, evidence: evidence.rows, associations: [] })
  } catch (error) {
    console.error("GET GRAPH PROVENANCE ERROR:", error)
    return NextResponse.json(
      { error: "Failed to load graph provenance. Verify the deployed evidence association migration." },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const access = await requireInvestigationWorkspace(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!canManageGraph(access.user.role)) {
      return NextResponse.json({ error: "You are not authorized to link graph provenance." }, { status: 403 })
    }

    const body = await request.json()
    const targetType = normalizeTargetType(optionalText(body?.target_type))
    const targetId = optionalText(body?.target_id)
    const sourceId = optionalText(body?.source_id)
    const evidenceId = optionalText(body?.evidence_id)
    const notes = optionalText(body?.analyst_notes)

    if (!targetType || !targetId) {
      return NextResponse.json({ error: "A valid target type and target id are required." }, { status: 400 })
    }
    if (!sourceId && !evidenceId) {
      return NextResponse.json({ error: "Source id or evidence id is required." }, { status: 400 })
    }
    if (!await assertTargetBelongsToCase(targetType, targetId, access.caseId)) {
      return NextResponse.json({ error: `${targetType === "entity" ? "Entity" : "Relationship"} not found.` }, { status: 404 })
    }

    // Validate every requested record before creating either kind of provenance link.
    if (evidenceId && !await assertEvidenceBelongsToCase(evidenceId, access.caseId)) {
      return NextResponse.json({ error: "Evidence not found for this case." }, { status: 404 })
    }

    if (sourceId) {
      const sourceTable = targetType === "entity" ? "entity_sources" : "relationship_sources"
      const targetColumn = targetType === "entity" ? "entity_id" : "relationship_id"
      await query(
        `
          INSERT INTO ${sourceTable} (${targetColumn}, source_id, analyst_notes)
          SELECT $1, $2, $3
          WHERE EXISTS (
            SELECT 1 FROM intelligence_sources isrc
            WHERE isrc.id = $2 AND isrc.case_id = $4
          )
          ON CONFLICT DO NOTHING
        `,
        [targetId, sourceId, notes, access.caseId],
      )
    }

    let association: EvidenceAssociation | null = null

    if (evidenceId) {
      const actorProfileId = await profileIdForUser(access.user.id)
      if (!actorProfileId) return NextResponse.json({ error: "User profile missing." }, { status: 500 })

      const table = targetType === "entity" ? "entity_evidence" : "relationship_evidence"
      const targetColumn = targetType === "entity" ? "entity_id" : "relationship_id"
      const inserted = await withTransaction((client) => client.query<{ evidence_id: string }>(
        `
          INSERT INTO ${table} (${targetColumn}, forensic_file_id, analyst_notes, created_by)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (${targetColumn}, forensic_file_id) DO NOTHING
          RETURNING forensic_file_id AS evidence_id
        `,
        [targetId, evidenceId, notes, actorProfileId],
      ))

      if (inserted.rows[0]) {
        const listed = await listTargetEvidenceAssociations(targetType, targetId, access.caseId)
        association = listed.rows.find((item) => item.evidence_id === evidenceId) ?? null

        if (!association) throw new Error("Created evidence association could not be loaded.")

        await recordInvestigationTimeline(
          access.caseId,
          access.user.id,
          "evidence_associated",
          "Supporting Evidence Linked",
          `Evidence linked to ${associationType(targetType)} ${targetId}.`,
        )
        await emitCaseWorkspaceEvent({
          type: "evidence.associated",
          case_id: access.caseId,
          actor_id: access.user.id,
          record_id: evidenceId,
          data: {
            association_id: association.association_id,
            association_type: associationType(targetType),
            evidence_id: evidenceId,
            target_id: targetId,
            target_type: targetType,
            file_name: association.evidence_file_name,
          },
        })
        await auditLog(access.user.id, "evidence_associated", request, {
          case_id: access.caseId,
          association_id: association.association_id,
          association_type: associationType(targetType),
          evidence_id: evidenceId,
          target_id: targetId,
          target_type: targetType,
          analyst_notes: notes,
        })
      }
    }

    return NextResponse.json({ ok: true, created: Boolean(association), association })
  } catch (error) {
    console.error("LINK GRAPH PROVENANCE ERROR:", error)
    return NextResponse.json(
      { error: "Failed to link graph provenance. Verify the deployed evidence association migration." },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const access = await requireInvestigationWorkspace(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!canManageGraph(access.user.role)) {
      return NextResponse.json({ error: "You are not authorized to remove evidence associations." }, { status: 403 })
    }

    const body = await request.json()
    const targetType = normalizeTargetType(optionalText(body?.target_type))
    const targetId = optionalText(body?.target_id)
    const evidenceId = optionalText(body?.evidence_id)
    if (!targetType || !targetId || !evidenceId) {
      return NextResponse.json({ error: "Target type, target id, and evidence id are required." }, { status: 400 })
    }

    const removed = await withTransaction((client) => {
      if (targetType === "entity") {
        return client.query<EvidenceAssociation>(
          `
            DELETE FROM entity_evidence ee
            USING investigation_entities ie, forensic_files ff
            WHERE ee.entity_id = $1
              AND ee.forensic_file_id = $2
              AND ie.id = ee.entity_id
              AND ff.id = ee.forensic_file_id
              AND ie.case_id = $3
              AND ff.case_id = $3
            RETURNING
              CONCAT('entity:', ee.entity_id::text, ':', ee.forensic_file_id::text) AS association_id,
              'entity'::text AS target_type,
              ee.entity_id AS target_id,
              ie.name AS target_label,
              ff.id AS evidence_id,
              ff.file_name AS evidence_file_name,
              ff.evidence_type,
              ff.description AS evidence_description,
              ff.file_hash AS evidence_sha256,
              ee.created_at,
              ee.created_by,
              NULL::text AS created_by_username
          `,
          [targetId, evidenceId, access.caseId],
        )
      }

      return client.query<EvidenceAssociation>(
        `
          DELETE FROM relationship_evidence re
          USING entity_relationships er, forensic_files ff
          WHERE re.relationship_id = $1
            AND re.forensic_file_id = $2
            AND er.id = re.relationship_id
            AND ff.id = re.forensic_file_id
            AND er.case_id = $3
            AND ff.case_id = $3
          RETURNING
            CONCAT('relationship:', re.relationship_id::text, ':', re.forensic_file_id::text) AS association_id,
            'relationship'::text AS target_type,
            re.relationship_id AS target_id,
            er.relationship_type AS target_label,
            ff.id AS evidence_id,
            ff.file_name AS evidence_file_name,
            ff.evidence_type,
            ff.description AS evidence_description,
            ff.file_hash AS evidence_sha256,
            re.created_at,
            re.created_by,
            NULL::text AS created_by_username
        `,
        [targetId, evidenceId, access.caseId],
      )
    })

    const association = removed.rows[0]
    if (!association) {
      return NextResponse.json({ error: "Evidence association not found for this case." }, { status: 404 })
    }

    await recordInvestigationTimeline(
      access.caseId,
      access.user.id,
      "evidence_unlinked",
      "Supporting Evidence Unlinked",
      `Evidence link removed from ${associationType(targetType)} ${targetId}.`,
    )
    await emitCaseWorkspaceEvent({
      type: "evidence.unlinked",
      case_id: access.caseId,
      actor_id: access.user.id,
      record_id: evidenceId,
      data: {
        association_id: association.association_id,
        association_type: associationType(targetType),
        evidence_id: evidenceId,
        target_id: targetId,
        target_type: targetType,
        file_name: association.evidence_file_name,
      },
    })
    await auditLog(access.user.id, "evidence_unlinked", request, {
      case_id: access.caseId,
      association_id: association.association_id,
      association_type: associationType(targetType),
      evidence_id: evidenceId,
      target_id: targetId,
      target_type: targetType,
    })

    return NextResponse.json({ ok: true, association })
  } catch (error) {
    console.error("UNLINK GRAPH PROVENANCE ERROR:", error)
    return NextResponse.json({ error: "Failed to remove evidence association." }, { status: 500 })
  }
}
