import { query } from "@/lib/db"
import { notifyUser } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"

export async function convertAcceptedRequestToTrainingEngagement(
  requestId: string,
  actorUserId: string,
) {
  try {
    await query("BEGIN")

    // =========================================================
    // 1. LOAD REQUEST
    // =========================================================

    const current = await query<{
      id: string
      user_id: string | null
      case_number: string | null
      title: string | null
      description: string | null
      service_type: string | null

      approved_quote_amount:
        | number
        | string
        | null

      approved_quote_currency:
        | string
        | null

      approved_estimated_completion:
        | string
        | null

      converted_training_engagement_id:
        | string
        | null

      training_organization_name:
        | string
        | null

      training_client_type:
        | string
        | null

      training_participant_count:
        | number
        | null

      training_skill_level:
        | string
        | null

      training_goal:
        | string
        | null

      training_topics:
        | string
        | null

      training_preferred_dates:
        | string
        | null

      training_additional_requirements:
        | string
        | null

      training_preferred_start_date:
        | string
        | null

      training_preferred_completion_date:
        | string
        | null

      training_timeline_flexible:
        | boolean
        | null

      training_details:
        | Record<string, unknown>
        | null

      status: string | null
    }>(
      `
        SELECT
          id,
          user_id,
          case_number,
          title,
          description,
          service_type,

          approved_quote_amount,
          approved_quote_currency,
          approved_estimated_completion,

          converted_training_engagement_id,

          training_organization_name,
          training_client_type,
          training_participant_count,
          training_skill_level,
          training_goal,
          training_topics,
          training_preferred_dates,
          training_additional_requirements,
          training_preferred_start_date,
          training_preferred_completion_date,
          training_timeline_flexible,
          training_details,

          status

        FROM requests

        WHERE id = $1
          AND user_id = $2

        FOR UPDATE

        LIMIT 1
      `,
      [
        requestId,
        actorUserId,
      ],
    )

    const item = current.rows[0]

    if (!item) {
      throw new Error(
        "Training request not found",
      )
    }

    // =========================================================
    // 2. PREVENT DUPLICATE CONVERSION
    // =========================================================

    if (
      item.converted_training_engagement_id
    ) {
      await query("COMMIT")

      return item.converted_training_engagement_id
    }

    // =========================================================
    // 3. VERIFY REQUEST STATUS
    // =========================================================

    const allowedStatuses = [
      "quote_sent",
      "revised_quote_sent",
      "client_decision_pending",
      "awaiting_client_acceptance",
    ]

    if (
      !item.status ||
      !allowedStatuses.includes(
        item.status,
      )
    ) {
      throw new Error(
        `Request cannot be converted from status: ${
          item.status || "unknown"
        }`,
      )
    }

    // =========================================================
    // 4. VERIFY CLIENT
    // =========================================================

    if (!item.user_id) {
      throw new Error(
        "Training request has no associated client user",
      )
    }

    // =========================================================
    // 5. LOAD CLIENT PROFILE
    //
    // training_engagements.client_profile_id
    // references user_profiles.id.
    // =========================================================

    const profile = await query<{
      id: string
      user_id: string
      organization_id: string | null
    }>(
      `
        SELECT
          id,
          user_id,
          organization_id
        FROM user_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [
        item.user_id,
      ],
    )

    const clientProfile =
      profile.rows[0]

    if (!clientProfile) {
      throw new Error(
        "Client profile not found for training request",
      )
    }

    if (
      clientProfile.user_id !==
      item.user_id
    ) {
      throw new Error(
        "Client profile does not belong to request user",
      )
    }

    // =========================================================
    // 6. ORGANIZATION
    // =========================================================

    let organizationId =
      clientProfile.organization_id

    if (!organizationId) {
      const organization =
        await query<{
          id: string
        }>(
          `
            SELECT
              id
            FROM organizations
            ORDER BY created_at ASC
            LIMIT 1
          `,
        )

      organizationId =
        organization.rows[0]?.id ||
        null
    }

    if (!organizationId) {
      throw new Error(
        "No organization available for training engagement",
      )
    }

    // =========================================================
    // 7. GENERATE ENGAGEMENT NUMBER
    // =========================================================
    //
    // Example:
    //
    // SOB-TRAIN-2026-1756201234567
    //
    // Training engagements have their own numbering system.
    // They are NOT investigation case numbers.
    // =========================================================

    const engagementNumber =
      `SOB-TRAIN-${new Date().getFullYear()}-${Date.now()}`

    const existing =
      await query<{
        id: string
      }>(
        `
          SELECT
            id
          FROM training_engagements
          WHERE engagement_number = $1
          LIMIT 1
        `,
        [
          engagementNumber,
        ],
      )

    if (existing.rows[0]) {
      await query("ROLLBACK")

      return existing.rows[0].id
    }

    // =========================================================
    // 8. NORMALIZE TRAINING DATA
    // =========================================================

    const participantCount =
      item.training_participant_count !==
      null
        ? Number(
            item.training_participant_count,
          )
        : null

    if (
      participantCount !== null &&
      (
        !Number.isFinite(
          participantCount,
        ) ||
        participantCount <= 0
      )
    ) {
      throw new Error(
        "Training participant count is invalid",
      )
    }

    const trainingDetails =
      item.training_details || null

    // =========================================================
    // 9. CREATE TRAINING ENGAGEMENT
    // =========================================================

    const created =
      await query<{
        id: string
      }>(
        `
          INSERT INTO training_engagements (
            organization_id,
            engagement_number,
            request_id,
            client_profile_id,

            training_organization_name,
            training_client_type,
            participant_count,
            skill_level,
            training_goal,
            training_topics,
            preferred_dates,
            additional_requirements,
            preferred_start_date,
            preferred_completion_date,
            timeline_flexible,
            training_details,

            status,
            payment_status,
            assigned_trainer,
            progress,
            started_at,
            completed_at,
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
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,

            'awaiting_payment',
            'pending',
            NULL,
            0,
            NULL,
            NULL,
            NOW(),
            NOW()
          )

          RETURNING id
        `,
        [
          organizationId,
          engagementNumber,
          requestId,
          clientProfile.id,

          item.training_organization_name,
          item.training_client_type,
          participantCount,
          item.training_skill_level,
          item.training_goal,
          item.training_topics,
          item.training_preferred_dates,
          item.training_additional_requirements,
          item.training_preferred_start_date,
          item.training_preferred_completion_date,
          item.training_timeline_flexible ??
            true,
          trainingDetails,
        ],
      )

    const engagementId =
      created.rows[0]?.id

    if (!engagementId) {
      throw new Error(
        "Training engagement creation returned no ID",
      )
    }

    // =========================================================
    // 10. UPDATE REQUEST
    // =========================================================

    await query(
      `
        UPDATE requests

        SET
          status =
            'awaiting_payment',

          converted_training_engagement_id =
            $2,

          client_decision_at =
            NOW(),

          updated_at =
            NOW()

        WHERE id = $1
      `,
      [
        requestId,
        engagementId,
      ],
    )

    // =========================================================
    // 11. CREATE TRAINING UPDATE
    // =========================================================

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
          'status_change',
          'Training Engagement Created',
          'Client accepted the training quote. Payment is pending before training can begin.'
        )
      `,
      [
        engagementId,
        clientProfile.id,
      ],
    )

    // =========================================================
    // 12. REQUEST AUDIT
    // =========================================================

    await recordRequestAudit(
      requestId,
      actorUserId,
      "client_accepted_training_quote_awaiting_payment",
      {
        training_engagement_id:
          engagementId,

        payment_required:
          true,

        amount:
          item.approved_quote_amount,

        currency:
          item.approved_quote_currency,
      },
    )

    // =========================================================
    // 13. COMMIT TRANSACTION
    // =========================================================

    await query("COMMIT")

    // =========================================================
    // 14. NOTIFY CLIENT
    // =========================================================
    //
    // IMPORTANT:
    //
    // notifyUser() does NOT accept engagementId as a
    // top-level property.
    //
    // The training engagement ID belongs inside metadata.
    // =========================================================

    await notifyUser(
      item.user_id,
      {
        type: "payment_required",

        title:
          "Payment Required",

        message:
          "Your training quote has been accepted. Complete payment to begin your training engagement.",

        metadata: {
          request_id:
            requestId,

          training_engagement_id:
            engagementId,

          engagement_number:
            engagementNumber,

          target_page:
            "client_training_engagement",

          action:
            "pay_now",
        },
      },
    )

    // =========================================================
    // 15. RETURN
    // =========================================================

    return engagementId
  } catch (error) {
    // =========================================================
    // ROLLBACK
    // =========================================================

    try {
      await query("ROLLBACK")
    } catch (rollbackError) {
      console.error(
        "TRAINING CONVERSION ROLLBACK ERROR",
        rollbackError,
      )
    }

    console.error(
      "TRAINING ENGAGEMENT CONVERSION ERROR",
      error,
    )

    throw error
  }
}