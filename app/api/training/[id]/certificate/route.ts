import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"

import {
  ensureAccess,
  requireTrainingOperatorForEngagement,
} from "@/lib/services/training-operations-service"

import {
  issueTrainingCertificate,
} from "@/lib/services/training-completion-service"
import { notifyUser } from "@/lib/services/notification-service"

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
  req: NextRequest,
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

    let body: Record<string, unknown> = {}

    try {
      body =
        (await req.json()) as Record<
          string,
          unknown
        >
    } catch {
      body = {}
    }

    const participantId =
      typeof body.participant_id ===
      "string"
        ? body.participant_id.trim()
        : null

    const issueAll =
      body.issue_all === true

    /* ========================================================
       3. ISSUE THROUGH CERTIFICATE SERVICE
       ======================================================== */

    if (issueAll) {
      const participantResult =
        await query<{
          id: string
        }>(
          `
            SELECT id
            FROM training_participants
            WHERE training_engagement_id = $1
              AND certificate_eligible = true
              AND status <> 'inactive'
              AND NOT EXISTS (
                SELECT 1
                FROM training_certificates
                WHERE training_certificates.training_participant_id = training_participants.id
              )
            ORDER BY created_at ASC
          `,
          [id],
        )

      if (
        participantResult.rows.length ===
        0
      ) {
        return NextResponse.json(
          {
            error:
              "No eligible certificate participants were found.",
          },
          {
            status: 400,
          },
        )
      }

      const issued = []

      for (const participant of participantResult.rows) {
        issued.push(
          await issueTrainingCertificate(
            id,
            participant.id,
            {
              notifyClient: false,
            },
          ),
        )
      }

      const notificationTarget =
        await query<{
          user_id: string | null
          training_goal: string | null
          training_organization_name: string | null
        }>(
          `
            SELECT
              up.user_id,
              te.training_goal,
              te.training_organization_name
            FROM training_engagements te
            JOIN user_profiles up
              ON up.id = te.client_profile_id
            WHERE te.id = $1
            LIMIT 1
          `,
          [id],
        )

      const notificationRow =
        notificationTarget.rows[0]

      if (notificationRow?.user_id) {
        await notifyUser(
          notificationRow.user_id,
          {
            type: "certificate_issued",
            title:
              "Training certificates issued",
            message: `${issued.length} training certificate${
              issued.length === 1 ? "" : "s"
            } have been issued.`,
            metadata: {
              training_engagement_id: id,
              certificate_count:
                issued.length,
              certificate_ids:
                issued.map(
                  (certificate) =>
                    certificate.certificate_id,
                ),
              organization_name:
                notificationRow.training_organization_name,
              resource_type:
                "certificate",
              resource_id: id,
              target_page:
                "client_training_certificate",
              destination: "/dashboard/client/certificates",
              action:
                "view_certificates",
            },
          },
        )
      }

      return NextResponse.json(
        {
          success: true,
          certificates:
            issued,
          count:
            issued.length,
        },
        {
          status: 200,
        },
      )
    }

    const result =
      await issueTrainingCertificate(
        id,
        participantId,
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
            training_participant_id,
            recipient_name,
            organization_name,
            training_title,
            training_type,
            trainer_name,
            completion_date,
            issued_at,
            verification_url,
            pdf_url,
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

        training_participant_id:
          toNullableString(
            certificate.training_participant_id,
          ),

        recipient_name:
          toNullableString(
            certificate.recipient_name,
          ),

        organization_name:
          toNullableString(
            certificate.organization_name,
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

        pdf_url:
          toNullableString(
            certificate.pdf_url,
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
