import { randomUUID } from "crypto"

import { query } from "@/lib/db"

type CompleteTrainingResult = {
  success: boolean
  engagement_id: string
  status: string
  feedback_required: boolean
  certificate_id?: string
  certificate_number?: string
}

type TrainingEngagementRow = {
  id: string
  request_id: string | null
  organization_id: string
  client_profile_id: string
  assigned_trainer: string | null

  pending_trainer_id: string | null
  trainer_approval_status: string | null
  trainer_approval_requested_by: string | null
  trainer_approval_approved_by: string | null

  progress: number | null
  status: string | null

  training_organization_name: string | null
  training_client_type: string | null
  skill_level: string | null
  training_goal: string | null
  training_topics: string | null
}

type RequestRow = {
  title: string | null
  service_type: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
}

type FeedbackRow = {
  id: string
}

type CertificateRow = {
  id: string
  certificate_number: string
}

/* ============================================================
   ROLE HELPERS
   ============================================================ */

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

/* ============================================================
   COMPLETE TRAINING ENGAGEMENT
   ============================================================ */

/**
 * Completing training is deliberately separate from
 * certificate issuance.
 *
 * Completion requires:
 *
 *   progress >= 100%
 *   approved trainer OR Super Administrator
 *
 * After completion:
 *
 *   feedback_required = true
 *
 * Certificate issuance happens later.
 */
export async function completeTrainingEngagement(
  engagementId: string,
  actorProfileId: string,
  actorRole: string,
): Promise<CompleteTrainingResult> {
  if (!engagementId?.trim()) {
    throw new Error(
      "Training engagement ID is required",
    )
  }

  if (!actorProfileId?.trim()) {
    throw new Error(
      "Actor profile ID is required",
    )
  }

  await query("BEGIN")

  try {
    /* ========================================================
       1. LOCK ENGAGEMENT
       ======================================================== */

    const engagementResult =
      await query<TrainingEngagementRow>(
        `
        SELECT
          id,
          request_id,
          organization_id,
          client_profile_id,

          assigned_trainer,

          pending_trainer_id,
          trainer_approval_status,
          trainer_approval_requested_by,
          trainer_approval_approved_by,

          progress,
          status,

          training_organization_name,
          training_client_type,
          skill_level,
          training_goal,
          training_topics

        FROM training_engagements

        WHERE id = $1

        FOR UPDATE
        LIMIT 1
        `,
        [engagementId],
      )

    const engagement =
      engagementResult.rows[0]

    if (!engagement) {
      throw new Error(
        "Training engagement not found",
      )
    }

    /* ========================================================
       2. VERIFY AUTHORITY
       ======================================================== */

    const isSuperAdmin =
      isSuperAdminRole(actorRole)

    /*
     * Super Administrator can complete any training
     * engagement.
     *
     * Everyone else must be the currently approved
     * assigned trainer.
     */
    if (!isSuperAdmin) {
      if (
        !engagement.assigned_trainer ||
        engagement.trainer_approval_status !==
          "approved"
      ) {
        throw new Error(
          "Training engagement has no approved trainer assigned",
        )
      }

      if (
        engagement.assigned_trainer !==
        actorProfileId
      ) {
        throw new Error(
          "Only the approved assigned trainer or Super Administrator can complete this training",
        )
      }
    }

    /* ========================================================
       3. VERIFY PROGRESS
       ======================================================== */

    const progress =
      Number(
        engagement.progress ?? 0,
      )

    if (
      !Number.isFinite(progress) ||
      progress < 100
    ) {
      throw new Error(
        "Training cannot be completed until progress reaches 100%",
      )
    }

    /* ========================================================
       4. IDEMPOTENCY
       ======================================================== */

    if (
      engagement.status === "completed"
    ) {
      await query("COMMIT")

      return {
        success: true,
        engagement_id:
          engagement.id,
        status: "completed",
        feedback_required: true,
      }
    }

    /* ========================================================
       5. COMPLETE ENGAGEMENT
       ======================================================== */

    await query(
      `
      UPDATE training_engagements

      SET
        status = 'completed',
        progress = 100,

        completed_at =
          COALESCE(
            completed_at,
            NOW()
          ),

        updated_at = NOW()

      WHERE id = $1
      `,
      [engagement.id],
    )

    /* ========================================================
       6. ACTIVITY
       ======================================================== */

    await query(
      `
      INSERT INTO training_updates (
        training_engagement_id,
        updated_by,
        update_type,
        title,
        content
      )

      VALUES (
        $1,
        $2,
        'completion',
        'Training Completed',
        'Training requirements have been completed. Client feedback is required before the certificate can be issued.'
      )
      `,
      [
        engagement.id,
        actorProfileId,
      ],
    )

    /* ========================================================
       7. COMMIT
       ======================================================== */

    await query("COMMIT")

    return {
      success: true,
      engagement_id:
        engagement.id,
      status: "completed",
      feedback_required: true,
    }
  } catch (error) {
    await query("ROLLBACK")
    throw error
  }
}

