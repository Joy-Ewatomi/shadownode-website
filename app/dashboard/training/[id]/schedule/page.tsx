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

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
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
    return redirect("/login")
  }

  /*
   * ============================================================
   * ENGAGEMENT VIEW ACCESS
   * ============================================================
   *
   * Viewing the schedule is separate from managing sessions.
   *
   * Clients, assigned trainers, administrators and
   * super administrators may view according to the existing
   * training authorization system.
   */

  let access

  try {
    access = await ensureAccess(
      id,
      user,
      false,
    )
  } catch {
    return notFound()
  }

  /*
   * ============================================================
   * LOAD ENGAGEMENT
   * ============================================================
   */

  const engRes =
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
    engRes.rows[0]

  if (!engagement) {
    return notFound()
  }

  /*
   * ============================================================
   * LOAD SESSIONS
   * ============================================================
   */

  const rawSessions =
    await listSessions(id)

  const sessions =
    (rawSessions || []).map(
      (session: any) => ({
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

        attendees:
          Array.isArray(
            session.attendees,
          )
            ? session.attendees
            : [],
      }),
    )

  /*
   * ============================================================
   * LOAD CURRICULUM MODULES
   * ============================================================
   *
   * Sessions can optionally belong to a specific
   * Curriculum Roadmap module.
   *
   * This keeps the relationship:
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
    (rawModules || [])
      .map(
        (module: any) => ({
          id: String(
            module.id,
          ),

          title:
            module.title
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
            a.module_order || 0,
          ) -
          Number(
            b.module_order || 0,
          ),
      )

  /*
   * ============================================================
   * CURRENT USER PROFILE
   * ============================================================
   */

  const profileRes =
    await query<{ id: string }>(
      `
        SELECT id
        FROM user_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [user.id],
    )

  const profileId =
    profileRes.rows[0]?.id ||
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
   *   Full session management for this engagement.
   *
   * Normal Administrator:
   *   View only unless approved as trainer.
   *
   * Investigator / Analyst:
   *   Manage only when approved trainer.
   *
   * Client:
   *   View schedule and respond to attendance.
   */

  let canManageSessions =
    false

  if (
    isSuperAdminRole(
      user.role,
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

        {user.role ===
          "client" && (
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
              user.role ===
              "client"
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