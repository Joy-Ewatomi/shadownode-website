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

/**
 * ============================================================
 * COMPLETE TRAINING ENGAGEMENT
 * ============================================================
 *
 * This function intentionally does NOT issue a certificate.
 *
 * Completing training means:
 *
 *     progress = 100
 *     status   = completed
 *
 * Certificate issuance happens only after mandatory feedback
 * has been submitted.
 */
export async function completeTrainingEngagement(
  engagementId: string,
  actorProfileId: string,
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
    // ========================================================
    // 1. LOCK TRAINING ENGAGEMENT
    // ========================================================

    const engagementResult =
      await query<TrainingEngagementRow>(
        `
        SELECT
          id,
          request_id,
          organization_id,
          client_profile_id,
          assigned_trainer,
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

    // ========================================================
    // 2. VERIFY ACTOR
    // ========================================================
    //
    // Only the assigned trainer should be able to mark the
    // training completed.
    //
    // We also allow the client profile to be the actor only
    // if the surrounding application explicitly decides to
    // support client completion confirmation later.
    //
    // For now, completion belongs to the assigned trainer.
    // ========================================================

    if (
      !engagement.assigned_trainer
    ) {
      throw new Error(
        "Training engagement has no assigned trainer",
      )
    }

    if (
      engagement.assigned_trainer !==
      actorProfileId
    ) {
      throw new Error(
        "Only the assigned trainer can complete this training",
      )
    }

    // ========================================================
    // 3. VERIFY PROGRESS
    // ========================================================

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

    // ========================================================
    // 4. IDEMPOTENCY
    // ========================================================

    if (
      engagement.status ===
      "completed"
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

    // ========================================================
    // 5. MARK TRAINING COMPLETED
    // ========================================================

    await query(
      `
      UPDATE training_engagements
      SET
        status = 'completed',
        progress = 100,
        completed_at = COALESCE(
          completed_at,
          NOW()
        ),
        updated_at = NOW()
      WHERE id = $1
      `,
      [engagement.id],
    )

    // ========================================================
    // 6. CREATE TRAINING TIMELINE EVENT
    // ========================================================

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

    // ========================================================
    // 7. COMMIT
    // ========================================================

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

/**
 * ============================================================
 * ISSUE TRAINING CERTIFICATE
 * ============================================================
 *
 * Certificate issuance is deliberately separated from
 * training completion.
 *
 * REQUIREMENTS:
 *
 * 1. Training must be completed.
 * 2. Mandatory client feedback must exist.
 * 3. Only one certificate may exist per engagement.
 *
 * This makes feedback genuinely compulsory.
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
    // ========================================================
    // 1. LOCK ENGAGEMENT
    // ========================================================

    const engagementResult =
      await query<TrainingEngagementRow>(
        `
        SELECT
          id,
          request_id,
          organization_id,
          client_profile_id,
          assigned_trainer,
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

    // ========================================================
    // 2. MUST BE COMPLETED
    // ========================================================

    if (
      engagement.status !==
      "completed"
    ) {
      throw new Error(
        "Training must be completed before a certificate can be issued",
      )
    }

    // ========================================================
    // 3. VERIFY MANDATORY FEEDBACK
    // ========================================================

    const feedbackResult =
      await query<FeedbackRow>(
        `
        SELECT
          id
        FROM training_feedback
        WHERE training_engagement_id = $1
        LIMIT 1
        `,
        [engagement.id],
      )

    const feedback =
      feedbackResult.rows[0]

    if (!feedback) {
      throw new Error(
        "Client feedback is required before the certificate can be issued",
      )
    }

    // ========================================================
    // 4. PREVENT DUPLICATE CERTIFICATE
    // ========================================================

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
            .rows[0].id,
        certificate_number:
          existingCertificate
            .rows[0]
            .certificate_number,
      }
    }

    // ========================================================
    // 5. LOAD CLIENT PROFILE
    // ========================================================

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

    // ========================================================
    // 6. LOAD TRAINER
    // ========================================================

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

    // ========================================================
    // 7. LOAD ORIGINAL REQUEST
    // ========================================================

    let trainingTitle =
      engagement.training_goal?.trim() ||
      "Professional Training"

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

    // ========================================================
    // 8. CERTIFICATE NUMBER
    // ========================================================

    const year =
      new Date().getFullYear()

    const certificateNumber =
      `SOB-CERT-${year}-${Date.now()}`

    // ========================================================
    // 9. VERIFICATION TOKEN
    // ========================================================

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

    // ========================================================
    // 10. CREATE CERTIFICATE
    // ========================================================

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

    // ========================================================
    // 11. TRAINING TIMELINE
    // ========================================================

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
        NULL,
        'certificate_issued',
        'Certificate Issued',
        $2
      )
      `,
      [
        engagement.id,
        `Certificate of Completion ${certificate.certificate_number} has been issued.`,
      ],
    )

    // ========================================================
    // 12. COMMIT
    // ========================================================

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