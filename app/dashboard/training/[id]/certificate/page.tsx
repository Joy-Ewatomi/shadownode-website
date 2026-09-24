import { notFound, redirect } from "next/navigation"

import TrainingShell from "@/components/training/TrainingShell"
import TrainingCertificate from "@/components/training/TrainingCertificate"
import MarkResourceNotificationsRead from "@/components/notifications/MarkResourceNotificationsRead"

import { getCurrentUser } from "@/lib/auth"
import {
  ensureAccess,
  isApprovedTrainerForEngagement,
} from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function toNumber(
  value: unknown,
  fallback = 0,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback
  }

  const numeric = Number(value)

  return Number.isFinite(numeric)
    ? numeric
    : fallback
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

  const result = String(value).trim()

  return result || null
}

function toUuidOrNull(
  value: string | null | undefined,
) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    trimmed,
  )
    ? trimmed
    : null
}

export default async function CertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    certificateId?: string
    participantId?: string
    print?: string
  }>
}) {
  const { id } = await params
  const resolvedSearchParams =
    searchParams
      ? await searchParams
      : {}
  const selectedCertificateId =
    toUuidOrNull(
      resolvedSearchParams.certificateId,
    )
  const selectedParticipantId =
    toUuidOrNull(
      resolvedSearchParams.participantId,
    )

  const user = await getCurrentUser()

  if (!user) {
    return redirect("/login")
  }

  /*
   * ============================================================
   * TRAINING ACCESS
   * ============================================================
   */

  let access

  try {
    access = await ensureAccess(
      id,
      user,
      false,
    )
  } catch {
    return notFound()
  }

  /*
   * ============================================================
   * LOAD ENGAGEMENT
   * ============================================================
   *
   * preferred_start_date and preferred_completion_date are the
   * client-selected training timeline values carried from the
   * original training request into the engagement.
   *
   * They are used by the certificate to calculate the training
   * duration and to provide the authoritative completion date
   * for certificate issuance.
   * ============================================================
   */

  const engRes = await query(
    `
      SELECT
        id,
        engagement_number,
        status,
        progress,
        training_goal,
        client_profile_id,
        training_client_type,
        training_organization_name,
        participant_count,
        preferred_start_date,
        preferred_completion_date
      FROM training_engagements
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  )

  const rawEngagement =
    engRes.rows[0] as
      | Record<string, unknown>
      | undefined

  if (!rawEngagement) {
    return notFound()
  }

  const engagement = {
    id:
      toNullableString(
        rawEngagement.id,
      ) || id,

    engagement_number:
      toNullableString(
        rawEngagement.engagement_number,
      ) || id,

    status:
      toNullableString(
        rawEngagement.status,
      ) || "unknown",

    progress:
      toNumber(
        rawEngagement.progress,
        0,
      ),

    training_goal:
      toNullableString(
        rawEngagement.training_goal,
      ),

    client_profile_id:
      toNullableString(
        rawEngagement.client_profile_id,
      ),

    training_client_type:
      toNullableString(
        rawEngagement.training_client_type,
      ),

    training_organization_name:
      toNullableString(
        rawEngagement.training_organization_name,
      ),

    participant_count:
      toNumber(
        rawEngagement.participant_count,
        1,
      ),

    preferred_start_date:
      toNullableString(
        rawEngagement.preferred_start_date,
      ),

    preferred_completion_date:
      toNullableString(
        rawEngagement.preferred_completion_date,
      ),
  }

  const participantsResult =
    await query(
      `
        SELECT
          tp.id,
          tp.full_name,
          tp.email,
          tp.certificate_name,
          tp.organization_name,
          tp.status,
          tp.certificate_eligible,
          tc.id AS certificate_id,
          tc.certificate_number,
          tc.status AS certificate_status,
          tc.issued_at AS certificate_issued_at
        FROM training_participants tp
        LEFT JOIN training_certificates tc
          ON tc.training_participant_id = tp.id
        WHERE tp.training_engagement_id = $1
        ORDER BY tp.created_at ASC
      `,
      [id],
    )

  const participants =
    participantsResult.rows.map(
      (participant) => ({
        id:
          toNullableString(
            participant.id,
          ) || "",
        full_name:
          toNullableString(
            participant.full_name,
          ) || "",
        email:
          toNullableString(
            participant.email,
          ),
        certificate_name:
          toNullableString(
            participant.certificate_name,
          ) || "",
        organization_name:
          toNullableString(
            participant.organization_name,
          ),
        status:
          toNullableString(
            participant.status,
          ),
        certificate_eligible:
          participant.certificate_eligible ===
          true,
        certificate_id:
          toNullableString(
            participant.certificate_id,
          ),
        certificate_number:
          toNullableString(
            participant.certificate_number,
          ),
        certificate_status:
          toNullableString(
            participant.certificate_status,
          ),
        certificate_issued_at:
          toNullableString(
            participant.certificate_issued_at,
          ),
      }),
    )

  /*
   * ============================================================
   * LOAD EXISTING CERTIFICATE
   * ============================================================
   */

  const certificateRes =
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
          pdf_url
        FROM training_certificates
        WHERE training_engagement_id = $1
          AND (
            $2::uuid IS NULL
            OR id = $2::uuid
          )
          AND (
            $3::uuid IS NULL
            OR training_participant_id = $3::uuid
          )
        ORDER BY issued_at DESC NULLS LAST
        LIMIT 1
      `,
      [
        id,
        selectedCertificateId,
        selectedParticipantId,
      ],
    )

  const rawCertificate =
    certificateRes.rows[0] as
      | Record<string, unknown>
      | undefined

  if (
    (selectedCertificateId || selectedParticipantId) &&
    !rawCertificate
  ) {
    return notFound()
  }

  const certificate =
    rawCertificate
      ? {
          id:
            toNullableString(
              rawCertificate.id,
            ) || "",

          certificate_number:
            toNullableString(
              rawCertificate.certificate_number,
            ) || "",

          recipient_name:
            toNullableString(
              rawCertificate.recipient_name,
            ),

          training_participant_id:
            toNullableString(
              rawCertificate.training_participant_id,
            ),

          organization_name:
            toNullableString(
              rawCertificate.organization_name,
            ),

          training_title:
            toNullableString(
              rawCertificate.training_title,
            ),

          training_type:
            toNullableString(
              rawCertificate.training_type,
            ),

          trainer_name:
            toNullableString(
              rawCertificate.trainer_name,
            ),

          completion_date:
            toNullableString(
              rawCertificate.completion_date,
            ),

          issued_at:
            toNullableString(
              rawCertificate.issued_at,
            ),

          verification_url:
            toNullableString(
              rawCertificate.verification_url,
            ),

          pdf_url:
            toNullableString(
              rawCertificate.pdf_url,
            ),
        }
      : null

  /*
   * ============================================================
   * LOAD CLIENT FEEDBACK
   * ============================================================
   *
   * The certificate recipient name comes from the name the
   * client entered specifically for the Certificate of Completion.
   *
   * Username/nickname is NOT used here.
   * ============================================================
   */

  let feedbackSubmitted = false

  let feedbackRating:
    | number
    | null = null

  let feedbackComments:
    | string
    | null = null

  let certificateRecipientName:
    | string
    | null = null

  if (
    engagement.client_profile_id
  ) {
    const feedbackRes =
      await query(
        `
          SELECT
            rating,
            feedback,
            certificate_recipient_name,
            submitted_at,
            created_at
          FROM training_feedback
          WHERE training_engagement_id = $1
            AND client_profile_id = $2
          ORDER BY
            submitted_at DESC NULLS LAST,
            created_at DESC
          LIMIT 1
        `,
        [
          id,
          engagement.client_profile_id,
        ],
      )

    const rawFeedback =
      feedbackRes.rows[0] as
        | Record<string, unknown>
        | undefined

    if (rawFeedback) {
      feedbackSubmitted = true

      feedbackRating =
        rawFeedback.rating !== null &&
        rawFeedback.rating !== undefined
          ? toNumber(
              rawFeedback.rating,
              0,
            )
          : null

      feedbackComments =
        toNullableString(
          rawFeedback.feedback,
        )

      certificateRecipientName =
        toNullableString(
          rawFeedback.certificate_recipient_name,
        )
    }
  }

  /*
   * ============================================================
   * CERTIFICATE ISSUANCE PERMISSION
   * ============================================================
   */

  let canIssueCertificate = false

  if (
    isSuperAdminRole(
      user.role,
    )
  ) {
    canIssueCertificate = true
  } else {
    canIssueCertificate =
      await isApprovedTrainerForEngagement(
        id,
        user,
        access.profileId,
      )
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <TrainingShell
      user={user}
      engagementId={id}
      engagementNumber={
        engagement.engagement_number
      }
      title="Certificate"
      status={engagement.status}
    >
     <MarkResourceNotificationsRead
       resourceType="certificate"
       resourceId={
         certificate?.id || null
       }
     />
     <div className="certificate-screen-scroll w-full overflow-auto rounded-xl">
       <div className="certificate-screen-canvas min-w-[1100px] p-2">
   <TrainingCertificate
            certificate={certificate}
            engagementId={id}
            userRole={user.role}
            canIssueCertificate={
              canIssueCertificate
            }
            progress={
              engagement.progress
            }
            trainingStatus={
              engagement.status
            }
            feedbackSubmitted={
              feedbackSubmitted
            }
            trainingTitle={
              engagement.training_goal
            }


            /*
             * Existing issued certificate takes precedence
             * for the displayed stored completion date.
             */
            completionDate={
              certificate?.completion_date ||
              engagement.preferred_completion_date ||
              null
            }

            /*
             * Client-selected training dates.
             * TrainingCertificate uses these to calculate the
             * displayed duration.
             */
            startDate={
              engagement.preferred_start_date
            }

            feedbackRating={
              feedbackRating
            }

            feedbackComments={
              feedbackComments
            }

            certificateRecipientName={
              certificateRecipientName
            }
            organizationName={
              certificate?.organization_name ||
              engagement.training_organization_name
            }
            participants={
              participants
            }
          />
        </div>
      </div>
    </TrainingShell>
  )
}
