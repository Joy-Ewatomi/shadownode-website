import { notFound, redirect } from "next/navigation"

import TrainingShell from "@/components/training/TrainingShell"
import TrainingCertificate from "@/components/training/TrainingCertificate"

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

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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
   */

  const engRes = await query(
    `
      SELECT
        id,
        engagement_number,
        status,
        progress,
        training_goal,
        client_profile_id
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
  }

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
          recipient_name,
          training_title,
          training_type,
          trainer_name,
          completion_date,
          issued_at,
          verification_url
        FROM training_certificates
        WHERE training_engagement_id = $1
        ORDER BY issued_at DESC NULLS LAST
        LIMIT 1
      `,
      [id],
    )

  const rawCertificate =
    certificateRes.rows[0] as
      | Record<string, unknown>
      | undefined

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
    engagementNumber={engagement.engagement_number}
    title="Certificate"
    status={engagement.status}
  >
    {/* Scrollable wrapper – works on every screen size */}
    <div className="certificate-scroll-wrapper">
      <div className="certificate-page-container">
        <TrainingCertificate
          certificate={certificate}
          engagementId={id}
          userRole={user.role}
          canIssueCertificate={canIssueCertificate}
          progress={engagement.progress}
          trainingStatus={engagement.status}
          feedbackSubmitted={feedbackSubmitted}
          trainingTitle={engagement.training_goal}
          trainerName={
            certificate?.trainer_name || "ShadowNode Training Facilitator"
          }
          completionDate={certificate?.completion_date || null}
          feedbackRating={feedbackRating}
          feedbackComments={feedbackComments}
          certificateRecipientName={certificateRecipientName}
        />
      </div>
    </div>

    <style>{`
      /* ========== SCREEN VIEW ========== */
      .certificate-scroll-wrapper {
        width: 100%;
        max-height: calc(100vh - 180px);   /* adjust if your header is taller/shorter */
        overflow: auto;                    /* scroll left/right + up/down */
        border-radius: 12px;
        background: #0a0f0d;
        padding: 1.5rem;
      }

      .certificate-page-container {
        min-width: 1100px;                 /* keeps the certificate from shrinking too much */
        width: 100%;
        display: flex;
        justify-content: center;
      }

      .certificate-page-container #training-certificate {
        width: 100%;
        max-width: 1400px;
      }

      /* ========== PRINT / PDF ========== */
      @media print {
        .certificate-scroll-wrapper {
          max-height: none !important;
          overflow: visible !important;
          padding: 0 !important;
          background: transparent !important;
          border-radius: 0 !important;
        }

        .certificate-page-container {
          min-width: 0 !important;
          width: 297mm !important;
          height: 210mm !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .certificate-page-container #training-certificate,
        .certificate-page-container .certificate-page {
          width: 297mm !important;
          height: 210mm !important;
          max-width: none !important;
          max-height: 210mm !important;
          min-height: 0 !important;
          aspect-ratio: auto !important;
          overflow: hidden !important;
        }
      }
    `}</style>
  </TrainingShell>
)
}