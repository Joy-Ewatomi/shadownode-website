import { NextRequest, NextResponse } from "next/server"

import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { createSignedUrlForBucket } from "@/lib/services/storage-service"
import { ensureAccess } from "@/lib/services/training-operations-service"

const SIGNED_URL_TTL_SECONDS = 5 * 60

type MaterialRow = {
  id: string
  training_engagement_id: string
  file_url: string | null
  visibility: string | null
}

function isClientVisible(visibility: string | null) {
  return ["public", "client", "client_visible", "published"].includes(
    String(visibility || "").trim().toLowerCase(),
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const materialResult = await query<MaterialRow>(
      `
      SELECT id, training_engagement_id, file_url, visibility
      FROM training_materials
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    )

    const material = materialResult.rows[0]
    if (!material?.file_url) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    try {
      await ensureAccess(
        material.training_engagement_id,
        user,
        false,
      )
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (user.role === "client" && !isClientVisible(material.visibility)) {
      await auditLog(user.id, "training_material_download_forbidden", request, {
        training_engagement_id: material.training_engagement_id,
      })
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const signed = await createSignedUrlForBucket(
      "evidence",
      material.file_url,
      SIGNED_URL_TTL_SECONDS,
    )

    await auditLog(user.id, "training_material_download_signed", request, {
      training_engagement_id: material.training_engagement_id,
      training_material_id: material.id,
      ttl_seconds: SIGNED_URL_TTL_SECONDS,
    })

    return NextResponse.redirect(signed)
  } catch (error) {
    console.error("TRAINING MATERIAL SIGN ERROR", error)
    return NextResponse.json(
      { error: "Unable to create material download" },
      { status: 400 },
    )
  }
}
