import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"

import { auditLog, getCurrentUser } from "@/lib/auth"
import { query, withTransaction } from "@/lib/db"
import { isSameOriginMutation } from "@/lib/security-center"
import {
  deleteEvidenceFile,
  uploadEvidenceFile,
} from "@/lib/services/storage-service"

const MAX_FILE_SIZE = 50 * 1024 * 1024
const MAX_TOTAL_SIZE = 100 * 1024 * 1024
const MAX_FILES = 10

type RequestOwner = {
  id: string
  converted_case_id: string | null
  converted_training_engagement_id: string | null
}

type StoredEvidence = {
  id: string
  name: string
  size: number
  type: string
  storage_path: string
  sha256: string
  uploaded_at: string
  uploaded_by: string
  verified: true
  custody: Array<{
    action: string
    actor_id: string
    timestamp: string
    notes: string
  }>
}

function safeFileName(name: string) {
  return name.replace(/[^\w.\-() ]/g, "_").trim() || "evidence-file"
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uploadedPaths: string[] = []

  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: "Request could not be verified." }, { status: 403 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (user.role !== "client") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: requestId } = await params
    const owner = await query<RequestOwner>(
      `
        SELECT
          r.id,
          r.converted_case_id,
          r.converted_training_engagement_id
        FROM requests r
        WHERE r.id = $1
          AND r.user_id = $2
        LIMIT 1
      `,
      [requestId, user.id],
    )

    if (!owner.rows[0]) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }
    if (
      owner.rows[0].converted_case_id ||
      owner.rows[0].converted_training_engagement_id
    ) {
      return NextResponse.json(
        { error: "Evidence for a converted request must be uploaded from its case or training workspace." },
        { status: 409 },
      )
    }

    const form = await request.formData()
    const files = form
      .getAll("files")
      .filter((value): value is File => value instanceof File)

    if (files.length === 0) {
      return NextResponse.json({ error: "At least one evidence file is required." }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `A maximum of ${MAX_FILES} files can be uploaded at once.` }, { status: 400 })
    }

    const totalSize = files.reduce((total, file) => total + file.size, 0)
    if (files.some((file) => file.size <= 0 || file.size > MAX_FILE_SIZE)) {
      return NextResponse.json({ error: "Each evidence file must be non-empty and no larger than 50MB." }, { status: 400 })
    }
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json({ error: "The combined evidence upload cannot exceed 100MB." }, { status: 400 })
    }

    const uploadedAt = new Date().toISOString()
    const stored: StoredEvidence[] = []

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const sha256 = crypto.createHash("sha256").update(buffer).digest("hex")
      const evidenceId = crypto.randomUUID()
      const path = `requests/${requestId}/${evidenceId}-${safeFileName(file.name)}`

      await uploadEvidenceFile(path, buffer, file.type || "application/octet-stream")
      uploadedPaths.push(path)
      stored.push({
        id: evidenceId,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        storage_path: path,
        sha256,
        uploaded_at: uploadedAt,
        uploaded_by: user.id,
        verified: true,
        custody: [{
          action: "request_upload",
          actor_id: user.id,
          timestamp: uploadedAt,
          notes: "Uploaded by the client with the service request.",
        }],
      })
    }

    await withTransaction(async (client) => {
      const locked = await client.query<RequestOwner>(
        `
          SELECT
            r.id,
            r.converted_case_id,
            r.converted_training_engagement_id
          FROM requests r
          WHERE r.id = $1
            AND r.user_id = $2
          FOR UPDATE
        `,
        [requestId, user.id],
      )

      const row = locked.rows[0]
      if (!row) throw new Error("REQUEST_NOT_FOUND")
      if (row.converted_case_id || row.converted_training_engagement_id) {
        throw new Error("REQUEST_ALREADY_CONVERTED")
      }

      await client.query(
        `
          UPDATE requests r
          SET
            evidence_uploads = COALESCE(r.evidence_uploads, '[]'::jsonb) || $3::jsonb,
            updated_at = NOW()
          WHERE r.id = $1
            AND r.user_id = $2
        `,
        [requestId, user.id, JSON.stringify(stored)],
      )
    })

    await auditLog(user.id, "request_evidence_uploaded", request, {
      request_id: requestId,
      file_count: stored.length,
      evidence_ids: stored.map((item) => item.id),
    }).catch((auditError) => {
      console.error("REQUEST EVIDENCE AUDIT ERROR:", auditError)
    })

    uploadedPaths.length = 0

    return NextResponse.json(
      {
        success: true,
        evidence: stored.map(({ custody: _custody, ...item }) => item),
      },
      { status: 201 },
    )
  } catch (error) {
    await Promise.all(uploadedPaths.map((path) => deleteEvidenceFile(path).catch(() => {})))
    console.error("REQUEST EVIDENCE UPLOAD ERROR:", error)

    const message = error instanceof Error ? error.message : ""
    const status = message === "REQUEST_NOT_FOUND" ? 404 : message === "REQUEST_ALREADY_CONVERTED" ? 409 : 500
    return NextResponse.json(
      {
        error:
          status === 404
            ? "Request not found"
            : status === 409
              ? "This request has already been converted. Upload evidence from its workspace."
              : "Evidence upload failed. The request itself was submitted successfully.",
      },
      { status },
    )
  }
}
