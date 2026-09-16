import { randomUUID } from "crypto"

import { withTransaction } from "@/lib/db"
import { notifyUser } from "@/lib/services/notification-service"
import { isTrainingRequest } from "@/lib/services/request-engagement-classification"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"

const CONVERTIBLE_REQUEST_STATUSES = [
  "quote_sent",
  "revised_quote_sent",
  "client_decision_pending",
  "awaiting_client_acceptance",
]

export async function convertAcceptedRequestToCase(
  requestId: string,
  actorUserId: string,
) {
  let notifyClientUserId: string | null = null
  let convertedCaseId: string | null = null

  convertedCaseId = await withTransaction(async (client) => {
    const current = await client.query<{
      id: string
      case_number: string | null
      user_id: string | null
      title: string | null
      description: string | null
      service_type: string | null
      ai_suggested_priority: string | null
      approved_quote_amount: number | string | null
      approved_quote_currency: string | null
      approved_estimated_completion: string | null
      preferred_deadline: string | null
      converted_case_id: string | null
      converted_training_engagement_id: string | null
      status: string | null
      training_goal: string | null
      training_topics: string | null
      training_participant_count: number | string | null
      training_details: unknown
    }>(
      `
      SELECT
        id,
        case_number,
        user_id,
        title,
        description,
        service_type,
        ai_suggested_priority,
        approved_quote_amount,
        approved_quote_currency,
        approved_estimated_completion,
        preferred_deadline,
        converted_case_id,
        converted_training_engagement_id,
        status,
        training_goal,
        training_topics,
        training_participant_count,
        training_details
      FROM requests
      WHERE id = $1
        AND user_id = $2
      FOR UPDATE
      LIMIT 1
      `,
      [requestId, actorUserId],
    )

    const item = current.rows[0]
    if (!item) throw new Error("Request not found")

    if (item.converted_training_engagement_id) {
      throw new Error("Request was already converted to a training engagement")
    }

    if (item.converted_case_id) {
      return item.converted_case_id
    }

    if (isTrainingRequest(item)) {
      throw new Error("Training requests cannot be converted to investigation cases")
    }

    if (!item.status || !CONVERTIBLE_REQUEST_STATUSES.includes(item.status)) {
      throw new Error(`Request cannot be converted from status: ${item.status || "unknown"}`)
    }

    if (!item.user_id) {
      throw new Error("Request has no associated client user")
    }

    const quoteAmount = Number(item.approved_quote_amount)
    if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) {
      throw new Error("The approved quote amount is invalid")
    }

    if (!String(item.approved_quote_currency || "").trim()) {
      throw new Error("The approved quote currency is missing")
    }

    const profile = await client.query<{
      id: string
      user_id: string
      organization_id: string | null
    }>(
      `
      SELECT id, user_id, organization_id
      FROM user_profiles
      WHERE user_id = $1
      LIMIT 1
      `,
      [item.user_id],
    )

    const clientProfile = profile.rows[0]
    if (!clientProfile) throw new Error("Client profile not found for request user")
    if (clientProfile.user_id !== item.user_id) {
      throw new Error("Client profile does not belong to request user")
    }

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

    if (!organizationId) throw new Error("No organization available for case")

    const caseNumber =
      item.case_number ||
      `SOB-CASE-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`

    const created = await client.query<{ id: string }>(
      `
      INSERT INTO cases (
        organization_id,
        request_id,
        case_number,
        client_profile_id,
        case_user_id,
        title,
        description,
        service_type,
        status,
        priority,
        assigned_to,
        budget,
        estimated_completion,
        progress,
        payment_status,
        started_at,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $4,
        $5,
        $6,
        $7,
        'awaiting_payment',
        $8,
        NULL,
        $9,
        $10,
        0,
        'pending',
        NULL,
        NOW(),
        NOW()
      )
      RETURNING id
      `,
      [
        organizationId,
        requestId,
        caseNumber,
        clientProfile.id,
        item.title || "Investigation Request",
        item.description,
        item.service_type || "osint",
        item.ai_suggested_priority || "normal",
        quoteAmount,
        item.approved_estimated_completion || item.preferred_deadline || null,
      ],
    )

    const caseId = created.rows[0]?.id
    if (!caseId) throw new Error("Case creation returned no case ID")

    const linkedRequest = await client.query(
      `
      UPDATE requests
      SET
        status = 'awaiting_payment',
        converted_case_id = $2,
        client_decision_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
        AND converted_case_id IS NULL
        AND converted_training_engagement_id IS NULL
      `,
      [requestId, caseId],
    )

    if (linkedRequest.rowCount !== 1) {
      throw new Error("Request-to-case linkage failed")
    }

    await client.query(
      `
      INSERT INTO case_updates (
        case_id,
        updated_by,
        update_type,
        title,
        content
      )
      VALUES (
        $1,
        $2,
        'status_change',
        'Case Created',
        'Client accepted the quote. Payment is pending before the investigation begins.'
      )
      `,
      [caseId, clientProfile.id],
    )

    await recordRequestAudit(
      requestId,
      actorUserId,
      "client_accepted_quote_awaiting_payment",
      { case_id: caseId },
      client,
      { strict: true },
    )

    notifyClientUserId = item.user_id
    return caseId
  })

  if (notifyClientUserId && convertedCaseId) {
    await notifyUser(notifyClientUserId, {
      caseId: convertedCaseId,
      type: "payment_required",
      title: "Payment Required",
      message:
        "Your quote has been accepted. Complete payment to begin your investigation.",
      metadata: {
        request_id: requestId,
        case_id: convertedCaseId,
        resource_type: "request",
        resource_id: requestId,
        target_page: "client_request",
        action: "pay_now",
      },
    })
  }

  return convertedCaseId
}
