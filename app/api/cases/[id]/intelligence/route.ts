import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value)
}

async function resolveCaseId(caseId: string) {
  if (isUuid(caseId)) return caseId

  const result = await query<{ id: string }>(
    "SELECT id FROM cases WHERE case_number=$1 OR id::text=$1 LIMIT 1",
    [caseId],
  )

  return result.rows[0]?.id ?? null
}

async function profileIdForUser(userId: string) {
  const profile = await query<{ id: string }>(
    "SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1",
    [userId],
  ).catch(() => ({ rows: [] }))

  return profile.rows[0]?.id ?? null
}

async function canUseIntelligence(userId: string, role: string, caseId: string) {
  if (isAdminRole(role)) return true
  if (!["investigator", "analyst"].includes(role)) return false

  const profileId = await profileIdForUser(userId)
  if (!profileId) return false

  const access = await query<{ id: string }>(
    `
    SELECT c.id
    FROM cases c
    LEFT JOIN case_assignments ca
      ON ca.case_id = c.id
      AND ca.assigned_to = $2
      AND ca.removed_at IS NULL
      AND COALESCE(ca.status, 'assigned') <> 'removed'
    WHERE c.id = $1
      AND (
        c.assigned_to = $2
        OR ca.id IS NOT NULL
      )
    LIMIT 1
    `,
    [caseId, profileId],
  )

  return Boolean(access.rows.length)
}

