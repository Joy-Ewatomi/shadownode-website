import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

const allowedResourceTypes = new Set([
  "request",
  "case",
  "message",
  "conversation",
  "assignment",
  "report",
  "training",
  "certificate",
  "payment",
])

function normalizeResourceType(value: unknown) {
  const type = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")

  if (type === "messages") return "message"
  if (type === "training_engagement") return "training"

  return type
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => null)
    const resourceType = normalizeResourceType(
      body?.resource_type || body?.resourceType,
    )
    const resourceId = String(
      body?.resource_id || body?.resourceId || "",
    ).trim()

    if (!allowedResourceTypes.has(resourceType)) {
      return NextResponse.json(
        { error: "Invalid resource type" },
        { status: 400 },
      )
    }

    if (!resourceId) {
      return NextResponse.json(
        { error: "Resource ID is required" },
        { status: 400 },
      )
    }

    const result = await query<{ id: string }>(
      `
        UPDATE notifications
        SET is_read = true
        WHERE user_id = $1
          AND is_read = false
          AND (
            (
              $2 = 'case'
              AND (
                case_id::text = $3
                OR metadata->>'case_id' = $3
                OR metadata->>'caseId' = $3
                OR (
                  COALESCE(metadata->>'resource_type', metadata->>'resourceType') = 'case'
                  AND COALESCE(metadata->>'resource_id', metadata->>'resourceId') = $3
                )
              )
            )
            OR (
              $2 = 'request'
              AND (
                metadata->>'request_id' = $3
                OR metadata->>'requestId' = $3
                OR (
                  COALESCE(metadata->>'resource_type', metadata->>'resourceType') = 'request'
                  AND COALESCE(metadata->>'resource_id', metadata->>'resourceId') = $3
                )
              )
            )
            OR (
              $2 IN ('message', 'conversation')
              AND (
                metadata->>'conversation_id' = $3
                OR metadata->>'conversationId' = $3
                OR metadata->>'message_id' = $3
                OR metadata->>'messageId' = $3
                OR (
                  COALESCE(metadata->>'resource_type', metadata->>'resourceType') IN ('message', 'conversation')
                  AND COALESCE(metadata->>'resource_id', metadata->>'resourceId') = $3
                )
              )
            )
            OR (
              $2 = 'assignment'
              AND (
                metadata->>'assignment_id' = $3
                OR metadata->>'assignmentId' = $3
                OR metadata->>'case_id' = $3
                OR metadata->>'caseId' = $3
                OR (
                  COALESCE(metadata->>'resource_type', metadata->>'resourceType') IN ('assignment', 'case_assignment', 'case_team')
                  AND COALESCE(metadata->>'resource_id', metadata->>'resourceId') = $3
                )
                OR (
                  type IN (
                    'assignment',
                    'case_assignment',
                    'case_assignment_approval',
                    'case_assignment_approved',
                    'case_assignment_rejected',
                    'case_assignment_pending_approval'
                  )
                  AND (
                    case_id::text = $3
                    OR metadata->>'case_id' = $3
                    OR metadata->>'caseId' = $3
                  )
                )
              )
            )
            OR (
              $2 = 'report'
              AND (
                metadata->>'report_id' = $3
                OR metadata->>'reportId' = $3
                OR (
                  COALESCE(metadata->>'resource_type', metadata->>'resourceType') = 'report'
                  AND COALESCE(metadata->>'resource_id', metadata->>'resourceId') = $3
                )
              )
            )
            OR (
              $2 = 'training'
              AND (
                metadata->>'training_engagement_id' = $3
                OR metadata->>'training_id' = $3
                OR metadata->>'trainingId' = $3
                OR (
                  COALESCE(metadata->>'resource_type', metadata->>'resourceType') = 'training'
                  AND COALESCE(metadata->>'resource_id', metadata->>'resourceId') = $3
                )
              )
            )
            OR (
              $2 = 'certificate'
              AND (
                metadata->>'certificate_id' = $3
                OR metadata->>'certificateId' = $3
                OR metadata->'certificate_ids' ? $3
                OR metadata->'certificateIds' ? $3
                OR (
                  COALESCE(metadata->>'resource_type', metadata->>'resourceType') = 'certificate'
                  AND COALESCE(metadata->>'resource_id', metadata->>'resourceId') = $3
                )
              )
            )
            OR (
              $2 = 'payment'
              AND (
                metadata->>'payment_id' = $3
                OR metadata->>'paymentId' = $3
                OR (
                  COALESCE(metadata->>'resource_type', metadata->>'resourceType') = 'payment'
                  AND COALESCE(metadata->>'resource_id', metadata->>'resourceId') = $3
                )
              )
            )
          )
        RETURNING id
      `,
      [
        user.id,
        resourceType,
        resourceId,
      ],
    )

    return NextResponse.json({
      success: true,
      updated: result.rowCount || result.rows.length,
      ids: result.rows.map((row) => row.id),
    })
  } catch (error) {
    console.error("NOTIFICATION RESOURCE READ ERROR", error)

    return NextResponse.json(
      { error: "Failed to mark resource notifications as read" },
      { status: 500 },
    )
  }
}
