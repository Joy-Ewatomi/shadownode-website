import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

const statuses = new Set(["submitted", "verified", "rejected", "archived"])

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function resolveCaseId(caseId: string) {
  if (isUuid(caseId)) return caseId
  const result = await query<{ id: string }>("SELECT id FROM cases WHERE case_number=$1 LIMIT 1", [caseId])
  return result.rows[0]?.id || null
}

async function canAccessCase(userId: string, role: string, caseId: string) {
  if (isAdminRole(role)) return true

  const profile = await query<{ id: string }>("SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1", [userId]).catch(() => ({ rows: [] }))
  const profileId = profile.rows[0]?.id

  const access = await query<{ id: string }>(
    `
    SELECT c.id
    FROM cases c
    LEFT JOIN case_assignments ca
      ON ca.case_id = c.id
      AND ca.removed_at IS NULL
      AND COALESCE(ca.status, 'assigned') <> 'removed'
    WHERE c.id = $1
      AND (
        c.case_user_id = $2
        OR c.assigned_to = $2
        OR ca.assigned_to = $2
      )
    LIMIT 1
    `,
    [caseId, profileId || null],
  )

  return Boolean(access.rows.length)
}

async function activity(evidenceId: string, userId: string, action: string, notes?: string | null) {
  await query(
    `
    INSERT INTO evidence_activity (evidence_id, user_id, action, notes)
    VALUES ($1, $2, $3, $4)
    `,
    [evidenceId, userId, action, notes || null],
  )
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
    if (!(await canAccessCase(user.id, user.role, caseId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const evidence = await query(
      `
      SELECT
        ef.id,
        ef.case_id,
        ef.file_name,
        ef.file_type,
        ef.file_size,
        ef.storage_path,
        ef.sha256_hash,
        ef.description,
        ef.status,
        ef.created_at,
        u.username AS uploader,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ea.id,
              'action', ea.action,
              'notes', ea.notes,
              'created_at', ea.created_at,
              'username', au.username
            )
            ORDER BY ea.created_at DESC
          ) FILTER (WHERE ea.id IS NOT NULL),
          '[]'::json
        ) AS activity
      FROM evidence_files ef
      LEFT JOIN app_users u ON u.id = ef.uploaded_by
      LEFT JOIN evidence_activity ea ON ea.evidence_id = ef.id
      LEFT JOIN app_users au ON au.id = ea.user_id
      WHERE ef.case_id = $1
      GROUP BY ef.id, u.username
      ORDER BY ef.created_at DESC
      `,
      [caseId],
    )

    return NextResponse.json(evidence.rows)
  } catch (error) {
    console.error("EVIDENCE GET ERROR", error)
    return NextResponse.json({ error: "Failed to load evidence" }, { status: 500 })
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
    if (!(await canAccessCase(user.id, user.role, caseId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const form = await request.formData()
    const file = form.get("file")
    const description = String(form.get("description") || "")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Evidence file required" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex")
    const storagePath = `evidence/${caseId}/${Date.now()}-${file.name}`

    const inserted = await query<{ id: string }>(
      `
      INSERT INTO evidence_files
        (case_id, uploaded_by, file_name, file_type, file_size, storage_path, sha256_hash, description)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
      `,
      [caseId, user.id, file.name, file.type || "application/octet-stream", file.size, storagePath, sha256, description || null],
    )

    await activity(inserted.rows[0].id, user.id, "submitted", description || "Evidence submitted")
    await auditLog(user.id, "evidence_submitted", request, { case_id: caseId, evidence_id: inserted.rows[0].id, sha256_hash: sha256 })

    return NextResponse.json({ id: inserted.rows[0].id, sha256_hash: sha256 }, { status: 201 })
  } catch (error) {
    console.error("EVIDENCE POST ERROR", error)
    return NextResponse.json({ error: "Failed to upload evidence" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const caseId = await resolveCaseId(id)
    if (!caseId) return NextResponse.json({ error: "Case not found" }, { status: 404 })
    if (!(await canAccessCase(user.id, user.role, caseId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { evidence_id, status, notes } = await request.json()
    if (!evidence_id || !statuses.has(status)) {
      return NextResponse.json({ error: "Invalid evidence status update" }, { status: 400 })
    }

    const updated = await query<{ id: string }>(
      `
      UPDATE evidence_files
      SET status = $3
      WHERE id = $1 AND case_id = $2
      RETURNING id
      `,
      [evidence_id, caseId, status],
    )

    if (!updated.rows.length) return NextResponse.json({ error: "Evidence not found" }, { status: 404 })

    await activity(evidence_id, user.id, status, notes || `Evidence ${status}`)
    await auditLog(user.id, "evidence_status_changed", request, { case_id: caseId, evidence_id, status })

    return NextResponse.json({ id: evidence_id, status })
  } catch (error) {
    console.error("EVIDENCE PATCH ERROR", error)
    return NextResponse.json({ error: "Failed to update evidence" }, { status: 500 })
  }
}
