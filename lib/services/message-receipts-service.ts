import type { QueryResultRow } from "pg"

import { query, type DatabasePoolClient } from "@/lib/db"

type QueryExecutor = Pick<DatabasePoolClient, "query"> | {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>
}

type ReceiptMessageInput = {
  messageId: string
  conversationId: string
  caseId: string
  senderProfileId: string | null
}

type MarkConversationReadInput = {
  conversationId: string
  userId: string
  profileId: string | null
}

function executorOrDefault(
  executor?: QueryExecutor,
): QueryExecutor {
  return executor || { query }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function assertUuid(
  value: string | null | undefined,
  name: string,
) {
  if (!value || !UUID_PATTERN.test(value)) {
    throw new Error(`Invalid ${name}`)
  }
}

function assertNullableUuid(
  value: string | null | undefined,
  name: string,
) {
  if (value != null && !UUID_PATTERN.test(value)) {
    throw new Error(`Invalid ${name}`)
  }
}

export async function syncConversationParticipants(
  conversationId: string,
  caseId: string,
  executor?: QueryExecutor,
) {
  assertUuid(conversationId, "conversation ID")
  assertUuid(caseId, "case ID")

  const db = executorOrDefault(executor)

  await db.query(
    `
      WITH input AS (
        SELECT
          $1::uuid AS conversation_id,
          $2::uuid AS case_id
      )
      INSERT INTO conversation_members (
        conversation_id,
        user_id
      )
      SELECT DISTINCT
        input.conversation_id,
        recipients.user_id
      FROM input
      CROSS JOIN LATERAL (
        SELECT recipients.user_id
        FROM (
          SELECT client_profile.user_id
          FROM cases c
          JOIN user_profiles client_profile
            ON client_profile.id = c.client_profile_id
          WHERE c.id = input.case_id
            AND client_profile.user_id IS NOT NULL

          UNION

          SELECT assigned_profile.user_id
          FROM case_assignments ca
          JOIN user_profiles assigned_profile
            ON assigned_profile.id = ca.assigned_to
          WHERE ca.case_id = input.case_id
            AND ca.removed_at IS NULL
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
            AND assigned_profile.user_id IS NOT NULL
        ) recipients
      ) recipients
      ON CONFLICT DO NOTHING
    `,
    [
      conversationId,
      caseId,
    ],
  )
}

export async function createMessageReceipts(
  input: ReceiptMessageInput,
  executor?: QueryExecutor,
) {
  assertUuid(input.messageId, "message ID")
  assertUuid(input.conversationId, "conversation ID")
  assertUuid(input.caseId, "case ID")
  assertNullableUuid(input.senderProfileId, "sender profile ID")

  const db = executorOrDefault(executor)

  await db.query(
    `
      WITH input AS (
        SELECT
          $1::uuid AS message_id,
          $2::uuid AS conversation_id,
          $3::uuid AS case_id,
          $4::uuid AS sender_profile_id
      )
      INSERT INTO message_receipts (
        message_id,
        user_id,
        conversation_id,
        read_at,
        delivered_at,
        created_at,
        updated_at
      )
      SELECT DISTINCT
        input.message_id,
        recipients.user_id,
        input.conversation_id,
        CASE
          WHEN sender_profile.user_id = recipients.user_id THEN NOW()
          ELSE NULL
        END,
        NOW(),
        NOW(),
        NOW()
      FROM input
      CROSS JOIN LATERAL (
        SELECT recipients.user_id
        FROM (
          SELECT cm.user_id
          FROM conversation_members cm
          JOIN app_users cm_user
            ON cm_user.id = cm.user_id
          WHERE cm.conversation_id = input.conversation_id
            AND cm_user.status = 'active'
            AND (
              EXISTS (
                SELECT 1
                FROM cases c
                JOIN user_profiles client_profile
                  ON client_profile.id = c.client_profile_id
                WHERE c.id = input.case_id
                  AND client_profile.user_id = cm.user_id
              )
              OR EXISTS (
                SELECT 1
                FROM case_assignments ca
                JOIN user_profiles assigned_profile
                  ON assigned_profile.id = ca.assigned_to
                WHERE ca.case_id = input.case_id
                  AND assigned_profile.user_id = cm.user_id
                  AND ca.removed_at IS NULL
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
              )
            )

          UNION

          SELECT client_profile.user_id
          FROM cases c
          JOIN user_profiles client_profile
            ON client_profile.id = c.client_profile_id
          WHERE c.id = input.case_id
            AND client_profile.user_id IS NOT NULL

          UNION

          SELECT assigned_profile.user_id
          FROM case_assignments ca
          JOIN user_profiles assigned_profile
            ON assigned_profile.id = ca.assigned_to
          WHERE ca.case_id = input.case_id
            AND ca.removed_at IS NULL
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
            AND assigned_profile.user_id IS NOT NULL
        ) recipients
      ) recipients
      LEFT JOIN user_profiles sender_profile
        ON sender_profile.id = input.sender_profile_id
      ON CONFLICT (message_id, user_id) DO NOTHING
    `,
    [
      input.messageId,
      input.conversationId,
      input.caseId,
      input.senderProfileId,
    ],
  )
}

export async function markConversationReceiptsReadForUser(
  input: MarkConversationReadInput,
  executor?: QueryExecutor,
) {
  assertUuid(input.conversationId, "conversation ID")
  assertUuid(input.userId, "user ID")
  assertNullableUuid(input.profileId, "profile ID")

  const db = executorOrDefault(executor)

  const result = await db.query<{ id: string }>(
    `
      UPDATE message_receipts mr
      SET read_at = COALESCE(mr.read_at, NOW()),
          updated_at = NOW()
      FROM messages m
      LEFT JOIN user_profiles sender_profile
        ON sender_profile.id = m.sender_id
      WHERE mr.message_id = m.id
        AND mr.user_id = $1::uuid
        AND mr.conversation_id = $2::uuid
        AND mr.read_at IS NULL
        AND (
          $3::uuid IS NULL
          OR m.sender_id IS NULL
          OR m.sender_id <> $3::uuid
        )
      RETURNING mr.message_id AS id
    `,
    [
      input.userId,
      input.conversationId,
      input.profileId,
    ],
  )

  return result.rowCount || result.rows.length
}

export async function markMessageReceiptReadForUser(
  {
    messageId,
    userId,
    profileId,
  }: {
    messageId: string
    userId: string
    profileId: string | null
  },
  executor?: QueryExecutor,
) {
  assertUuid(messageId, "message ID")
  assertUuid(userId, "user ID")
  assertNullableUuid(profileId, "profile ID")

  const db = executorOrDefault(executor)

  const result = await db.query<{ id: string }>(
    `
      UPDATE message_receipts mr
      SET read_at = COALESCE(mr.read_at, NOW()),
          updated_at = NOW()
      FROM messages m
      WHERE mr.message_id = m.id
        AND mr.message_id = $1::uuid
        AND mr.user_id = $2::uuid
        AND mr.read_at IS NULL
        AND (
          $3::uuid IS NULL
          OR m.sender_id IS NULL
          OR m.sender_id <> $3::uuid
        )
      RETURNING mr.message_id AS id
    `,
    [
      messageId,
      userId,
      profileId,
    ],
  )

  return result.rowCount || result.rows.length
}

export async function createBacklogReceiptsForUser(
  {
    caseId,
    userId,
  }: {
    caseId: string
    userId: string
  },
  executor?: QueryExecutor,
) {
  assertUuid(caseId, "case ID")
  assertUuid(userId, "user ID")

  const db = executorOrDefault(executor)

  await db.query(
    `
      INSERT INTO conversation_members (
        conversation_id,
        user_id
      )
      SELECT DISTINCT
        c.id,
        $2::uuid
      FROM conversations c
      WHERE c.case_id = $1::uuid
      ON CONFLICT DO NOTHING
    `,
    [
      caseId,
      userId,
    ],
  )

  await db.query(
    `
      INSERT INTO message_receipts (
        message_id,
        user_id,
        conversation_id,
        read_at,
        delivered_at,
        created_at,
        updated_at
      )
      SELECT
        m.id,
        $2::uuid,
        m.conversation_id,
        CASE
          WHEN sender_profile.user_id = $2::uuid THEN COALESCE(m.read_at, m.created_at, NOW())
          WHEN m.read_at IS NOT NULL THEN m.read_at
          ELSE NULL
        END,
        COALESCE(m.created_at, NOW()),
        COALESCE(m.created_at, NOW()),
        NOW()
      FROM messages m
      LEFT JOIN user_profiles sender_profile
        ON sender_profile.id = m.sender_id
      WHERE m.case_id = $1::uuid
        AND m.conversation_id IS NOT NULL
      ON CONFLICT (message_id, user_id) DO NOTHING
    `,
    [
      caseId,
      userId,
    ],
  )
}
