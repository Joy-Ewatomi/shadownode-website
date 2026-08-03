import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

type ClientCaseRow = {
  id: string
  case_number: string
  title: string
  description: string | null
  status: string | null
  priority: string | null
  progress: number | null
  created_at: string
}

function isUuid(value: string) {
  return value.includes("-") && value.length === 36
}

async function clientProfileId(userId: string) {
  const result = await query<{ id: string }>(
    "SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1",
    [userId],
  ).catch(() => ({ rows: [] }))

  return result.rows[0]?.id ?? null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    console.log("CLIENT CASE USER:", user)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    console.log("CASE ID:", id)
    console.log("IS UUID:", isUuid(id))
    const profileId = await clientProfileId(user.id)
    console.log("CLIENT PROFILE:", profileId)

    const caseResult = await query<ClientCaseRow>(
      `
      SELECT
        id,
        case_number,
        title,
        description,
        status,
        priority,
        progress,
        created_at
      FROM cases
     WHERE ${isUuid(id) ? "id = $1" : "case_number = $1"}
AND (
  client_profile_id = $2
  OR case_user_id = $3
)
LIMIT 1
      `,
      [id, profileId, user.id],
    )
console.log("CASE QUERY RESULT:", caseResult.rows)

const caseInfo = caseResult.rows[0]
    if (!caseInfo) return NextResponse.json({ error: "Case not found" }, { status: 404 })

    const [timeline, reports, conversation] = await Promise.all([
      query(
        `
        SELECT id, update_type, title, content, created_at
        FROM case_updates
        WHERE case_id = $1
        ORDER BY created_at DESC
        `,
        [caseInfo.id],
      ),
      query(
        `
        SELECT id, title, file_url, summary, created_at
        FROM case_reports
        WHERE case_id = $1
        ORDER BY created_at DESC
        `,
        [caseInfo.id],
      ),
      query(
        `
        SELECT
          c.id,
          c.case_id,
          (
            SELECT m.message
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
          ) AS last_message,
          (
            SELECT m.created_at
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
          ) AS last_message_at,
          (
            SELECT COUNT(*)::int
            FROM messages m
            WHERE m.conversation_id = c.id
              AND m.sender_id <> $2
              AND m.read_at IS NULL
          ) AS unread_count,
          COALESCE(
            json_agg(
              json_build_object(
                'id', m.id,
                'sender_id', m.sender_id,
                'sender_name', au.username,
                'message', m.message,
                'created_at', m.created_at,
                'read_at', m.read_at
              )
              ORDER BY m.created_at ASC
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::json
          ) AS messages
        FROM conversations c
        JOIN conversation_members cm ON cm.conversation_id = c.id
        LEFT JOIN messages m ON m.conversation_id = c.id
        LEFT JOIN user_profiles sender_profile ON sender_profile.id = m.sender_id
        LEFT JOIN app_users au ON au.id = sender_profile.user_id
        WHERE c.case_id = $1
          AND cm.user_id = $2
        GROUP BY c.id
        ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC
        LIMIT 1
        `,
        [caseInfo.id, user.id],
      ),
    ])

    await auditLog(user.id, "client_viewed_case", request, { case_id: caseInfo.id })
    if (reports.rows.length) {
      await auditLog(user.id, "client_viewed_report", request, {
        case_id: caseInfo.id,
        report_ids: reports.rows.map((report) => report.id),
      })
    }

    return NextResponse.json({
      case: {
        ...caseInfo,
        progress: caseInfo.progress ?? progressForStatus(caseInfo.status),
      },
      timeline: timeline.rows,
      reports: reports.rows,
      message_summary: conversation.rows[0] ?? null,
    })
  } catch (error) {
    console.error("CLIENT CASE GET ERROR", error)
    return NextResponse.json({ error: "Failed to load client case" }, { status: 500 })
  }
}

function progressForStatus(status: string | null) {
  const normalized = String(status || "").toLowerCase()
  if (["submitted", "new"].includes(normalized)) return 15
  if (["active", "in_progress", "investigating"].includes(normalized)) return 45
  if (["review", "pending_review"].includes(normalized)) return 70
  if (["completed", "delivered", "published"].includes(normalized)) return 100
  if (normalized === "archived") return 100
  return 30
}