/* ============================================================
   ISSUE TRAINING CERTIFICATE
   ============================================================ */

/**
 * Certificate issuance is intentionally kept here.
 *
 * REQUIREMENTS:
 *
 * 1. Training must be completed.
 * 2. Mandatory client feedback must exist.
 * 3. Only one certificate can exist for an engagement.
 *
 * This function creates the certificate record and
 * verification identity.
 *
 * Rendering/downloading the visual certificate belongs
 * to the frontend layer.
 */
export async function issueTrainingCertificate(
  engagementId: string,
): Promise<{
  certificate_id: string
  certificate_number: string
}> {
  if (!engagementId?.trim()) {
    throw new Error(
      "Training engagement ID is required",
    )
  }

  await query("BEGIN")

  try {
    /* ========================================================
       1. LOCK ENGAGEMENT
       ======================================================== */

    const engagementResult =
      await query<TrainingEngagementRow>(
        `
        SELECT
          id,
          request_id,
          organization_id,
          client_profile_id,

          assigned_trainer,
          pending_trainer_id,
          trainer_approval_status,
          trainer_approval_requested_by,
          trainer_approval_approved_by,

          progress,
          status,

          training_organization_name,
          training_client_type,
          skill_level,
          training_goal,
          training_topics

        FROM training_engagements

        WHERE id = $1

        FOR UPDATE
        LIMIT 1
        `,
        [engagementId],
      )

    const engagement =
      engagementResult.rows[0]

    if (!engagement) {
      throw new Error(
        "Training engagement not found",
      )
    }

    /* ========================================================
       2. MUST BE COMPLETED
       ======================================================== */

    if (
      engagement.status !==
      "completed"
    ) {
      throw new Error(
        "Training must be completed before a certificate can be issued",
      )
    }

    if (
      Number(
        engagement.progress ?? 0,
      ) < 100
    ) {
      throw new Error(
        "Training progress must be 100% before a certificate can be issued",
      )
    }

    /* ========================================================
       3. VERIFY FEEDBACK
       ======================================================== */

    const feedbackResult =
      await query<FeedbackRow>(
        `
        SELECT
          id

        FROM training_feedback

        WHERE training_engagement_id = $1
          AND client_profile_id = $2

        LIMIT 1
        `,
        [
          engagement.id,
          engagement.client_profile_id,
        ],
      )

    const feedback =
      feedbackResult.rows[0]

    if (!feedback) {
      throw new Error(
        "Client feedback is required before the certificate can be issued",
      )
    }

    /* ========================================================
       4. DUPLICATE PROTECTION
       ======================================================== */

    const existingCertificate =
      await query<CertificateRow>(
        `
        SELECT
          id,
          certificate_number

        FROM training_certificates

        WHERE training_engagement_id = $1

        LIMIT 1
        `,
        [engagement.id],
      )

    if (
      existingCertificate.rows[0]
    ) {
      await query("COMMIT")

      return {
        certificate_id:
          existingCertificate
            .rows[0]
            .id,

        certificate_number:
          existingCertificate
            .rows[0]
            .certificate_number,
      }
    }

    /* ========================================================
       5. CLIENT
       ======================================================== */

    const clientProfileResult =
      await query<ProfileRow>(
        `
        SELECT
          id,
          full_name

        FROM user_profiles

        WHERE id = $1

        LIMIT 1
        `,
        [
          engagement.client_profile_id,
        ],
      )

    const clientProfile =
      clientProfileResult.rows[0]

    if (!clientProfile) {
      throw new Error(
        "Client profile not found",
      )
    }

    const recipientName =
      clientProfile.full_name?.trim()

    if (!recipientName) {
      throw new Error(
        "Client profile does not have a valid name for certificate issuance",
      )
    }

    /* ========================================================
       6. TRAINER
       ======================================================== */

    let trainerName:
      | string
      | null = null

    if (
      engagement.assigned_trainer
    ) {
      const trainerResult =
        await query<ProfileRow>(
          `
          SELECT
            id,
            full_name

          FROM user_profiles

          WHERE id = $1

          LIMIT 1
          `,
          [
            engagement.assigned_trainer,
          ],
        )

      trainerName =
        trainerResult.rows[0]
          ?.full_name?.trim() ||
        null
    }

    /* ========================================================
       7. ORIGINAL REQUEST
       ======================================================== */

    let trainingTitle =
      engagement.training_goal?.trim() ||
      "Cybersecurity Training"

    let trainingType:
      | string
      | null = null

    if (
      engagement.request_id
    ) {
      const requestResult =
        await query<RequestRow>(
          `
          SELECT
            title,
            service_type

          FROM requests

          WHERE id = $1

          LIMIT 1
          `,
          [
            engagement.request_id,
          ],
        )

      const request =
        requestResult.rows[0]

      if (
        request?.title?.trim()
      ) {
        trainingTitle =
          request.title.trim()
      }

      trainingType =
        request?.service_type?.trim() ||
        null
    }

    /* ========================================================
       8. CERTIFICATE NUMBER
       ======================================================== */

    const year =
      new Date().getFullYear()

    const certificateNumber =
      `SOB-CERT-${year}-${Date.now()}`

    /* ========================================================
       9. VERIFICATION IDENTITY
       ======================================================== */

    const verificationToken =
      randomUUID()

    const baseUrl =
      (
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        ""
      ).replace(/\/$/, "")

    const verificationUrl =
      baseUrl
        ? `${baseUrl}/verify/certificate/${verificationToken}`
        : null

    /* ========================================================
       10. CREATE CERTIFICATE RECORD
       ======================================================== */

    const certificateResult =
      await query<CertificateRow>(
        `
        INSERT INTO training_certificates (
          training_engagement_id,
          client_profile_id,

          certificate_number,
          recipient_name,

          training_title,
          training_type,
          trainer_name,

          completion_date,
          issued_at,

          verification_token,
          verification_url,

          status,

          created_at,
          updated_at
        )

        VALUES (
          $1,
          $2,

          $3,
          $4,

          $5,
          $6,
          $7,

          CURRENT_DATE,
          NOW(),

          $8,
          $9,

          'issued',

          NOW(),
          NOW()
        )

        RETURNING
          id,
          certificate_number
        `,
        [
          engagement.id,
          engagement.client_profile_id,

          certificateNumber,
          recipientName,

          trainingTitle,
          trainingType,
          trainerName,

          verificationToken,
          verificationUrl,
        ],
      )

    const certificate =
      certificateResult.rows[0]

    if (!certificate) {
      throw new Error(
        "Certificate creation returned no certificate",
      )
    }

    /* ========================================================
       11. ACTIVITY
       ======================================================== */

    await query(
      `
      INSERT INTO training_updates (
        training_engagement_id,
        updated_by,
        update_type,
        title,
        content
      )

      VALUES (
        $1,
        $2,
        'certificate_issued',
        'Certificate Issued',
        $3
      )
      `,
      [
        engagement.id,
        null,
        `Certificate of Completion ${certificate.certificate_number} has been issued.`,
      ],
    )

    /* ========================================================
       12. COMMIT
       ======================================================== */

    await query("COMMIT")

    return {
      certificate_id:
        certificate.id,

      certificate_number:
        certificate.certificate_number,
    }
  } catch (error) {
    await query("ROLLBACK")
    throw error
  }
}