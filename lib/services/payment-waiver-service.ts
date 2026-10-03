import { withTransaction } from "@/lib/db"
import { isSuperAdministratorRole } from "@/lib/role-access"
import { notifyUser } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"
import { transitionCaseStatus } from "@/lib/services/case-status-service"

export async function waiveRequestPayment(input: {
  requestId: string
  actorUserId: string
  actorRole: string
  reason: string
}) {
  if (!isSuperAdministratorRole(input.actorRole)) throw new Error("Forbidden")
  const reason = input.reason.trim()
  if (reason.length < 10 || reason.length > 500) {
    throw new Error("A waiver reason between 10 and 500 characters is required")
  }

  const result = await withTransaction(async (client) => {
    const requestResult = await client.query<{
      id: string
      user_id: string
      status: string
      accepted_quote_version_id: string | null
      converted_case_id: string | null
      converted_training_engagement_id: string | null
    }>(
      `SELECT id, user_id, status, accepted_quote_version_id,
              converted_case_id, converted_training_engagement_id
       FROM requests WHERE id = $1 FOR UPDATE`,
      [input.requestId],
    )
    const request = requestResult.rows[0]
    if (!request) throw new Error("Request not found")
    if (request.status !== "awaiting_payment" || !request.accepted_quote_version_id) {
      throw new Error("Only an accepted request awaiting payment can be waived")
    }

    const hasCase = Boolean(request.converted_case_id)
    const hasTraining = Boolean(request.converted_training_engagement_id)
    if (hasCase === hasTraining) throw new Error("Request has no unambiguous payable engagement")

    const attempts = await client.query(
      `SELECT 1 FROM payments WHERE request_id = $1 LIMIT 1 FOR UPDATE`,
      [request.id],
    )
    if (attempts.rows[0]) {
      throw new Error("Payment cannot be waived after a payment attempt has started")
    }

    let destinationType: "case" | "training"
    let destinationId: string
    if (request.converted_case_id) {
      const target = await client.query<{ status: string; payment_status: string | null }>(
        `SELECT status, payment_status FROM cases WHERE id = $1 FOR UPDATE`,
        [request.converted_case_id],
      )
      if (target.rows[0]?.status !== "awaiting_payment" || target.rows[0]?.payment_status === "paid") {
        throw new Error("Case is not eligible for a payment waiver")
      }
      await client.query(
        `UPDATE cases SET payment_status = 'waived', updated_at = NOW() WHERE id = $1`,
        [request.converted_case_id],
      )
      await transitionCaseStatus({
        caseId: request.converted_case_id,
        to: "awaiting_assignment",
        actor: "system",
        actorUserId: input.actorUserId,
        reason: `Payment waived by Super Administrator. ${reason}`,
        sourceAction: "super_admin_payment_waiver",
        executor: client,
      })
      await client.query(
        `UPDATE requests SET status = 'awaiting_assignment', updated_at = NOW() WHERE id = $1`,
        [request.id],
      )
      destinationType = "case"
      destinationId = request.converted_case_id
    } else {
      const trainingId = request.converted_training_engagement_id as string
      const target = await client.query<{ status: string; payment_status: string | null }>(
        `SELECT status, payment_status FROM training_engagements WHERE id = $1 FOR UPDATE`,
        [trainingId],
      )
      if (target.rows[0]?.status !== "awaiting_payment" || target.rows[0]?.payment_status === "paid") {
        throw new Error("Training engagement is not eligible for a payment waiver")
      }
      await client.query(
        `UPDATE training_engagements
         SET payment_status = 'waived',
             status = CASE WHEN preferred_start_date IS NOT NULL AND preferred_start_date > CURRENT_DATE
               THEN 'scheduled' ELSE 'active' END,
             started_at = CASE WHEN preferred_start_date IS NULL OR preferred_start_date <= CURRENT_DATE
               THEN COALESCE(started_at, NOW()) ELSE started_at END,
             updated_at = NOW()
         WHERE id = $1`,
        [trainingId],
      )
      await client.query(
        `UPDATE requests SET status = 'active', updated_at = NOW() WHERE id = $1`,
        [request.id],
      )
      destinationType = "training"
      destinationId = trainingId
    }

    await recordRequestAudit(
      request.id,
      input.actorUserId,
      "payment_waived",
      { reason, destination_type: destinationType, destination_id: destinationId },
      client,
      { strict: true },
    )
    return { requestId: request.id, clientId: request.user_id, destinationType, destinationId }
  })

  await notifyUser(result.clientId, {
    type: "payment_waived",
    title: "Payment requirement waived",
    message: "The payment requirement for your engagement has been waived. You can continue in the portal.",
    metadata: {
      request_id: result.requestId,
      resource_type: result.destinationType,
      resource_id: result.destinationId,
    },
  }).catch(() => undefined)

  return { success: true, ...result }
}
