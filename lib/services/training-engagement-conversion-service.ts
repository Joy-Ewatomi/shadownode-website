import { randomUUID } from "crypto"

import { withTransaction } from "@/lib/db"
import { notifyUser } from "@/lib/services/notification-service"
import { markAcceptedQuoteVersion } from "@/lib/services/commercial-history-service"
import { isTrainingRequest } from "@/lib/services/request-engagement-classification"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"

const CONVERTIBLE_REQUEST_STATUSES = [
  "quote_sent",
  "revised_quote_sent",
  "client_decision_pending",
  "awaiting_client_acceptance",
]

function isIndividualTraining(clientType: string | null, participantCount: number | null) {
  const normalized = String(clientType || "").trim().toLowerCase()
  return normalized === "individual" || participantCount === 1
}

export async function convertAcceptedRequestToTrainingEngagement(
  requestId: string,
  actorUserId: string,
) {
  let notifyClientUserId: string | null = null
  let engagementNumberForNotification: string | null = null

  const engagementId = await withTransaction(async (client) => {
    const current = await client.query<{
      id: string
      user_id: string | null
      case_number: string | null
      title: string | null
      description: string | null
      service_type: string | null
      approved_quote_amount: number | string | null
      approved_quote_currency: string | null
      approved_estimated_completion: string | null
      converted_case_id: string | null
      converted_training_engagement_id: string | null
      training_organization_name: string | null
      training_client_type: string | null
      training_participant_count: number | string | null
      training_skill_level: string | null
      training_goal: string | null
      training_topics: string | null
      training_preferred_dates: string | null
      training_additional_requirements: string | null
      training_preferred_start_date: string | null
      training_preferred_completion_date: string | null
      training_timeline_flexible: boolean | null
      training_details: Record<string, unknown> | null
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
        converted_case_id,
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
      [requestId, actorUserId],
    )

    const item = current.rows[0]
    if (!item) throw new Error("Training request not found")

    if (item.converted_training_engagement_id) {
      return item.converted_training_engagement_id
    }

    if (item.converted_case_id) {
      throw new Error("Request was already converted to an investigation case")
    }

    if (!isTrainingRequest(item)) {
      throw new Error("Investigation requests cannot be converted to training engagements")
    }

    if (!item.status || !CONVERTIBLE_REQUEST_STATUSES.includes(item.status)) {
      throw new Error(`Request cannot be converted from status: ${item.status || "unknown"}`)
    }

    if (!item.user_id) {
      throw new Error("Training request has no associated client user")
    }

    const quoteAmount = Number(item.approved_quote_amount)
    if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) {
      throw new Error("The approved quote amount is invalid")
    }

    if (!String(item.approved_quote_currency || "").trim()) {
      throw new Error("The approved quote currency is missing")
    }

    await markAcceptedQuoteVersion(client, {
      requestId, userId: actorUserId, amount: quoteAmount,
      currency: String(item.approved_quote_currency),
    })

    const profile = await client.query<{
      id: string
      user_id: string
      organization_id: string | null
      full_name: string | null
    }>(
      `
      SELECT id, user_id, organization_id, full_name
      FROM user_profiles
      WHERE user_id = $1
      LIMIT 1
      `,
      [item.user_id],
    )

    const clientProfile = profile.rows[0]
    if (!clientProfile) throw new Error("Client profile not found for training request")
    if (clientProfile.user_id !== item.user_id) {
      throw new Error("Client profile does not belong to request user")
    }

    const userResult = await client.query<{ email: string | null; username: string | null }>(
      `
      SELECT email, username
      FROM app_users
      WHERE id = $1
      LIMIT 1
      `,
      [item.user_id],
    )
    const clientUser = userResult.rows[0]

    let organizationId = clientProfile.organization_id
    if (!organizationId) {
      const organization = await client.query<{ id: string }>(
        `
        SELECT id
        FROM organizations
        ORDER BY created_at ASC
        LIMIT 1
        `,
      )
      organizationId = organization.rows[0]?.id || null
    }

    if (!organizationId) throw new Error("No organization available for training engagement")

    const participantCount =
      item.training_participant_count !== null &&
      item.training_participant_count !== undefined
        ? Number(item.training_participant_count)
        : null

    if (
      participantCount !== null &&
      (!Number.isFinite(participantCount) || participantCount <= 0)
    ) {
      throw new Error("Training participant count is invalid")
    }

    const engagementNumber =
      item.case_number ||
      `SOB-TRAIN-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`

    const created = await client.query<{ id: string }>(
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
        item.training_timeline_flexible ?? true,
        item.training_details || null,
      ],
    )

    const newEngagementId = created.rows[0]?.id
    if (!newEngagementId) {
      throw new Error("Training engagement creation returned no ID")
    }

    const linkedRequest = await client.query(
      `
      UPDATE requests
      SET
        status = 'awaiting_payment',
        training_engagement_id = $2,
        converted_training_engagement_id = $2,
        client_decision_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
        AND converted_case_id IS NULL
        AND converted_training_engagement_id IS NULL
      `,
      [requestId, newEngagementId],
    )

    if (linkedRequest.rowCount !== 1) {
      throw new Error("Request-to-training linkage failed")
    }

    if (isIndividualTraining(item.training_client_type, participantCount)) {
      const participantName =
        clientProfile.full_name ||
        clientUser?.username ||
        clientUser?.email ||
        "Training participant"

      await client.query(
        `
        INSERT INTO training_participants (
          training_engagement_id,
          client_profile_id,
          full_name,
          email,
          certificate_name,
          organization_name,
          status,
          certificate_eligible,
          created_at,
          updated_at
        )
        SELECT
          $1,
          $2,
          $3,
          $4,
          $3,
          $5,
          'eligible',
          TRUE,
          NOW(),
          NOW()
        WHERE NOT EXISTS (
          SELECT 1
          FROM training_participants
          WHERE training_engagement_id = $1
            AND client_profile_id = $2
        )
        `,
        [
          newEngagementId,
          clientProfile.id,
          participantName,
          clientUser?.email || null,
          item.training_organization_name,
        ],
      )
    }

    await client.query(
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
      [newEngagementId, clientProfile.id],
    )

    await recordRequestAudit(
      requestId,
      actorUserId,
      "client_accepted_training_quote_awaiting_payment",
      {
        training_engagement_id: newEngagementId,
        payment_required: true,
        amount: item.approved_quote_amount,
        currency: item.approved_quote_currency,
      },
      client,
      { strict: true },
    )

    notifyClientUserId = item.user_id
    engagementNumberForNotification = engagementNumber
    return newEngagementId
  })

  if (notifyClientUserId) {
    await notifyUser(notifyClientUserId, {
      type: "payment_required",
      title: "Payment Required",
      message:
        "Your training quote has been accepted. Complete payment to begin your training engagement.",
      metadata: {
        request_id: requestId,
        training_engagement_id: engagementId,
        engagement_number: engagementNumberForNotification,
        target_page: "client_training_engagement",
        action: "pay_now",
      },
    })
  }

  return engagementId
}
