import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"

import {
  ensureAccess,
  requireTrainingOperatorForEngagement,
} from "@/lib/services/training-operations-service"

import {
  issueTrainingCertificate,
} from "@/lib/services/training-completion-service"

import { query } from "@/lib/db"

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function toNullableString(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  const result =
    String(value).trim()

  return result || null
}

export async function POST(
  _req: NextRequest,
  context: {
    params: Promise<{ id: string }>
  },
) {
  const user =
    await getCurrentUser()

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    )
  }

  try {
    const { id } =
      await context.params

    if (!id?.trim()) {
      return NextResponse.json(
        {
          error:
            "Training engagement ID is required",
        },
        {
          status: 400,
        },
      )
    }

    /* ========================================================
       1. ENGAGEMENT ACCESS
       ======================================================== */

    const access =
      await ensureAccess(
        id,
        user,
        false,
      )

    /* ========================================================
       2. CERTIFICATE AUTHORITY
       ======================================================== */

    if (
      !isSuperAdminRole(
        user.role,
      )
    ) {
      await requireTrainingOperatorForEngagement(
        id,
        user,
        access.profileId,
      )
    }

    /* ========================================================
       3. ISSUE THROUGH EXISTING
          CERTIFICATE SERVICE
       ======================================================== */

    const result =
      await issueTrainingCertificate(
        id,
      )

    /* ========================================================
       4. LOAD THE ACTUAL CERTIFICATE RECORD
       ========================================================
       
       The completion service remains authoritative.

       We do not generate or replace any certificate data
       here. We simply return the exact row that was created.
       This gives the frontend the real verification URL,
       recipient, trainer, dates, title, etc.
       ======================================================== */

    const certificateResult =
      await query(
        `
          SELECT
            id,
            certificate_number,
            recipient_name,
            training_title,
            training_type,
            trainer_name,
            completion_date,
            issued_at,
            verification_url,
            status
          FROM training_certificates
          WHERE id = $1
            AND training_engagement_id = $2
          LIMIT 1
        `,
        [
          result.certificate_id,
          id,
        ],
      )

    const certificate =
      certificateResult.rows[0] as
        | Record<string, unknown>
        | undefined

    if (!certificate) {
      throw new Error(
        "Certificate was issued but could not be loaded",
      )
    }

    /* ========================================================
       5. RETURN COMPLETE CERTIFICATE
       ======================================================== */

    return NextResponse.json(
      {
        success: true,

        certificate_id:
          toNullableString(
            certificate.id,
          ),

        certificate_number:
          toNullableString(
            certificate.certificate_number,
          ),

        recipient_name:
          toNullableString(
            certificate.recipient_name,
          ),

        training_title:
          toNullableString(
            certificate.training_title,
          ),

        training_type:
          toNullableString(
            certificate.training_type,
          ),

        trainer_name:
          toNullableString(
            certificate.trainer_name,
          ),

        completion_date:
          certificate.completion_date
            ? String(
                certificate.completion_date,
              )
            : null,

        issued_at:
          certificate.issued_at
            ? String(
                certificate.issued_at,
              )
            : null,

        verification_url:
          toNullableString(
            certificate.verification_url,
          ),

        status:
          toNullableString(
            certificate.status,
          ),
      },
      {
        status: 200,
      },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING CERTIFICATE ERROR:",
      error,
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to issue training certificate"

    const normalized =
      message.toLowerCase()

    let status = 400

    if (
      normalized.includes(
        "unauthorized",
      )
    ) {
      status = 401
    }

    if (
      normalized.includes(
        "not authorized",
      ) ||
      normalized.includes(
        "not the approved trainer",
      ) ||
      normalized.includes(
        "forbidden",
      )
    ) {
      status = 403
    }

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      },
    )
  }
}