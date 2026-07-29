import { NextRequest, NextResponse } from "next/server"
import { auditLog } from "@/lib/auth"
import {
  aliasesJson,
  optionalText,
  recordInvestigationTimeline,
  requireInvestigationWorkspace,
  toScore,
} from "@/lib/investigation-workspace"
import { query } from "@/lib/db"

async function entityBelongsToCase(entityId: string, caseId: string) {
  const entity = await query<{ id: string }>(
    "SELECT id FROM investigation_entities WHERE id=$1 AND case_id=$2 LIMIT 1",
    [entityId, caseId],
  )

  return Boolean(entity.rows.length)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const access = await requireInvestigationWorkspace(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const [entities, relationships, sources, observations] = await Promise.all([
      query(
        `
        SELECT
          ie.id,
          ie.case_id,
          ie.entity_type,
          ie.name,
          ie.description,
          ie.aliases,
          ie.verification_status,
          ie.confidence_score,
          ie.created_by,
          ie.created_at,
          ie.updated_at,
          au.username AS created_by_username
        FROM investigation_entities ie
        LEFT JOIN app_users au ON au.id = ie.created_by
        WHERE ie.case_id = $1
        ORDER BY ie.created_at DESC
        `,
        [access.caseId],
      ),
      query(
        `
        SELECT
          er.id,
          er.case_id,
          er.source_entity_id,
          source_entity.name AS source_entity_name,
          er.target_entity_id,
          target_entity.name AS target_entity_name,
          er.relationship_type,
          er.description,
          er.confidence_score,
          er.verification_status,
          er.created_by,
          au.username AS created_by_username
        FROM entity_relationships er
        LEFT JOIN investigation_entities source_entity ON source_entity.id = er.source_entity_id
        LEFT JOIN investigation_entities target_entity ON target_entity.id = er.target_entity_id
        LEFT JOIN app_users au ON au.id = er.created_by
        WHERE er.case_id = $1
        ORDER BY er.id DESC
        `,
        [access.caseId],
      ),
      query(
        `
        SELECT
          ins.id,
          ins.case_id,
          ins.source_type,
          ins.title,
          ins.url,
          ins.description,
          ins.reliability_score,
          ins.collected_by,
          ins.collected_at,
          ins.created_at,
          au.username AS collected_by_username
        FROM intelligence_sources ins
        LEFT JOIN app_users au ON au.id = ins.collected_by
        WHERE ins.case_id = $1
        ORDER BY ins.created_at DESC
        `,
        [access.caseId],
      ),
      query(
        `
        SELECT
          io.id,
          io.case_id,
          io.observation_type,
          io.title,
          io.description,
          io.confidence_score,
          io.status,
          io.reviewed_by,
          io.reviewed_at,
          io.created_at,
          reviewer.username AS reviewed_by_username
        FROM intelligence_observations io
        LEFT JOIN app_users reviewer ON reviewer.id = io.reviewed_by
        WHERE io.case_id = $1
        ORDER BY io.created_at DESC
        `,
        [access.caseId],
      ),
    ])

    await auditLog(access.user.id, "investigation_workspace_viewed", request, { case_id: access.caseId })

    return NextResponse.json({
      case_id: access.caseId,
      entities: entities.rows,
      relationships: relationships.rows,
      sources: sources.rows,
      observations: observations.rows,
    })
  } catch (error) {
    console.error("INVESTIGATION WORKSPACE GET ERROR", error)
    return NextResponse.json({ error: "Failed to load investigation workspace" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const access = await requireInvestigationWorkspace(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json()
    const type = String(body.type || "")

    if (type === "entity") {
      const name = optionalText(body.name)
      if (!name) return NextResponse.json({ error: "Entity name required" }, { status: 400 })

      const inserted = await query(
        `
        INSERT INTO investigation_entities
          (case_id, entity_type, name, description, aliases, verification_status, confidence_score, created_by)
        VALUES
          ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
        RETURNING *
        `,
        [
          access.caseId,
          optionalText(body.entity_type),
          name,
          optionalText(body.description),
          aliasesJson(body.aliases),
          optionalText(body.verification_status) ?? "unverified",
          toScore(body.confidence_score),
          access.user.id,
        ],
      )

      await recordInvestigationTimeline(access.caseId, access.user.id, "entity_created", "Entity created", name)
      await auditLog(access.user.id, "investigation_entity_created", request, { case_id: access.caseId, entity_id: inserted.rows[0].id })
      return NextResponse.json(inserted.rows[0], { status: 201 })
    }

    if (type === "relationship") {
      const sourceId = optionalText(body.source_entity_id)
      const targetId = optionalText(body.target_entity_id)
      if (!sourceId || !targetId || sourceId === targetId) {
        return NextResponse.json({ error: "Two different entities are required" }, { status: 400 })
      }
      if (!(await entityBelongsToCase(sourceId, access.caseId)) || !(await entityBelongsToCase(targetId, access.caseId))) {
        return NextResponse.json({ error: "Relationship entities must belong to the case" }, { status: 400 })
      }

      const inserted = await query(
        `
        INSERT INTO entity_relationships
          (case_id, source_entity_id, target_entity_id, relationship_type, description, confidence_score, verification_status, created_by)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `,
        [
          access.caseId,
          sourceId,
          targetId,
          optionalText(body.relationship_type),
          optionalText(body.description),
          toScore(body.confidence_score),
          optionalText(body.verification_status) ?? "unverified",
          access.user.id,
        ],
      )

      await recordInvestigationTimeline(access.caseId, access.user.id, "relationship_created", "Relationship created", optionalText(body.relationship_type) ?? "Entity relationship recorded")
      await auditLog(access.user.id, "entity_relationship_created", request, { case_id: access.caseId, relationship_id: inserted.rows[0].id })
      return NextResponse.json(inserted.rows[0], { status: 201 })
    }

    if (type === "source") {
      const title = optionalText(body.title)
      if (!title) return NextResponse.json({ error: "Source title required" }, { status: 400 })

      const inserted = await query(
        `
        INSERT INTO intelligence_sources
          (case_id, source_type, title, url, description, reliability_score, collected_by, collected_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamp, NOW()))
        RETURNING *
        `,
        [
          access.caseId,
          optionalText(body.source_type),
          title,
          optionalText(body.url),
          optionalText(body.description),
          toScore(body.reliability_score),
          access.user.id,
          optionalText(body.collected_at),
        ],
      )

      await auditLog(access.user.id, "intelligence_source_created", request, { case_id: access.caseId, source_id: inserted.rows[0].id })
      return NextResponse.json(inserted.rows[0], { status: 201 })
    }

    if (type === "observation") {
      const title = optionalText(body.title)
      const description = optionalText(body.description)
      if (!title || !description) return NextResponse.json({ error: "Observation title and description required" }, { status: 400 })

      const inserted = await query(
        `
        INSERT INTO intelligence_observations
          (case_id, observation_type, title, description, confidence_score, status)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
          access.caseId,
          optionalText(body.observation_type),
          title,
          description,
          toScore(body.confidence_score),
          optionalText(body.status) ?? "draft",
        ],
      )

      await recordInvestigationTimeline(access.caseId, access.user.id, "observation_added", "Observation added", title)
      await auditLog(access.user.id, "intelligence_observation_created", request, { case_id: access.caseId, observation_id: inserted.rows[0].id })
      return NextResponse.json(inserted.rows[0], { status: 201 })
    }

    return NextResponse.json({ error: "Unsupported investigation action" }, { status: 400 })
  } catch (error) {
    console.error("INVESTIGATION WORKSPACE POST ERROR", error)
    return NextResponse.json({ error: "Failed to save investigation workspace item" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const access = await requireInvestigationWorkspace(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json()
    const type = String(body.type || "")
    const itemId = optionalText(body.id)
    if (!itemId) return NextResponse.json({ error: "Item id required" }, { status: 400 })

    if (type === "entity") {
      const updated = await query<{ id: string; name: string }>(
        `
        UPDATE investigation_entities
        SET
          entity_type = COALESCE($3, entity_type),
          name = COALESCE($4, name),
          description = COALESCE($5, description),
          aliases = COALESCE($6::jsonb, aliases),
          verification_status = COALESCE($7, verification_status),
          confidence_score = COALESCE($8, confidence_score),
          updated_at = NOW()
        WHERE id = $1 AND case_id = $2
        RETURNING *
        `,
        [
          itemId,
          access.caseId,
          optionalText(body.entity_type),
          optionalText(body.name),
          optionalText(body.description),
          body.aliases === undefined ? null : aliasesJson(body.aliases),
          optionalText(body.verification_status),
          toScore(body.confidence_score),
        ],
      )
      if (!updated.rows.length) return NextResponse.json({ error: "Entity not found" }, { status: 404 })

      await recordInvestigationTimeline(access.caseId, access.user.id, "entity_updated", "Entity updated", updated.rows[0].name)
      await auditLog(access.user.id, "investigation_entity_updated", request, { case_id: access.caseId, entity_id: itemId })
      return NextResponse.json(updated.rows[0])
    }

    if (type === "relationship") {
      const sourceId = optionalText(body.source_entity_id)
      const targetId = optionalText(body.target_entity_id)
      if (sourceId && !(await entityBelongsToCase(sourceId, access.caseId))) return NextResponse.json({ error: "Source entity not found" }, { status: 400 })
      if (targetId && !(await entityBelongsToCase(targetId, access.caseId))) return NextResponse.json({ error: "Target entity not found" }, { status: 400 })
      if (sourceId && targetId && sourceId === targetId) return NextResponse.json({ error: "Relationship entities must be different" }, { status: 400 })

      const updated = await query(
        `
        UPDATE entity_relationships
        SET
          source_entity_id = COALESCE($3, source_entity_id),
          target_entity_id = COALESCE($4, target_entity_id),
          relationship_type = COALESCE($5, relationship_type),
          description = COALESCE($6, description),
          confidence_score = COALESCE($7, confidence_score),
          verification_status = COALESCE($8, verification_status)
        WHERE id = $1 AND case_id = $2
        RETURNING *
        `,
        [
          itemId,
          access.caseId,
          sourceId,
          targetId,
          optionalText(body.relationship_type),
          optionalText(body.description),
          toScore(body.confidence_score),
          optionalText(body.verification_status),
        ],
      )
      if (!updated.rows.length) return NextResponse.json({ error: "Relationship not found" }, { status: 404 })

      await auditLog(access.user.id, "entity_relationship_updated", request, { case_id: access.caseId, relationship_id: itemId })
      return NextResponse.json(updated.rows[0])
    }

    if (type === "source") {
      const updated = await query(
        `
        UPDATE intelligence_sources
        SET
          source_type = COALESCE($3, source_type),
          title = COALESCE($4, title),
          url = COALESCE($5, url),
          description = COALESCE($6, description),
          reliability_score = COALESCE($7, reliability_score),
          collected_at = COALESCE($8::timestamp, collected_at)
        WHERE id = $1 AND case_id = $2
        RETURNING *
        `,
        [
          itemId,
          access.caseId,
          optionalText(body.source_type),
          optionalText(body.title),
          optionalText(body.url),
          optionalText(body.description),
          toScore(body.reliability_score),
          optionalText(body.collected_at),
        ],
      )
      if (!updated.rows.length) return NextResponse.json({ error: "Source not found" }, { status: 404 })

      await auditLog(access.user.id, "intelligence_source_updated", request, { case_id: access.caseId, source_id: itemId })
      return NextResponse.json(updated.rows[0])
    }

    if (type === "observation") {
      const reviewedBy = body.status === "reviewed" ? access.user.id : null
      const reviewedAt = body.status === "reviewed" ? new Date().toISOString() : null
      const updated = await query(
        `
        UPDATE intelligence_observations
        SET
          observation_type = COALESCE($3, observation_type),
          title = COALESCE($4, title),
          description = COALESCE($5, description),
          confidence_score = COALESCE($6, confidence_score),
          status = COALESCE($7, status),
          reviewed_by = COALESCE($8, reviewed_by),
          reviewed_at = COALESCE($9::timestamp, reviewed_at)
        WHERE id = $1 AND case_id = $2
        RETURNING *
        `,
        [
          itemId,
          access.caseId,
          optionalText(body.observation_type),
          optionalText(body.title),
          optionalText(body.description),
          toScore(body.confidence_score),
          optionalText(body.status),
          reviewedBy,
          reviewedAt,
        ],
      )
      if (!updated.rows.length) return NextResponse.json({ error: "Observation not found" }, { status: 404 })

      await auditLog(access.user.id, "intelligence_observation_updated", request, { case_id: access.caseId, observation_id: itemId })
      return NextResponse.json(updated.rows[0])
    }

    return NextResponse.json({ error: "Unsupported investigation action" }, { status: 400 })
  } catch (error) {
    console.error("INVESTIGATION WORKSPACE PATCH ERROR", error)
    return NextResponse.json({ error: "Failed to update investigation workspace item" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const access = await requireInvestigationWorkspace(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json()
    const type = String(body.type || "")
    const itemId = optionalText(body.id)
    if (!itemId) return NextResponse.json({ error: "Item id required" }, { status: 400 })

    const tableByType: Record<string, string> = {
      entity: "investigation_entities",
      relationship: "entity_relationships",
      source: "intelligence_sources",
      observation: "intelligence_observations",
    }
    const table = tableByType[type]
    if (!table) return NextResponse.json({ error: "Unsupported investigation action" }, { status: 400 })

    const deleted = await query(`DELETE FROM ${table} WHERE id=$1 AND case_id=$2 RETURNING id`, [itemId, access.caseId])
    if (!deleted.rows.length) return NextResponse.json({ error: "Item not found" }, { status: 404 })

    await auditLog(access.user.id, `investigation_${type}_deleted`, request, { case_id: access.caseId, id: itemId })
    return NextResponse.json({ id: itemId })
  } catch (error) {
    console.error("INVESTIGATION WORKSPACE DELETE ERROR", error)
    return NextResponse.json({ error: "Failed to delete investigation workspace item" }, { status: 500 })
  }
}
