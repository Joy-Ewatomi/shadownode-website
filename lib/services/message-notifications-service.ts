import type { QueryResultRow } from "pg"

import { query, type DatabasePoolClient } from "@/lib/db"

type QueryExecutor = Pick<DatabasePoolClient, "query"> | {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>
}

type CreateCaseMessageNotificationsInput = {
  messageId: string
  conversationId: string
  caseId: string
  senderUserId: string
  senderRole: string
}

function executorOrDefault(
  executor?: QueryExecutor,
): QueryExecutor {
  return executor || { query }
}

const STRICT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function assertUuid(
  value: string | null | undefined,
  name: string,
) {
  if (!value || !STRICT_UUID_PATTERN.test(value)) {
    throw new Error(`Invalid ${name}`)
  }
}

export async function createCaseMessageNotifications(
  input: CreateCaseMessageNotificationsInput,
  executor?: QueryExecutor,
) {
  assertUuid(input.messageId, "message ID")
  assertUuid(input.conversationId, "conversation ID")
  assertUuid(input.caseId, "case ID")
  assertUuid(input.senderUserId, "sender user ID")

  const db = executorOrDefault(executor)

  await db.query(
    `
      WITH input AS (
        SELECT
          $1::uuid AS message_id,
          $2::uuid AS conversation_id,
          $3::uuid AS case_id,
          $4::uuid AS sender_user_id,
          $5::text AS sender_role
      ),
      recipients AS (
        SELECT DISTINCT
          client_user.id AS user_id,
          'client'::text AS audience,
          'new_case_message'::text AS notification_type,
          'New case message'::text AS title,
          'You have a new secure message regarding your case.'::text AS body,
          'client_case_conversation'::text AS target_page,
          '/dashboard/client/cases/' || input.case_id::text AS destination
        FROM input
        JOIN cases c
          ON c.id = input.case_id
        JOIN user_profiles client_profile
          ON client_profile.id = c.client_profile_id
        JOIN app_users client_user
          ON client_user.id = client_profile.user_id
        WHERE input.sender_role <> 'client'
          AND client_user.status = 'active'
          AND client_user.id <> input.sender_user_id

        UNION

        SELECT DISTINCT
          assigned_user.id AS user_id,
          'staff'::text AS audience,
          'staff_case_message'::text AS notification_type,
          'New case message'::text AS title,
          CASE
            WHEN input.sender_role = 'client'
              THEN 'A client sent a secure message regarding an assigned case.'
            ELSE 'A secure message was posted in an assigned case conversation.'
          END AS body,
          'staff_case_messages'::text AS target_page,
          '/dashboard/cases/' || input.case_id::text || '/messages' AS destination
        FROM input
        JOIN case_assignments ca
          ON ca.case_id = input.case_id
        JOIN user_profiles assigned_profile
          ON assigned_profile.id = ca.assigned_to
        JOIN app_users assigned_user
          ON assigned_user.id = assigned_profile.user_id
        WHERE ca.removed_at IS NULL
          AND COALESCE(ca.status, 'assigned') IN (
            'assigned',
            'approved',
            'active',
            'accepted'
          )
          AND COALESCE(ca.assignment_role, 'investigator') IN (
            'lead_investigator',
            'investigator',
            'analyst'
          )
          AND assigned_user.status = 'active'
          AND assigned_user.role IN (
            'staff',
            'administrator',
            'super_administrator',
            'super-administrator',
            'investigator',
            'analyst'
          )
          AND assigned_user.id <> input.sender_user_id
      )
      INSERT INTO notifications (
        user_id,
        case_id,
        type,
        title,
        message,
        metadata,
        is_read
      )
      SELECT
        recipients.user_id,
        input.case_id,
        recipients.notification_type,
        recipients.title,
        recipients.body,
        jsonb_build_object(
          'case_id', input.case_id::text,
          'conversation_id', input.conversation_id::text,
          'message_id', input.message_id::text,
          'resource_type', 'conversation',
          'resource_id', input.conversation_id::text,
          'target_page', recipients.target_page,
          'audience', recipients.audience,
          'action', 'open_conversation',
          'destination', recipients.destination
        ),
        false
      FROM input
      JOIN recipients
        ON TRUE
      WHERE NOT EXISTS (
        SELECT 1
        FROM notifications existing
        WHERE existing.user_id = recipients.user_id
          AND existing.type = recipients.notification_type
          AND existing.metadata->>'message_id' = input.message_id::text
      )
    `,
    [
      input.messageId,
      input.conversationId,
      input.caseId,
      input.senderUserId,
      input.senderRole,
    ],
  )
}