function toScore(value: unknown) {
  const score = Number(value ?? 0)
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const caseId = await resolveCaseId(id)
    if (!caseId) return NextResponse.json({ error: "Case not found" }, { status: 404 })
    if (!(await canUseIntelligence(user.id, user.role, caseId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [entities, relationships, sources, findings, notes] = await Promise.all([
      query(
        `
        SELECT
          ie.id,
          ie.case_id,
          ie.name,
          ie.entity_type,
          ie.description,
          ie.verification_status,
          ie.confidence_score,
          ie.created_at,
          ie.updated_at,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', ef.id,
                'file_name', ef.file_name,
                'status', ef.status,
                'sha256_hash', ef.sha256_hash
              )
            ) FILTER (WHERE ef.id IS NOT NULL),
            '[]'::json
          ) AS linked_evidence,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', ins.id,
                'source_type', ins.source_type,
                'source_name', ins.source_name,
                'url', ins.url,
                'reliability_score', ins.reliability_score
              )
            ) FILTER (WHERE ins.id IS NOT NULL),
            '[]'::json
          ) AS sources
        FROM investigation_entities ie
        LEFT JOIN entity_sources es ON es.entity_id = ie.id
        LEFT JOIN intelligence_sources ins ON ins.id = es.source_id
        LEFT JOIN evidence_files ef ON ef.case_id = ie.case_id
          AND (
            ef.description ILIKE '%' || ie.name || '%'
            OR ef.file_name ILIKE '%' || ie.name || '%'
          )
        WHERE ie.case_id = $1
        GROUP BY ie.id
        ORDER BY ie.created_at DESC
        `,
        [caseId],
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
          er.verification_status,
          er.confidence_score,
          er.created_at
        FROM entity_relationships er
        LEFT JOIN investigation_entities source_entity ON source_entity.id = er.source_entity_id
        LEFT JOIN investigation_entities target_entity ON target_entity.id = er.target_entity_id
        WHERE er.case_id = $1
        ORDER BY er.created_at DESC
        `,
        [caseId],
      ),
      query(
        `
        SELECT ins.*, au.username AS created_by_username
        FROM intelligence_sources ins
        LEFT JOIN app_users au ON au.id = ins.created_by
        WHERE ins.case_id = $1
        ORDER BY ins.created_at DESC
        `,
        [caseId],
      ),
      query(
        `
        SELECT inf.*, au.username AS created_by_username
        FROM investigation_findings inf
        LEFT JOIN app_users au ON au.id = inf.created_by
        WHERE inf.case_id = $1
        ORDER BY inf.created_at DESC
        `,
        [caseId],
      ),
      query(
        `
        SELECT en.*, au.username, ie.case_id
        FROM entity_notes en
        JOIN investigation_entities ie ON ie.id = en.entity_id
        LEFT JOIN app_users au ON au.id = en.user_id
        WHERE ie.case_id = $1
        ORDER BY en.created_at DESC
        `,
        [caseId],
      ),
    ])

    await auditLog(user.id, "intelligence_viewed", _request, { case_id: caseId })

    return NextResponse.json({
      case_id: caseId,
      entities: entities.rows,
      relationships: relationships.rows,
      sources: sources.rows,
      findings: findings.rows,
      notes: notes.rows,
    })
  } catch (error) {
    console.error("INTELLIGENCE GET ERROR", error)
    return NextResponse.json({ error: "Failed to load intelligence" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const caseId = await resolveCaseId(id)
    if (!caseId) return NextResponse.json({ error: "Case not found" }, { status: 404 })
    if (!(await canUseIntelligence(user.id, user.role, caseId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const type = String(body.type || "")

    if (type === "source") {
      if (!body.source_name) {
        return NextResponse.json({ error: "Source name required" }, { status: 400 })
      }

      const inserted = await query(
        `
        INSERT INTO intelligence_sources
          (case_id, created_by, source_type, source_name, url, description, reliability_score)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [
          caseId,
          user.id,
          body.source_type ?? null,
          body.source_name,
          body.url ?? null,
          body.description ?? null,
          toScore(body.reliability_score),
        ],
      )

      const source = inserted.rows[0]
      if (body.entity_id) {
        await query(
          `
          INSERT INTO entity_sources (entity_id, source_id)
          SELECT id, $2
          FROM investigation_entities
          WHERE id = $1 AND case_id = $3
          ON CONFLICT (entity_id, source_id) DO NOTHING
          `,
          [body.entity_id, source.id, caseId],
        )
      }

      await auditLog(user.id, "intelligence_source_created", request, { case_id: caseId, source_id: source.id })
      return NextResponse.json(source, { status: 201 })
    }

    if (type === "finding") {
      if (!body.title || !body.finding) {
        return NextResponse.json({ error: "Finding title and body required" }, { status: 400 })
      }

      const inserted = await query(
        `
        INSERT INTO investigation_findings
          (case_id, created_by, title, finding, confidence_score)
        VALUES
          ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [caseId, user.id, body.title, body.finding, toScore(body.confidence_score)],
      )

      await auditLog(user.id, "investigation_finding_created", request, { case_id: caseId, finding_id: inserted.rows[0].id })
      return NextResponse.json(inserted.rows[0], { status: 201 })
    }

    if (type === "entity_note") {
      if (!body.entity_id || !body.note) {
        return NextResponse.json({ error: "Entity and note required" }, { status: 400 })
      }

      const entity = await query<{ id: string }>(
        "SELECT id FROM investigation_entities WHERE id=$1 AND case_id=$2 LIMIT 1",
        [body.entity_id, caseId],
      )
      if (!entity.rows.length) return NextResponse.json({ error: "Entity not found" }, { status: 404 })

      const inserted = await query(
        `
        INSERT INTO entity_notes (entity_id, user_id, note)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [body.entity_id, user.id, body.note],
      )

      await auditLog(user.id, "entity_note_created", request, { case_id: caseId, entity_id: body.entity_id, note_id: inserted.rows[0].id })
      return NextResponse.json(inserted.rows[0], { status: 201 })
    }

    return NextResponse.json({ error: "Unsupported intelligence action" }, { status: 400 })
  } catch (error) {
    console.error("INTELLIGENCE POST ERROR", error)
    return NextResponse.json({ error: "Failed to save intelligence" }, { status: 500 })
  }
}
