import { randomUUID } from "crypto"

import { query } from "@/lib/db"
import { notifyUser } from "@/lib/services/notification-service"

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

  /*
   * Client-selected training timeline.
   *
   * These are the authoritative dates for the planned
   * training window and certificate completion date.
   */
  preferred_start_date: string | null
  preferred_completion_date: string | null
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
  certificate_recipient_name: string | null
}

type CertificateRow = {
  id: string
  certificate_number: string
}

type TrainingParticipantRow = {
  id: string
  training_engagement_id: string
  client_profile_id: string
  full_name: string
  email: string | null
  certificate_name: string
  organization_name: string | null
  status: string | null
  completed_at: string | null
  certificate_eligible: boolean
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
            training_topics,

            preferred_start_date,
            preferred_completion_date

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

    const progress = Number(
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

          completed_at = COALESCE(
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
 * 2. Training progress must be 100%.
 * 3. Mandatory client feedback must exist.
 * 4. Client must provide a certificate recipient name.
 * 5. Training completion date must exist.
 * 6. Only one certificate can exist for an engagement.
 *
 * Certificate recipient name:
 *
 *   training_feedback.certificate_recipient_name
 *
 * It does NOT come from the user's username/account name.
 *
 * Certificate completion date:
 *
 *   training_engagements.preferred_completion_date
 *
 * This is the client-selected completion date captured
 * during the original training request.
 *
 * Public trainer designation:
 *
 *   ShadowNode Training Facilitator
 *
 * Internal trainer identity remains in the database elsewhere
 * and is not exposed as "analyst", etc. on the public certificate.
 */
export async function issueTrainingCertificate(
  engagementId: string,
  participantId?: string | null,
  options: {
    notifyClient?: boolean
  } = {},
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
            training_topics,
            preferred_start_date,
            preferred_completion_date
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

    if (engagement.status !== "completed") {
      throw new Error(
        "Training must be completed before a certificate can be issued",
      )
    }

    const progress = Number(
      engagement.progress ?? 0,
    )

    if (!Number.isFinite(progress) || progress < 100) {
      throw new Error(
        "Training progress must be 100% before a certificate can be issued",
      )
    }

    const completionDate =
      engagement.preferred_completion_date?.trim() || ""

    if (!completionDate) {
      throw new Error(
        "Training completion date is not set for this engagement",
      )
    }

    const feedbackResult =
      await query<FeedbackRow>(
        `
          SELECT
            id,
            certificate_recipient_name
          FROM training_feedback
          WHERE training_engagement_id = $1
            AND client_profile_id = $2
          ORDER BY
            submitted_at DESC NULLS LAST,
            created_at DESC
          LIMIT 1
        `,
        [
          engagement.id,
          engagement.client_profile_id,
        ],
      )

    const feedback = feedbackResult.rows[0]

    if (!feedback) {
      throw new Error(
        "Client feedback is required before the certificate can be issued",
      )
    }

    let participant: TrainingParticipantRow | null = null

    if (participantId?.trim()) {
      const participantResult =
        await query<TrainingParticipantRow>(
          `
            SELECT
              id,
              training_engagement_id,
              client_profile_id,
              full_name,
              email,
              certificate_name,
              organization_name,
              status,
              completed_at,
              certificate_eligible
            FROM training_participants
            WHERE id = $1
              AND training_engagement_id = $2
            LIMIT 1
          `,
          [
            participantId,
            engagement.id,
          ],
        )

      participant =
        participantResult.rows[0] || null

      if (!participant) {
        throw new Error(
          "Training participant not found for this engagement",
        )
      }

      if (
        participant.client_profile_id !==
        engagement.client_profile_id
      ) {
        throw new Error(
          "Training participant does not belong to this client engagement",
        )
      }
    }

    if (!participant) {
      const existingParticipant =
        await query<TrainingParticipantRow>(
          `
            SELECT
              id,
              training_engagement_id,
              client_profile_id,
              full_name,
              email,
              certificate_name,
              organization_name,
              status,
              completed_at,
              certificate_eligible
            FROM training_participants
            WHERE training_engagement_id = $1
            ORDER BY created_at ASC
            LIMIT 1
          `,
          [engagement.id],
        )

      participant =
        existingParticipant.rows[0] || null

      if (
        participant &&
        !participantId?.trim()
      ) {
        const participantCount =
          await query<{ count: string }>(
            `
              SELECT COUNT(*)::text AS count
              FROM training_participants
              WHERE training_engagement_id = $1
                AND status <> 'inactive'
            `,
            [engagement.id],
          )

        if (
          Number(
            participantCount.rows[0]?.count || 0,
          ) > 1
        ) {
          throw new Error(
            "Participant ID is required when issuing certificates for an organization training engagement",
          )
        }
      }
    }

    const fallbackRecipientName =
      feedback.certificate_recipient_name?.trim() || ""

    const recipientName =
      (participant?.certificate_name || fallbackRecipientName).trim()

    if (!recipientName) {
      throw new Error(
        "Full Name for Certificate is required before the certificate can be issued",
      )
    }

    if (recipientName.length > 160) {
      throw new Error(
        "Certificate recipient name must be 160 characters or fewer",
      )
    }

    if (!participant) {
      const participantResult =
        await query<TrainingParticipantRow>(
          `
            INSERT INTO training_participants (
              training_engagement_id,
              client_profile_id,
              full_name,
              certificate_name,
              organization_name,
              status,
              completed_at,
              certificate_eligible,
              created_at,
              updated_at
            )
            VALUES (
              $1,
              $2,
              $3,
              $3,
              $4,
              'eligible',
              $5::timestamptz,
              true,
              NOW(),
              NOW()
            )
            ON CONFLICT (
              training_engagement_id,
              lower(certificate_name)
            )
            DO UPDATE SET
              updated_at = NOW()
            RETURNING
              id,
              training_engagement_id,
              client_profile_id,
              full_name,
              email,
              certificate_name,
              organization_name,
              status,
              completed_at,
              certificate_eligible
          `,
          [
            engagement.id,
            engagement.client_profile_id,
            recipientName,
            engagement.training_organization_name,
            completionDate,
          ],
        )

      participant =
        participantResult.rows[0] || null
    }

    if (!participant) {
      throw new Error(
        "Certificate participant could not be prepared",
      )
    }

    const existingCertificate =
      await query<CertificateRow>(
        `
          SELECT
            id,
            certificate_number
          FROM training_certificates
          WHERE training_engagement_id = $1
            AND training_participant_id = $2
          LIMIT 1
        `,
        [
          engagement.id,
          participant.id,
        ],
      )

    if (existingCertificate.rows[0]) {
      await query("COMMIT")

      return {
        certificate_id:
          existingCertificate.rows[0].id,
        certificate_number:
          existingCertificate.rows[0].certificate_number,
      }
    }

    const clientProfileResult =
      await query<ProfileRow & { user_id: string | null }>(
        `
          SELECT
            id,
            full_name,
            user_id
          FROM user_profiles
          WHERE id = $1
          LIMIT 1
        `,
        [engagement.client_profile_id],
      )

    const clientProfile =
      clientProfileResult.rows[0]

    if (!clientProfile) {
      throw new Error("Client profile not found")
    }

    const trainerName =
      "ShadowNode Training Facilitator"

    let trainingTitle =
      engagement.training_goal?.trim() ||
      "Cybersecurity Training"

    let trainingType: string | null = null

    if (engagement.request_id) {
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
          [engagement.request_id],
        )

      const request = requestResult.rows[0]

      if (request?.title?.trim()) {
        trainingTitle = request.title.trim()
      }

      trainingType =
        request?.service_type?.trim() || null
    }

    const year = new Date().getFullYear()
    const certificateNumber =
      `SOB-CERT-${year}-${Date.now()}`

    const verificationToken = randomUUID()
    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      ""
    ).replace(/\/$/, "")

    if (!baseUrl) {
      throw new Error(
        "Certificate verification URL base is not configured",
      )
    }

    const verificationUrl =
      `${baseUrl}/verify/certificate/${verificationToken}`

    const organizationName =
      participant.organization_name ||
      engagement.training_organization_name ||
      null

    const certificateResult =
      await query<CertificateRow>(
        `
          INSERT INTO training_certificates (
            training_engagement_id,
            client_profile_id,
            training_participant_id,
            certificate_number,
            recipient_name,
            organization_name,
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
            $8,
            $9,
            $10,
            NOW(),
            $11,
            $12,
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
          participant.id,
          certificateNumber,
          recipientName,
          organizationName,
          trainingTitle,
          trainingType,
          trainerName,
          completionDate,
          verificationToken,
          verificationUrl,
        ],
      )

    const certificate = certificateResult.rows[0]

    if (!certificate) {
      throw new Error(
        "Certificate creation returned no certificate",
      )
    }

    await query(
      `
        UPDATE training_participants
        SET
          status = 'completed',
          completed_at = COALESCE(completed_at, NOW()),
          certificate_eligible = true,
          updated_at = NOW()
        WHERE id = $1
      `,
      [participant.id],
    )

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
        `Certificate of Completion ${certificate.certificate_number} has been issued for ${recipientName}.`,
      ],
    )

    const shouldNotifyClient =
      options.notifyClient !== false

    if (
      shouldNotifyClient &&
      clientProfile.user_id
    ) {
      await notifyUser(clientProfile.user_id, {
        type: "certificate_issued",
        title: "Training certificate issued",
        message: `Certificate of Completion ${certificate.certificate_number} has been issued for ${recipientName}.`,
        metadata: {
          training_engagement_id: engagement.id,
          certificate_id: certificate.id,
          participant_id: participant.id,
          certificate_number: certificate.certificate_number,
          recipient_name: recipientName,
          organization_name: organizationName,
          resource_type: "certificate",
          resource_id: certificate.id,
          target_page: "client_training_certificate",
          destination: `/dashboard/training/${engagement.id}/certificate?certificateId=${certificate.id}`,
          action: "view_certificate",
        },
      })
    }

    await query("COMMIT")

    return {
      certificate_id: certificate.id,
      certificate_number: certificate.certificate_number,
    }
  } catch (error) {
    await query("ROLLBACK")
    throw error
  }
}
