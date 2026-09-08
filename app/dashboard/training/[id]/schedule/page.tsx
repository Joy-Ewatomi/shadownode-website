import { notFound, redirect } from "next/navigation"

import { query } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

import {
  ensureAccess,
  listSessions,
  listModules,
  isApprovedTrainerForEngagement,
} from "@/lib/services/training-operations-service"

import TrainingShell from "@/components/training/TrainingShell"
import SessionsManager from "@/components/training/SessionsManager"
import GoogleCalendarConnection from "@/components/training/GoogleCalendarConnection"

type Props = {
  params: Promise<{ id: string }>
}

type EngagementRow = {
  id: string
  engagement_number: string | null
  status: string | null
  training_goal: string | null
}

type ModuleRow = {
  id: string
  title: string | null
  module_order: number | null
}

function normalizeRole(
  role: string | null | undefined,
): string {
  return String(role || "")
    .trim()
    .toLowerCase()
}

function isSuperAdminRole(
  role: string | null | undefined,
): boolean {
  const normalized = normalizeRole(role)

  return (
    normalized === "super_administrator" ||
    normalized === "super-administrator"
  )
}

function isClientRole(
  role: string | null | undefined,
): boolean {
  return normalizeRole(role) === "client"
}

export default async function SchedulePage({
  params,
}: Props) {
  const { id } = await params

  /*
   * ============================================================
   * AUTHENTICATION
   * ============================================================
   */

  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const userRole = normalizeRole(
    user.role,
  )

  const isClient =
    isClientRole(userRole)

  /*
   * ============================================================
   * ENGAGEMENT VIEW ACCESS
   * ============================================================
   *
   * Viewing a training schedule is controlled by the existing
   * centralized training authorization system.
   *
   * This is intentionally separate from session-management
   * authorization.
   */

  let access

  try {
    access = await ensureAccess(
      id,
      user,
      false,
    )
  } catch (error) {
    console.error(
      "TRAINING SCHEDULE ACCESS ERROR:",
      error,
    )

    return notFound()
  }

  /*
   * ============================================================
   * LOAD ENGAGEMENT
   * ============================================================
   */

  const engagementResult =
    await query<EngagementRow>(
      `
        SELECT
          id,
          engagement_number,
          status,
          training_goal
        FROM training_engagements
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    )

  const engagement =
    engagementResult.rows[0]

  if (!engagement) {
    return notFound()
  }

  /*
   * ============================================================
   * LOAD TRAINING SESSIONS
   * ============================================================
   *
   * IMPORTANT:
   *
   * listSessions() already owns the authoritative TrainingSession
   * query/result type.
   *
   * Do not recreate a competing SessionRow type here.
   */

  const rawSessions =
    await listSessions(id)

  /*
   * listSessions() already returns the structure expected by
   * SessionsManager.
   *
   * Only normalize database Date values where necessary.
   *
   * The cast is deliberately kept local because the service
   * owns the actual TrainingSessionQueryRow shape.
   */

  const sessions =
    rawSessions.map(
      (session) => ({
        ...session,

        scheduled_at:
          session.scheduled_at
            ? String(
                session.scheduled_at,
              )
            : null,

        created_at:
          session.created_at
            ? String(
                session.created_at,
              )
            : null,

        updated_at:
          session.updated_at
            ? String(
                session.updated_at,
              )
            : null,
      }),
    )

  /*
   * ============================================================
   * LOAD CURRICULUM MODULES
   * ============================================================
   *
   * Sessions may optionally be associated with a Curriculum
   * Roadmap module.
   *
   * Relationship:
   *
   * Curriculum Roadmap
   *        ↓
   *     Module
   *        ↓
   * Training Session
   */

  const rawModules =
    await listModules(id)

  const modules: ModuleRow[] =
    rawModules
      .map(
        (module) => ({
          id: String(
            module.id,
          ),

          title:
            module.title !==
              null &&
            module.title !==
              undefined
              ? String(
                  module.title,
                )
              : null,

          module_order:
            module.module_order !==
              null &&
            module.module_order !==
              undefined
              ? Number(
                  module.module_order,
                )
              : null,
        }),
      )
      .sort(
        (a, b) =>
          Number(
            a.module_order ?? 0,
          ) -
          Number(
            b.module_order ?? 0,
          ),
      )

  /*
   * ============================================================
   * CURRENT USER PROFILE
   * ============================================================
   *
   * Training engagement authorization uses the user's
   * user_profiles record.
   */

  const profileResult =
    await query<{ id: string }>(
      `
        SELECT
          id
        FROM user_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [user.id],
    )

  const profileId =
    profileResult.rows[0]?.id ||
    access.profileId ||
    null

  /*
   * ============================================================
   * SESSION MANAGEMENT AUTHORIZATION
   * ============================================================
   *
   * Super Administrator:
   *   Full session management.
   *
   * Approved trainer:
   *   Session management for this engagement.
   *
   * Administrator:
   *   View only unless explicitly approved as a trainer.
   *
   * Investigator / Analyst:
   *   Manage only when explicitly approved as a trainer.
   *
   * Client:
   *   View schedule and perform permitted client actions.
   *
   * IMPORTANT:
   *
   * Selecting/proposing a trainer does NOT grant trainer access.
   *
   * Access is activated only when the trainer assignment is
   * approved and exists in:
   *
   * training_engagement_trainers
   *
   * with:
   *
   * assignment_status = approved
   * removed_at IS NULL
   */

  let canManageSessions = false

  if (
    isSuperAdminRole(
      userRole,
    )
  ) {
    canManageSessions = true
  } else if (profileId) {
    canManageSessions =
      await isApprovedTrainerForEngagement(
        id,
        user,
        profileId,
      )
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <TrainingShell
      user={user}
      engagementId={id}
      engagementNumber={String(
        engagement.engagement_number ||
          id,
      )}
      title="Schedule"
      status={String(
        engagement.status ||
          "unknown",
      )}
    >
      <div className="space-y-6">

        {/* ======================================================
            CLIENT GOOGLE CALENDAR CONNECTION
            ====================================================== */}

        {isClient && (
          <GoogleCalendarConnection />
        )}

        {/* ======================================================
            TRAINING SCHEDULE
            ====================================================== */}

        <section className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-6">
          <SessionsManager
            initialSessions={
              sessions
            }
            engagementId={id}
            currentUserId={
              user.id
            }
            currentProfileId={
              profileId
            }
            canManageSessions={
              canManageSessions
            }
            isClient={
              isClient
            }
            modules={
              modules
            }
          />
        </section>

      </div>
    </TrainingShell>
  )
}
