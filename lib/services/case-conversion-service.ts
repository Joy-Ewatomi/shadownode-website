import { query } from "@/lib/db"
import { notifyUser } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"

export async function convertAcceptedRequestToCase(
  requestId: string,
  actorUserId: string,
) {
  try {
    await query("BEGIN")

    // ---------------------------------------------------------
    // 1. LOAD REQUEST
    // ---------------------------------------------------------

    const current = await query<{
      id: string
      case_number: string | null
      user_id: string | null
      title: string | null
      description: string | null
      service_type: string | null
      ai_suggested_priority: string | null
      approved_quote_amount: number | string | null
      approved_estimated_completion: string | null
      preferred_deadline: string | null
      converted_case_id: string | null
      status: string | null
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
        approved_estimated_completion,
        preferred_deadline,
        converted_case_id,
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

    if (!item) {
      throw new Error("Request not found")
    }

    // ---------------------------------------------------------
    // 2. PREVENT DUPLICATE CASE CREATION
    // ---------------------------------------------------------

    if (item.converted_case_id) {
      await query("COMMIT")
      return item.converted_case_id
    }

    // ---------------------------------------------------------
    // 3. VERIFY REQUEST CAN BE CONVERTED
    // ---------------------------------------------------------

    if (
      item.status === "active" ||
      item.status === "awaiting_payment"
    ) {
      throw new Error(
        "Request already converted or awaiting payment",
      )
    }

    if (!item.user_id) {
      throw new Error(
        "Request has no associated client user",
      )
    }

    // ---------------------------------------------------------
    // 4. LOAD CLIENT PROFILE
    //
    // IMPORTANT:
    // cases.client_profile_id and cases.case_user_id both
    // reference user_profiles.id — NOT users.id.
    // ---------------------------------------------------------

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
      [item.user_id],
    )

    const clientProfile = profile.rows[0]

    if (!clientProfile) {
      throw new Error(
        "Client profile not found for request user",
      )
    }

    // Defensive check: make absolutely sure this profile belongs
    // to the request owner.
    if (clientProfile.user_id !== item.user_id) {
      throw new Error(
        "Client profile does not belong to request user",
      )
    }

    // ---------------------------------------------------------
    // 5. ORGANIZATION
    //
    // cases.organization_id is NOT NULL.
    // Prefer the client's organization.
    // If they do not have one, use the earliest organization.
    // ---------------------------------------------------------

    let organizationId =
      clientProfile.organization_id

    if (!organizationId) {
      const organization = await query<{
        id: string
      }>(
        `
        SELECT id
        FROM organizations
        ORDER BY created_at ASC
        LIMIT 1
        `,
      )

      organizationId =
        organization.rows[0]?.id || null
    }

    if (!organizationId) {
      throw new Error(
        "No organization available for case",
      )
    }

    // ---------------------------------------------------------
    // 6. GENERATE CASE NUMBER
    // ---------------------------------------------------------

    const caseNumber =
      `SOB-CASE-${new Date().getFullYear()}-${Date.now()}`

    const existingCase = await query<{
      id: string
    }>(
      `
      SELECT id
      FROM cases
      WHERE case_number = $1
      LIMIT 1
      `,
      [caseNumber],
    )

    if (existingCase.rows[0]) {
      await query("ROLLBACK")
      return existingCase.rows[0].id
    }

    // ---------------------------------------------------------
    // 7. NORMALIZE CASE DATA
    // ---------------------------------------------------------

    const serviceType =
      item.service_type || "osint"

    const priority =
      item.ai_suggested_priority || "normal"

    const budget =
      item.approved_quote_amount !== null
        ? Number(item.approved_quote_amount)
        : null

    const estimatedCompletion =
      item.approved_estimated_completion ||
      item.preferred_deadline ||
      null

    // ---------------------------------------------------------
    // 8. CREATE CASE
    //
    // IMPORTANT:
    //
    // $3 = clientProfile.id
    //
    // NOT item.user_id.
    //
    // This satisfies:
    //
    // cases.client_profile_id → user_profiles.id
    // cases.case_user_id      → user_profiles.id
    // ---------------------------------------------------------

    const created = await query<{
      id: string
    }>(
      `
      INSERT INTO cases (
        organization_id,
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
        $3,
        $4,
        $5,
        $6,
        'awaiting_payment',
        $7,
        NULL,
        $8,
        $9,
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
        caseNumber,

        // BOTH FK columns point to user_profiles.id
        clientProfile.id,

        item.title ||
          "Investigation Request",

        item.description,

        serviceType,

        priority,

        budget,

        estimatedCompletion,
      ],
    )

    const caseId = created.rows[0]?.id

    if (!caseId) {
      throw new Error(
        "Case creation returned no case ID",
      )
    }

    // ---------------------------------------------------------
    // 9. UPDATE REQUEST
    // ---------------------------------------------------------

    await query(
      `
      UPDATE requests
      SET
        status = 'awaiting_payment',
        converted_case_id = $2,
        client_decision_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        requestId,
        caseId,
      ],
    )

    // ---------------------------------------------------------
    // 10. CASE TIMELINE
    // ---------------------------------------------------------

    await query(
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
      [
        caseId,
        clientProfile.id,
      ],
    )

    // ---------------------------------------------------------
    // 11. AUDIT
    // ---------------------------------------------------------

    await recordRequestAudit(
      requestId,
      actorUserId,
      "client_accepted_quote_awaiting_payment",
      {
        case_id: caseId,
      },
    )

    // ---------------------------------------------------------
    // 12. COMMIT
    // ---------------------------------------------------------

    await query("COMMIT")

    // ---------------------------------------------------------
    // 13. NOTIFY CLIENT
    // ---------------------------------------------------------

    if (item.user_id) {
      await notifyUser(
        item.user_id,
        {
          caseId,
          type: "payment_required",
          title: "Payment Required",
          message:
            "Your quote has been accepted. Complete payment to begin your investigation.",
          metadata: {
            request_id: requestId,
            case_id: caseId,
            target_page: "payment",
            action: "pay_now",
          },
        },
      )
    }

    return caseId
  } catch (error) {
    try {
      await query("ROLLBACK")
    } catch (rollbackError) {
      console.error(
        "CASE CONVERSION ROLLBACK ERROR",
        rollbackError,
      )
    }

    console.error(
      "CASE CONVERSION ERROR",
      error,
    )

    throw error
  }
}