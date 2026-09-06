import { query } from "@/lib/db"
import { completeTrainingEngagement } from "@/lib/services/training-completion-service"
import {
  notifyUser,
  notifyTrainingClient,
} from "@/lib/services/notification-service"
import { generateICS } from "@/lib/utils/ics"
import { sendEmail } from "@/lib/email"
import {
  syncTrainingSessionToGoogle,
  cancelTrainingSessionCalendarEvent,
} from "@/lib/services/calendar-service"

type AppUser = {
  id: string
  role: string
}

const TRAINER_APPROVAL_APPROVED = "approved"
const TRAINER_APPROVAL_PENDING =
  "pending_super_admin_approval"

function isSuperAdminRole(
  role: string | null | undefined,
): boolean {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function isTrainerCapableRole(
  role: string | null | undefined,
): boolean {
  return [
    "investigator",
    "analyst",
    "administrator",
    "super_administrator",
    "super-administrator",
  ].includes(role || "")
}

async function getEngagementTrainerState(
  engagementId: string,
) {
  const result = await query<{
    assigned_trainer: string | null
    trainer_approval_status: string | null
    trainer_approval_requested_by: string | null
    trainer_approval_approved_by: string | null
  }>(
    `
      SELECT
        assigned_trainer,
        trainer_approval_status,
        trainer_approval_requested_by,
        trainer_approval_approved_by
      FROM training_engagements
      WHERE id = $1
      LIMIT 1
    `,
    [engagementId],
  )

  return result.rows[0] || null
}

async function getUserRoleByProfileId(
  profileId: string | null,
): Promise<string | null> {
  if (!profileId) {
    return null
  }

  const result = await query<{ role: string | null }>(
    `
      SELECT au.role
      FROM user_profiles up
      JOIN app_users au
        ON au.id = up.user_id
      WHERE up.id = $1
      LIMIT 1
    `,
    [profileId],
  )

  return result.rows[0]?.role || null
}

export async function isApprovedTrainerForEngagement(
  engagementId: string,
  user: { id: string; role: string } | null,
  profileId?: string | null,
): Promise<boolean> {
  if (!user) {
    return false
  }

  if (isSuperAdminRole(user.role)) {
    return true
  }

  const currentProfileId =
    profileId || (await getUserProfileId(user.id))

  if (!currentProfileId) {
    return false
  }

  const engagement =
    await getEngagementTrainerState(engagementId)

  if (!engagement) {
    return false
  }

  return (
    engagement.assigned_trainer === currentProfileId &&
    engagement.trainer_approval_status ===
      TRAINER_APPROVAL_APPROVED
  )
}

export async function requireApprovedTrainerForEngagement(
  engagementId: string,
  actorProfileId: string | null,
): Promise<void> {
  if (!actorProfileId) {
    throw new Error("Trainer profile is required")
  }

  const engagement =
    await getEngagementTrainerState(engagementId)

  if (!engagement) {
    throw new Error("Training engagement not found")
  }

  if (
    engagement.assigned_trainer !== actorProfileId ||
    engagement.trainer_approval_status !==
      TRAINER_APPROVAL_APPROVED
  ) {
    throw new Error(
      "This user is not the approved trainer for this engagement",
    )
  }
}

export async function requireTrainingOperatorForEngagement(
  engagementId: string,
  actor: AppUser | null,
  actorProfileId: string | null,
): Promise<void> {
  if (!actor) {
    throw new Error("Unauthorized")
  }

  if (isSuperAdminRole(actor.role)) {
    return
  }

  await requireApprovedTrainerForEngagement(
    engagementId,
    actorProfileId,
  )
}

async function requireTrainingOperatorByProfile(
  engagementId: string,
  actorProfileId: string | null,
): Promise<void> {
  if (!actorProfileId) {
    throw new Error("User profile is required")
  }

  const role =
    await getUserRoleByProfileId(actorProfileId)

  if (!role) {
    throw new Error("User role could not be determined")
  }

  if (isSuperAdminRole(role)) {
    return
  }

  await requireApprovedTrainerForEngagement(
    engagementId,
    actorProfileId,
  )
}

async function getUserProfileId(
  userId: string,
) {
  const result = await query<{ id: string }>(
    `
      SELECT id
      FROM user_profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  )

  return result.rows[0]?.id || null
}

export { getUserProfileId }

/* =======================================================
   Trainer Assignment
   ======================================================= */

export async function assignTrainer(
  engagementId: string,
  trainerProfileId: string,
  actorProfileId: string | null,
  actorRole?: string | null,
) {
  const engagement =
    await getEngagementTrainerState(engagementId)

  if (!engagement) {
    throw new Error("Training engagement not found")
  }

  const targetResult = await query<{
    role: string | null
    status: string | null
  }>(
    `
      SELECT
        au.role,
        au.status
      FROM user_profiles up
      JOIN app_users au
        ON au.id = up.user_id
      WHERE up.id = $1
      LIMIT 1
    `,
    [trainerProfileId],
  )

  const target = targetResult.rows[0]

  if (
    !target ||
    !target.role ||
    !isTrainerCapableRole(target.role) ||
    target.status !== "active"
  ) {
    throw new Error(
      "Target profile is not authorized to act as a trainer",
    )
  }

  const normalizedActorRole =
    actorRole || "administrator"

  if (isSuperAdminRole(normalizedActorRole)) {
    await query(
      `
        UPDATE training_engagements
        SET
          assigned_trainer = $1,
          pending_trainer_id = NULL,
          trainer_approval_status = $2,
          trainer_approval_requested_by =
            COALESCE(
              trainer_approval_requested_by,
              $3
            ),
          trainer_approval_approved_by = $4,
          updated_at = NOW()
        WHERE id = $5
      `,
      [
        trainerProfileId,
        TRAINER_APPROVAL_APPROVED,
        actorProfileId,
        actorProfileId,
        engagementId,
      ],
    )
  } else if (
    normalizedActorRole === "administrator"
  ) {
    await query(
      `
        UPDATE training_engagements
        SET
          assigned_trainer = NULL,
          pending_trainer_id = $1,
          trainer_approval_status = $2,
          trainer_approval_requested_by =
            COALESCE(
              trainer_approval_requested_by,
              $3
            ),
          trainer_approval_approved_by = NULL,
          updated_at = NOW()
        WHERE id = $4
      `,
      [
        trainerProfileId,
        TRAINER_APPROVAL_PENDING,
        actorProfileId,
        engagementId,
      ],
    )
  } else {
    throw new Error("Forbidden")
  }

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    isSuperAdminRole(normalizedActorRole)
      ? "trainer_assigned"
      : "trainer_assignment_requested",
    isSuperAdminRole(normalizedActorRole)
      ? "Trainer Assigned"
      : "Trainer Assignment Requested",
    isSuperAdminRole(normalizedActorRole)
      ? `Trainer profile ${trainerProfileId} has been approved and assigned to the engagement.`
      : `Trainer profile ${trainerProfileId} was proposed and sent to Super Administrator approval.`,
  )

  return {
    success: true,
  }
}

/* =======================================================
   Training Updates
   ======================================================= */

async function createTrainingUpdate(
  trainingEngagementId: string,
  updatedBy: string | null,
  updateType: string,
  title: string,
  content: string,
) {
  /*
   * Training updates are the authoritative activity
   * stream for the training engagement.
   */

  await query(
    `
      INSERT INTO training_updates (
        training_engagement_id,
        updated_by,
        update_type,
        title,
        content
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      trainingEngagementId,
      updatedBy,
      updateType,
      title,
      content,
    ],
  )

  /*
   * Every meaningful training update also becomes a
   * client notification.
   *
   * This keeps the notification system centralized instead
   * of requiring every individual operation to remember
   * to call notifyUser().
   */
  await notifyTrainingClient(
    trainingEngagementId,
    {
      type: `training_${updateType}`,
      title,
      message: content,
      metadata: {
        training_engagement_id:
          trainingEngagementId,
        training_update_type:
          updateType,
        updated_by:
          updatedBy,
      },
    },
  )
}

/* =======================================================
   Access Control
   ======================================================= */

async function ensureAccess(
  engagementId: string,
  user: AppUser | null,
  allowTrainer = false,
): Promise<{
  profileId: string | null
  role: string | null
}> {
  if (!user) {
    throw new Error("Unauthorized")
  }

  const res = await query<{
    client_profile_id: string | null
    assigned_trainer: string | null
    trainer_approval_status: string | null
  }>(
    `
      SELECT
        client_profile_id,
        assigned_trainer,
        trainer_approval_status
      FROM training_engagements
      WHERE id = $1
      LIMIT 1
    `,
    [engagementId],
  )

  const engagement = res.rows[0]

  if (!engagement) {
    throw new Error("Training engagement not found")
  }

  const profileId =
    await getUserProfileId(user.id)

  if (isSuperAdminRole(user.role)) {
    return {
      profileId,
      role: user.role,
    }
  }

  if (user.role === "administrator") {
    if (allowTrainer) {
      const isAssignedApprovedTrainer =
        Boolean(profileId) &&
        engagement.assigned_trainer ===
          profileId &&
        engagement.trainer_approval_status ===
          TRAINER_APPROVAL_APPROVED

      if (!isAssignedApprovedTrainer) {
        throw new Error(
          "This administrator is not the approved trainer for this engagement",
        )
      }
    }

    return {
      profileId,
      role: user.role,
    }
  }

  if (
    user.role === "investigator" ||
    user.role === "analyst"
  ) {
    const isTrainerApproved =
      Boolean(profileId) &&
      engagement.assigned_trainer ===
        profileId &&
      engagement.trainer_approval_status ===
        TRAINER_APPROVAL_APPROVED

    if (!isTrainerApproved) {
      throw new Error(
        "This user is not the approved trainer for this engagement",
      )
    }

    return {
      profileId,
      role: user.role,
    }
  }

  if (user.role === "client") {
    if (
      profileId &&
      engagement.client_profile_id ===
        profileId
    ) {
      return {
        profileId,
        role: user.role,
      }
    }

    throw new Error("Forbidden")
  }

  throw new Error("Forbidden")
}

export { ensureAccess, syncTrainingSessionToGoogle }

/* =======================================================
   Modules
   ======================================================= */

export async function listModules(
  engagementId: string,
) {
  const result = await query(
    `
      SELECT *
      FROM training_modules
      WHERE training_engagement_id = $1
      ORDER BY
        module_order ASC,
        created_at ASC
    `,
    [engagementId],
  )

  return result.rows
}

export async function createModule(
  engagementId: string,
  payload: {
    title: string
    description?: string
    objectives?: string
    module_order?: number
  },
  actorProfileId: string | null,
) {
  await requireTrainingOperatorByProfile(
    engagementId,
    actorProfileId,
  )

  if (!payload.title?.trim()) {
    throw new Error("Module title is required")
  }

  const result = await query(
    `
      INSERT INTO training_modules (
        training_engagement_id,
        title,
        description,
        objectives,
        module_order,
        status,
        completion_percentage,
        created_by,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'not_started',
        0,
        $6,
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      engagementId,
      payload.title.trim(),
      payload.description || null,
      payload.objectives || null,
      payload.module_order || 0,
      actorProfileId,
    ],
  )

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "module_created",
    `Module Created: ${payload.title}`,
    `Module '${payload.title}' was created by a trainer or training administrator.`,
  )

  return result.rows[0]
}

export async function updateModule(
  moduleId: string,
  updates: any,
  actorProfileId: string | null,
) {
  const moduleRow =
    await query<{
      training_engagement_id: string
    }>(
      `
        SELECT training_engagement_id
        FROM training_modules
        WHERE id = $1
        LIMIT 1
      `,
      [moduleId],
    )

  if (!moduleRow.rows[0]) {
    throw new Error("Module not found")
  }

  await requireTrainingOperatorByProfile(
    moduleRow.rows[0].training_engagement_id,
    actorProfileId,
  )

  const fields: string[] = []
  const values: any[] = []
  let ix = 1

  for (const key of [
    "title",
    "description",
    "objectives",
    "module_order",
    "status",
    "completion_percentage",
  ]) {
    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        key,
      )
    ) {
      fields.push(`${key} = $${ix}`)
      values.push(updates[key])
      ix++
    }
  }

  if (fields.length === 0) {
    throw new Error("No updates provided")
  }

  values.push(moduleId)

  const sql = `
    UPDATE training_modules
    SET
      ${fields.join(", ")},
      updated_at = NOW()
    WHERE id = $${ix}
    RETURNING *
  `

  const res =
    await query<{
      training_engagement_id: string
      title: string
    }>(sql, values)

  if (!res.rows[0]) {
    throw new Error("Module not found")
  }

  if (
    updates.status !== undefined ||
    updates.completion_percentage !== undefined
  ) {
    await createTrainingUpdate(
      res.rows[0].training_engagement_id,
      actorProfileId,
      "module_updated",
      `Module Updated: ${res.rows[0].title}`,
      `Module '${res.rows[0].title}' was updated.`,
    )
  }

  return res.rows[0]
}

export async function deleteModule(
  moduleId: string,
  actorProfileId: string | null,
) {
  const mod =
    await query<{
      training_engagement_id: string
      title: string
    }>(
      `
        SELECT
          training_engagement_id,
          title
        FROM training_modules
        WHERE id = $1
        LIMIT 1
      `,
      [moduleId],
    )

  if (!mod.rows[0]) {
    throw new Error("Module not found")
  }

  await requireTrainingOperatorByProfile(
    mod.rows[0].training_engagement_id,
    actorProfileId,
  )

  await query(
    `
      DELETE FROM training_modules
      WHERE id = $1
    `,
    [moduleId],
  )

  await createTrainingUpdate(
    mod.rows[0].training_engagement_id,
    actorProfileId,
    "module_deleted",
    `Module Deleted: ${mod.rows[0].title}`,
    "Module deleted by trainer or training administrator.",
  )

  return {
    success: true,
  }
}

/* =======================================================
   Sessions
   ======================================================= */

async function getTrainingSessionCalendarSynced(
  sessionId: string,
): Promise<boolean> {
  try {
    const result = await query<{ id: string }>(
      `
        SELECT id
        FROM training_session_calendar_events
        WHERE training_session_id = $1
        LIMIT 1
      `,
      [sessionId],
    )

    return Boolean(result.rows[0])
  } catch (error) {
    console.error(
      "TRAINING SESSION CALENDAR STATE ERROR:",
      error,
    )
    return false
  }
}

async function attachCalendarSyncState<T extends { id: string }>(
  session: T,
) {
  return {
    ...session,
    calendar_synced:
      await getTrainingSessionCalendarSynced(session.id),
  }
}

export async function listSessions(
  engagementId: string,
) {
  type TrainingSessionQueryRow = {
  id: string
  [key: string]: unknown
}

const res = await query<TrainingSessionQueryRow>(
  `
    SELECT
      ts.*,
      COALESCE(
        att.attendees,
        '[]'::json
      ) AS attendees
    FROM training_sessions ts
    LEFT JOIN (
      SELECT
        session_id,
        json_agg(
          json_build_object(
            'id', id,
            'profile_id', profile_id,
            'user_id', user_id,
            'email', email,
            'partstat', partstat,
            'responded_at', responded_at
          )
        ) AS attendees
      FROM training_session_attendees
      WHERE training_engagement_id = $1
      GROUP BY session_id
    ) att
      ON att.session_id = ts.id
    WHERE ts.training_engagement_id = $1
    ORDER BY ts.scheduled_at NULLS LAST
  `,
  [engagementId],
)

return Promise.all(
  res.rows.map((session) =>
    attachCalendarSyncState(session),
  ),
)
}

export async function createSession(
  engagementId: string,
  payload: any,
  actorOrProfile: AppUser | string | null,
  actorProfileId?: string | null,
) {
  let actor: AppUser | null = null
  let profileId: string | null = null

  if (
    actorOrProfile &&
    typeof actorOrProfile === "object"
  ) {
    actor = actorOrProfile
    profileId = actorProfileId || null
  } else {
    profileId =
      typeof actorOrProfile === "string"
        ? actorOrProfile
        : null

    const role =
      await getUserRoleByProfileId(profileId)

    if (role) {
      actor = {
        id: "",
        role,
      }
    }
  }

  if (!actor) {
    throw new Error("Unauthorized")
  }

  await requireTrainingOperatorForEngagement(
    engagementId,
    actor,
    profileId,
  )

  const engagementTrainer =
    await getEngagementTrainerState(engagementId)

  const assignedTrainerId =
    engagementTrainer?.assigned_trainer || null

  const sessionTrainerId =
    payload.trainer_id || assignedTrainerId || null

  const res = await query(
    `
      INSERT INTO training_sessions (
        training_engagement_id,
        module_id,
        trainer_id,
        scheduled_at,
        duration_minutes,
        session_type,
        meeting_url,
        location,
        status,
        attendance_status,
        session_notes,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      engagementId,
      payload.module_id || null,
      sessionTrainerId,
      payload.scheduled_at || null,
      payload.duration_minutes || null,
      payload.session_type || null,
      payload.meeting_url || null,
      payload.location || null,
      payload.status || "scheduled",
      payload.attendance_status || "pending",
      payload.session_notes || null,
    ],
  )

  const session: any = res.rows[0]

  await createTrainingUpdate(
    engagementId,
    profileId,
    "session_scheduled",
    "Session Scheduled",
    "A training session has been scheduled.",
  )

  /*
   * Google Calendar synchronization.
   *
   * This is intentionally best-effort. A training session
   * must still be created even when the client has not
   * connected Google Calendar.
   *
   * ICS generation/email remains the fallback.
   */
  try {
    await syncTrainingSessionToGoogle(
      session.id,
    )
  } catch (calendarError) {
    console.error(
      "GOOGLE CALENDAR CREATE SYNC ERROR:",
      calendarError,
    )
  }

  try {
    const start: string | null =
      session.scheduled_at
        ? String(session.scheduled_at)
        : null

    let end: string | null = null

    if (
      session.duration_minutes &&
      start
    ) {
      end = new Date(
        new Date(start).getTime() +
          Number(session.duration_minutes) *
            60000,
      ).toISOString()
    }

    const title = String(
      session.session_notes ||
        session.session_type ||
        "Training Session",
    )

    const e =
      await query<{
        client_profile_id: string | null
      }>(
        `
          SELECT client_profile_id
          FROM training_engagements
          WHERE id = $1
          LIMIT 1
        `,
        [engagementId],
      )

    const clientProfileId =
      e.rows[0]?.client_profile_id || null

    let trainerEmail: string | null = null

    if (session.trainer_id) {
      const t =
        await query<{
          email: string | null
        }>(
          `
            SELECT u.email
            FROM user_profiles up
            JOIN app_users u
              ON u.id = up.user_id
            WHERE up.id = $1
            LIMIT 1
          `,
          [session.trainer_id],
        )

      trainerEmail =
        t.rows[0]?.email || null
    }

    let clientEmail: string | null = null

    if (clientProfileId) {
      const c =
        await query<{
          email: string | null
        }>(
          `
            SELECT u.email
            FROM user_profiles up
            JOIN app_users u
              ON u.id = up.user_id
            WHERE up.id = $1
            LIMIT 1
          `,
          [clientProfileId],
        )

      clientEmail =
        c.rows[0]?.email || null
    }

    const usersToNotify:
      (string | null)[] = []

    if (session.trainer_id) {
      const t =
        await query<{
          user_id: string | null
        }>(
          `
            SELECT user_id
            FROM user_profiles
            WHERE id = $1
            LIMIT 1
          `,
          [session.trainer_id],
        )

      if (t.rows[0]?.user_id) {
        usersToNotify.push(
          t.rows[0].user_id,
        )
      }
    }

    if (clientProfileId) {
      const c =
        await query<{
          user_id: string | null
        }>(
          `
            SELECT user_id
            FROM user_profiles
            WHERE id = $1
            LIMIT 1
          `,
          [clientProfileId],
        )

      if (c.rows[0]?.user_id) {
        usersToNotify.push(
          c.rows[0].user_id,
        )
      }
    }

    const attendees =
      [] as {
        name?: string
        email: string
        rsvp?: boolean
      }[]

    if (trainerEmail) {
      attendees.push({
        email: trainerEmail,
        rsvp: true,
      })
    }

    if (clientEmail) {
      attendees.push({
        email: clientEmail,
        rsvp: true,
      })
    }

    try {
      const persistPromises: Promise<any>[] = []

      if (trainerEmail) {
        const tuser =
          await query<{
            user_id: string | null
          }>(
            `
              SELECT user_id
              FROM user_profiles
              WHERE id = $1
              LIMIT 1
            `,
            [session.trainer_id],
          )

        const trainerUserId =
          tuser.rows[0]?.user_id || null

        if (trainerUserId) {
          persistPromises.push(
            query(
              `
                INSERT INTO training_session_attendees (
                  session_id,
                  training_engagement_id,
                  profile_id,
                  user_id,
                  email,
                  partstat,
                  created_at,
                  updated_at
                )
                VALUES (
                  $1,$2,$3,$4,$5,$6,NOW(),NOW()
                )
                ON CONFLICT (
                  session_id,
                  user_id
                )
                DO NOTHING
              `,
              [
                session.id,
                engagementId,
                session.trainer_id || null,
                trainerUserId,
                trainerEmail,
                session.attendance_status ||
                  null,
              ],
            ),
          )
        }
      }

      if (clientEmail) {
        const cuser =
          await query<{
            user_id: string | null
          }>(
            `
              SELECT user_id
              FROM user_profiles
              WHERE id = $1
              LIMIT 1
            `,
            [clientProfileId],
          )

        const clientUserId =
          cuser.rows[0]?.user_id || null

        if (clientUserId) {
          persistPromises.push(
            query(
              `
                INSERT INTO training_session_attendees (
                  session_id,
                  training_engagement_id,
                  profile_id,
                  user_id,
                  email,
                  partstat,
                  created_at,
                  updated_at
                )
                VALUES (
                  $1,$2,$3,$4,$5,$6,NOW(),NOW()
                )
                ON CONFLICT (
                  session_id,
                  user_id
                )
                DO NOTHING
              `,
              [
                session.id,
                engagementId,
                clientProfileId || null,
                clientUserId,
                clientEmail,
                session.attendance_status ||
                  null,
              ],
            ),
          )
        }
      }

      await Promise.all(
        persistPromises,
      )
    } catch {
      // Do not block session creation.
    }

    const organizerEmail =
      process.env.EMAIL_FROM || null

    const organizerName =
      process.env.EMAIL_FROM_NAME ||
      "ShadowNode"

    const ics = generateICS({
      uid: `training-session-${String(
        session.id,
      )}`,
      title,
      description:
        session.session_notes
          ? String(
              session.session_notes,
            )
          : undefined,
      start,
      end,
      url: session.meeting_url
        ? String(session.meeting_url)
        : null,
      location: session.location
        ? String(session.location)
        : null,
      method: "REQUEST",
      organizer: organizerEmail
        ? {
            email: organizerEmail,
            name: organizerName,
          }
        : undefined,
      attendees: attendees.length
        ? attendees.map((a) => ({
            ...a,
            partstat:
              session.attendance_status ||
              undefined,
          }))
        : undefined,
      sequence:
        session.sequence || 0,
    })

    const trainerNotificationUserIds =
      usersToNotify.length > 0 && session.trainer_id
        ? (
            await query<{ user_id: string | null }>(
              `
                SELECT user_id
                FROM user_profiles
                WHERE id = $1
                LIMIT 1
              `,
              [session.trainer_id],
            )
          ).rows
            .map((row) => row.user_id)
            .filter(Boolean)
        : []

    await Promise.all(
      trainerNotificationUserIds.map((uid) =>
        notifyUser(uid, {
          type:
            "training_session_scheduled",
          title:
            "Training session scheduled",
          message:
            `A training session has been scheduled: ${title}`,
          metadata: {
            training_session_id:
              session.id,
            training_engagement_id:
              engagementId,
            target_page:
              "client_training_schedule",
            ics_url:
              `/api/training/session/${session.id}/ics`,
            ics,
          },
        }),
      ),
    )

    try {
      const uniqueUserIds =
        Array.from(
          new Set(
            usersToNotify.filter(Boolean),
          ),
        ) as string[]

      await Promise.all(
        uniqueUserIds.map(
          async (userId) => {
            const ures =
              await query<{
                email: string | null
              }>(
                `
                  SELECT email
                  FROM app_users
                  WHERE id = $1
                  LIMIT 1
                `,
                [userId],
              )

            const email =
              ures.rows[0]?.email || null

            if (!email) return

            const b64 =
              Buffer.from(ics).toString(
                "base64",
              )

            await sendEmail({
              to: email,
              subject:
                `Training session scheduled: ${title}`,
              html:
                `<p>${title}</p>` +
                `<p>Scheduled: ${
                  start
                    ? new Date(
                        start,
                      ).toLocaleString()
                    : "TBD"
                }</p>` +
                `<p><a href="${
                  session.meeting_url ||
                  "#"
                }">Join meeting</a></p>`,
              attachments: [
                {
                  filename:
                    `training-session-${session.id}.ics`,
                  type: "text/calendar",
                  data: b64,
                },
              ],
            }).catch(
              () => undefined,
            )
          },
        ),
      )
    } catch {
      // Ignore email errors.
    }
  } catch (notifyErr) {
    console.error(
      "SESSION NOTIFY ERROR",
      notifyErr,
    )
  }

  return attachCalendarSyncState(session)
}

export async function updateSession(
  sessionId: string,
  updates: any,
  actorProfileId: string | null,
) {
  const sessionRow =
    await query<{
      training_engagement_id: string
    }>(
      `
        SELECT training_engagement_id
        FROM training_sessions
        WHERE id = $1
        LIMIT 1
      `,
      [sessionId],
    )

  if (!sessionRow.rows[0]) {
    throw new Error("Session not found")
  }

  const engagementId =
    sessionRow.rows[0].training_engagement_id

  const actorRole =
    await getUserRoleByProfileId(
      actorProfileId,
    )

  if (!actorRole) {
    throw new Error(
      "User role could not be determined",
    )
  }

  await requireTrainingOperatorByProfile(
    engagementId,
    actorProfileId,
  )

  const fields: string[] = []
  const values: any[] = []
  let ix = 1

  for (const key of [
    "module_id",
    "trainer_id",
    "scheduled_at",
    "duration_minutes",
    "session_type",
    "meeting_url",
    "location",
    "status",
    "attendance_status",
    "session_notes",
  ]) {
    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        key,
      )
    ) {
      fields.push(`${key} = $${ix}`)
      values.push(updates[key])
      ix++
    }
  }

  if (fields.length === 0) {
    throw new Error("No updates provided")
  }

  values.push(sessionId)

  const sql = `
    UPDATE training_sessions
    SET
      ${fields.join(", ")},
      sequence = COALESCE(sequence, 0) + 1,
      updated_at = NOW()
    WHERE id = $${ix}
    RETURNING *
  `

  const res =
    await query<any>(
      sql,
      values,
    )

  if (!res.rows[0]) {
    throw new Error("Session not found")
  }

  const session: any =
    res.rows[0]

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "session_updated",
    "Session Updated",
    "Training session updated by trainer or training administrator.",
  )

  /*
   * Update the connected Google Calendar event.
   *
   * If the client has no Google Calendar connection,
   * this simply becomes a no-op/error handled by the
   * calendar service. The session update itself remains
   * successful.
   */
  try {
    await syncTrainingSessionToGoogle(
      session.id,
    )
  } catch (calendarError) {
    console.error(
      "GOOGLE CALENDAR UPDATE SYNC ERROR:",
      calendarError,
    )
  }

  try {
    const start: string | null =
      session.scheduled_at
        ? String(session.scheduled_at)
        : null

    let end: string | null = null

    if (
      session.duration_minutes &&
      start
    ) {
      end = new Date(
        new Date(start).getTime() +
          Number(
            session.duration_minutes,
          ) *
            60000,
      ).toISOString()
    }

    const title = String(
      session.session_notes ||
        session.session_type ||
        "Training Session",
    )

    const e =
      await query<{
        client_profile_id: string | null
      }>(
        `
          SELECT client_profile_id
          FROM training_engagements
          WHERE id = $1
          LIMIT 1
        `,
        [engagementId],
      )

    const clientProfileId =
      e.rows[0]?.client_profile_id ||
      null

    let trainerEmail: string | null =
      null

    if (session.trainer_id) {
      const t =
        await query<{
          email: string | null
        }>(
          `
            SELECT u.email
            FROM user_profiles up
            JOIN app_users u
              ON u.id = up.user_id
            WHERE up.id = $1
            LIMIT 1
          `,
          [session.trainer_id],
        )

      trainerEmail =
        t.rows[0]?.email || null
    }

    let clientEmail: string | null =
      null

    if (clientProfileId) {
      const c =
        await query<{
          email: string | null
        }>(
          `
            SELECT u.email
            FROM user_profiles up
            JOIN app_users u
              ON u.id = up.user_id
            WHERE up.id = $1
            LIMIT 1
          `,
          [clientProfileId],
        )

      clientEmail =
        c.rows[0]?.email || null
    }

    const usersToNotify:
      (string | null)[] = []

    if (session.trainer_id) {
      const t =
        await query<{
          user_id: string | null
        }>(
          `
            SELECT user_id
            FROM user_profiles
            WHERE id = $1
            LIMIT 1
          `,
          [session.trainer_id],
        )

      if (t.rows[0]?.user_id) {
        usersToNotify.push(
          t.rows[0].user_id,
        )
      }
    }

    if (clientProfileId) {
      const c =
        await query<{
          user_id: string | null
        }>(
          `
            SELECT user_id
            FROM user_profiles
            WHERE id = $1
            LIMIT 1
          `,
          [clientProfileId],
        )

      if (c.rows[0]?.user_id) {
        usersToNotify.push(
          c.rows[0].user_id,
        )
      }
    }

    const attendees =
      [] as {
        name?: string
        email: string
        rsvp?: boolean
      }[]

    if (trainerEmail) {
      attendees.push({
        email: trainerEmail,
        rsvp: true,
      })
    }

    if (clientEmail) {
      attendees.push({
        email: clientEmail,
        rsvp: true,
      })
    }

    const organizerEmail =
      process.env.EMAIL_FROM || null

    const organizerName =
      process.env.EMAIL_FROM_NAME ||
      "ShadowNode"

    const ics = generateICS({
      uid: `training-session-${String(
        session.id,
      )}`,
      title,
      description:
        session.session_notes
          ? String(
              session.session_notes,
            )
          : undefined,
      start,
      end,
      url: session.meeting_url
        ? String(session.meeting_url)
        : null,
      location: session.location
        ? String(session.location)
        : null,
      method: "REQUEST",
      organizer: organizerEmail
        ? {
            email: organizerEmail,
            name: organizerName,
          }
        : undefined,
      attendees: attendees.length
        ? attendees.map((a) => ({
            ...a,
            partstat:
              session.attendance_status ||
              undefined,
          }))
        : undefined,
      sequence:
        session.sequence || 0,
    })

    const trainerNotificationUserIds =
      usersToNotify.length > 0 && session.trainer_id
        ? (
            await query<{ user_id: string | null }>(
              `
                SELECT user_id
                FROM user_profiles
                WHERE id = $1
                LIMIT 1
              `,
              [session.trainer_id],
            )
          ).rows
            .map((row) => row.user_id)
            .filter(Boolean)
        : []

    await Promise.all(
      trainerNotificationUserIds.map((uid) =>
        notifyUser(uid, {
          type:
            "training_session_updated",
          title:
            "Training session updated",
          message:
            `A training session was updated: ${title}`,
          metadata: {
            training_session_id:
              session.id,
            training_engagement_id:
              engagementId,
            target_page:
              "client_training_schedule",
            ics_url:
              `/api/training/session/${session.id}/ics`,
            ics,
          },
        }),
      ),
    )

    try {
      const uniqueUserIds =
        Array.from(
          new Set(
            usersToNotify.filter(Boolean),
          ),
        ) as string[]

      await Promise.all(
        uniqueUserIds.map(
          async (userId) => {
            const ures =
              await query<{
                email: string | null
              }>(
                `
                  SELECT email
                  FROM app_users
                  WHERE id = $1
                  LIMIT 1
                `,
                [userId],
              )

            const email =
              ures.rows[0]?.email || null

            if (!email) return

            const b64 =
              Buffer.from(ics).toString(
                "base64",
              )

            await sendEmail({
              to: email,
              subject:
                `Training session updated: ${title}`,
              html:
                `<p>${title}</p>` +
                `<p>Scheduled: ${
                  start
                    ? new Date(
                        start,
                      ).toLocaleString()
                    : "TBD"
                }</p>` +
                `<p><a href="${
                  session.meeting_url ||
                  "#"
                }">Join meeting</a></p>`,
              attachments: [
                {
                  filename:
                    `training-session-${session.id}.ics`,
                  type: "text/calendar",
                  data: b64,
                },
              ],
            }).catch(
              () => undefined,
            )
          },
        ),
      )
    } catch {
      // Ignore email errors.
    }
  } catch (notifyErr) {
    console.error(
      "SESSION UPDATE NOTIFY ERROR",
      notifyErr,
    )
  }

  return attachCalendarSyncState(session)
}

export async function deleteSession(
  sessionId: string,
  actorProfileId: string | null,
) {
  const sres = await query(
    `
      SELECT *
      FROM training_sessions
      WHERE id = $1
      LIMIT 1
    `,
    [sessionId],
  )

  const session: any =
    sres.rows[0]

  if (!session) {
    throw new Error("Session not found")
  }

  await requireTrainingOperatorByProfile(
    session.training_engagement_id,
    actorProfileId,
  )

  /*
   * Cancel the Google Calendar event before deleting
   * the local session.
   */
  try {
    await cancelTrainingSessionCalendarEvent(
      session.id,
    )
  } catch (calendarError) {
    console.error(
      "GOOGLE CALENDAR CANCEL ERROR:",
      calendarError,
    )
  }

  try {
    const start: string | null =
      session.scheduled_at
        ? String(session.scheduled_at)
        : null

    let end: string | null = null

    if (
      session.duration_minutes &&
      start
    ) {
      end = new Date(
        new Date(start).getTime() +
          Number(
            session.duration_minutes,
          ) *
            60000,
      ).toISOString()
    }

    let trainerEmail: string | null =
      null

    if (session.trainer_id) {
      const t =
        await query<{
          email: string | null
        }>(
          `
            SELECT u.email
            FROM user_profiles up
            JOIN app_users u
              ON u.id = up.user_id
            WHERE up.id = $1
            LIMIT 1
          `,
          [session.trainer_id],
        )

      trainerEmail =
        t.rows[0]?.email || null
    }

    let clientEmail: string | null =
      null

    const e =
      await query<{
        client_profile_id: string | null
      }>(
        `
          SELECT client_profile_id
          FROM training_engagements
          WHERE id = $1
          LIMIT 1
        `,
        [session.training_engagement_id],
      )

    const clientProfileId =
      e.rows[0]?.client_profile_id ||
      null

    if (clientProfileId) {
      const c =
        await query<{
          email: string | null
        }>(
          `
            SELECT u.email
            FROM user_profiles up
            JOIN app_users u
              ON u.id = up.user_id
            WHERE up.id = $1
            LIMIT 1
          `,
          [clientProfileId],
        )

      clientEmail =
        c.rows[0]?.email || null
    }

    const attendees =
      [] as {
        name?: string
        email: string
        rsvp?: boolean
      }[]

    if (trainerEmail) {
      attendees.push({
        email: trainerEmail,
      })
    }

    if (clientEmail) {
      attendees.push({
        email: clientEmail,
      })
    }

    const organizerEmail =
      process.env.EMAIL_FROM || null

    const organizerName =
      process.env.EMAIL_FROM_NAME ||
      "ShadowNode"

    const ics = generateICS({
      uid: `training-session-${String(
        session.id,
      )}`,
      title:
        session.session_notes ||
        session.session_type ||
        "Training Session",
      description:
        session.session_notes ||
        undefined,
      start,
      end,
      url:
        session.meeting_url ||
        null,
      location:
        session.location ||
        null,
      method: "CANCEL",
      organizer: organizerEmail
        ? {
            email: organizerEmail,
            name: organizerName,
          }
        : undefined,
      attendees: attendees.length
        ? attendees
        : undefined,
      sequence:
        (session.sequence || 0) + 1,
    })

    const usersToNotify:
      (string | null)[] = []

    if (session.trainer_id) {
      const t =
        await query<{
          user_id: string | null
        }>(
          `
            SELECT user_id
            FROM user_profiles
            WHERE id = $1
            LIMIT 1
          `,
          [session.trainer_id],
        )

      if (t.rows[0]?.user_id) {
        usersToNotify.push(
          t.rows[0].user_id,
        )
      }
    }

    if (clientProfileId) {
      const c =
        await query<{
          user_id: string | null
        }>(
          `
            SELECT user_id
            FROM user_profiles
            WHERE id = $1
            LIMIT 1
          `,
          [clientProfileId],
        )

      if (c.rows[0]?.user_id) {
        usersToNotify.push(
          c.rows[0].user_id,
        )
      }
    }

    const trainerNotificationUserIds =
      session.trainer_id
        ? (
            await query<{ user_id: string | null }>(
              `
                SELECT user_id
                FROM user_profiles
                WHERE id = $1
                LIMIT 1
              `,
              [session.trainer_id],
            )
          ).rows
            .map((row) => row.user_id)
            .filter(Boolean)
        : []

    await Promise.all(
      trainerNotificationUserIds.map((uid) =>
        notifyUser(uid, {
          type:
            "training_session_cancelled",
          title:
            "Training session cancelled",
          message:
            "A training session was cancelled.",
          metadata: {
            training_session_id:
              session.id,
            training_engagement_id:
              session.training_engagement_id,
            target_page:
              "client_training_schedule",
            ics_url:
              `/api/training/session/${session.id}/ics`,
            ics,
          },
        }),
      ),
    ).catch(() => undefined)

    try {
      const uniqueUserIds =
        Array.from(
          new Set(
            usersToNotify.filter(Boolean),
          ),
        ) as string[]

      await Promise.all(
        uniqueUserIds.map(
          async (userId) => {
            const ures =
              await query<{
                email: string | null
              }>(
                `
                  SELECT email
                  FROM app_users
                  WHERE id = $1
                  LIMIT 1
                `,
                [userId],
              )

            const email =
              ures.rows[0]?.email || null

            if (!email) return

            const b64 =
              Buffer.from(ics).toString(
                "base64",
              )

            await sendEmail({
              to: email,
              subject:
                `Training session cancelled: ${
                  session.session_notes ||
                  "Session"
                }`,
              html:
                `<p>The training session has been cancelled.</p>`,
              attachments: [
                {
                  filename:
                    `training-session-${session.id}.ics`,
                  type: "text/calendar",
                  data: b64,
                },
              ],
            }).catch(
              () => undefined,
            )
          },
        ),
      )
    } catch {
      // Ignore email errors.
    }
  } catch {
    // Ignore notification errors.
  }

  await query(
    `
      DELETE FROM training_sessions
      WHERE id = $1
    `,
    [sessionId],
  )

  await createTrainingUpdate(
    session.training_engagement_id,
    actorProfileId,
    "session_deleted",
    "Session Cancelled",
    "Session deleted by trainer or training administrator.",
  )

  return {
    success: true,
  }
}

/* =======================================================
   Materials
   ======================================================= */

export async function listMaterials(
  engagementId: string,
) {
  const res = await query(
    `
      SELECT *
      FROM training_materials
      WHERE training_engagement_id = $1
      ORDER BY created_at DESC
    `,
    [engagementId],
  )

  return res.rows
}

export async function createMaterial(
  engagementId: string,
  payload: any,
  actorProfileId: string | null,
) {
  await requireTrainingOperatorByProfile(
    engagementId,
    actorProfileId,
  )

  const res = await query(
    `
      INSERT INTO training_materials (
        training_engagement_id,
        module_id,
        title,
        description,
        material_type,
        file_url,
        external_url,
        visibility,
        uploaded_by,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      engagementId,
      payload.module_id || null,
      payload.title,
      payload.description || null,
      payload.material_type || "other",
      payload.file_url || null,
      payload.external_url || null,
      payload.visibility || "private",
      actorProfileId,
    ],
  )

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "material_uploaded",
    `Material Uploaded: ${payload.title}`,
    "A training material has been uploaded.",
  )

  return res.rows[0]
}

export async function updateMaterial(
  materialId: string,
  updates: any,
  actorProfileId: string | null,
) {
  const materialRow =
    await query<{
      training_engagement_id: string
    }>(
      `
        SELECT training_engagement_id
        FROM training_materials
        WHERE id = $1
        LIMIT 1
      `,
      [materialId],
    )

  if (!materialRow.rows[0]) {
    throw new Error("Material not found")
  }

  await requireTrainingOperatorByProfile(
    materialRow.rows[0]
      .training_engagement_id,
    actorProfileId,
  )

  const fields: string[] = []
  const values: any[] = []
  let ix = 1

  for (const key of [
    "title",
    "description",
    "material_type",
    "file_url",
    "external_url",
    "visibility",
  ]) {
    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        key,
      )
    ) {
      fields.push(`${key} = $${ix}`)
      values.push(updates[key])
      ix++
    }
  }

  if (fields.length === 0) {
    throw new Error("No updates provided")
  }

  values.push(materialId)

  const sql = `
    UPDATE training_materials
    SET
      ${fields.join(", ")},
      updated_at = NOW()
    WHERE id = $${ix}
    RETURNING *
  `

  const res =
    await query<{
      training_engagement_id: string
      title: string
    }>(
      sql,
      values,
    )

  if (!res.rows[0]) {
    throw new Error("Material not found")
  }

  await createTrainingUpdate(
    res.rows[0]
      .training_engagement_id,
    actorProfileId,
    "material_updated",
    `Material Updated: ${res.rows[0].title}`,
    "Material updated by trainer or training administrator.",
  )

  return res.rows[0]
}

export async function deleteMaterial(
  materialId: string,
  actorProfileId: string | null,
) {
  const m =
    await query<{
      training_engagement_id: string
      title: string
    }>(
      `
        SELECT
          training_engagement_id,
          title
        FROM training_materials
        WHERE id = $1
        LIMIT 1
      `,
      [materialId],
    )

  if (!m.rows[0]) {
    throw new Error("Material not found")
  }

  await requireTrainingOperatorByProfile(
    m.rows[0]
      .training_engagement_id,
    actorProfileId,
  )

  await query(
    `
      DELETE FROM training_materials
      WHERE id = $1
    `,
    [materialId],
  )

  await createTrainingUpdate(
    m.rows[0]
      .training_engagement_id,
    actorProfileId,
    "material_deleted",
    `Material Deleted: ${m.rows[0].title}`,
    "Material deleted by trainer or training administrator.",
  )

  return {
    success: true,
  }
}

/* =======================================================
   Progress
   ======================================================= */

export async function listModuleProgress(
  engagementId: string,
  clientProfileId?: string,
) {
  if (clientProfileId) {
    const res = await query(
      `
        SELECT *
        FROM training_module_progress
        WHERE training_engagement_id = $1
          AND client_profile_id = $2
        ORDER BY created_at ASC
      `,
      [
        engagementId,
        clientProfileId,
      ],
    )

    return res.rows
  }

  const res = await query(
    `
      SELECT *
      FROM training_module_progress
      WHERE training_engagement_id = $1
      ORDER BY created_at ASC
    `,
    [engagementId],
  )

  return res.rows
}

export async function upsertModuleProgress(
  engagementId: string,
  moduleId: string,
  clientProfileId: string,
  updates: {
    status?: string
    completion_percentage?: number
    trainer_notes?: string
  },
  actorProfileId: string | null,
) {
  await requireTrainingOperatorByProfile(
    engagementId,
    actorProfileId,
  )

  const actorRole =
    await getUserRoleByProfileId(
      actorProfileId,
    )

  if (!actorRole) {
    throw new Error(
      "User role could not be determined",
    )
  }

  const moduleCheck =
    await query<{
      id: string
    }>(
      `
        SELECT id
        FROM training_modules
        WHERE id = $1
          AND training_engagement_id = $2
        LIMIT 1
      `,
      [
        moduleId,
        engagementId,
      ],
    )

  if (!moduleCheck.rows[0]) {
    throw new Error(
      "Module does not belong to this training engagement",
    )
  }

  if (
    updates.completion_percentage !==
      undefined &&
    (
      Number.isNaN(
        Number(
          updates.completion_percentage,
        ),
      ) ||
      Number(
        updates.completion_percentage,
      ) < 0 ||
      Number(
        updates.completion_percentage,
      ) > 100
    )
  ) {
    throw new Error(
      "Completion percentage must be between 0 and 100",
    )
  }

  const existing =
    await query<{
      id: string
    }>(
      `
        SELECT id
        FROM training_module_progress
        WHERE training_engagement_id = $1
          AND module_id = $2
          AND client_profile_id = $3
        LIMIT 1
      `,
      [
        engagementId,
        moduleId,
        clientProfileId,
      ],
    )

  if (existing.rows[0]) {
    const fields: string[] = []
    const values: any[] = []
    let ix = 1

    if (
      updates.status !==
      undefined
    ) {
      fields.push(
        `status = $${ix}`,
      )
      values.push(
        updates.status,
      )
      ix++
    }

    if (
      updates.completion_percentage !==
      undefined
    ) {
      fields.push(
        `completion_percentage = $${ix}`,
      )
      values.push(
        updates.completion_percentage,
      )
      ix++
    }

    if (
      updates.trainer_notes !==
      undefined
    ) {
      fields.push(
        `trainer_notes = $${ix}`,
      )
      values.push(
        updates.trainer_notes,
      )
      ix++
    }

    if (fields.length === 0) {
      throw new Error(
        "No progress updates provided",
      )
    }

    values.push(
      actorProfileId,
    )

    const updatedByIndex =
      ix

    values.push(
      existing.rows[0].id,
    )

    const idIndex =
      updatedByIndex + 1

    const sql = `
      UPDATE training_module_progress
      SET
        ${fields.join(", ")},
        updated_by = $${updatedByIndex},
        updated_at = NOW()
      WHERE id = $${idIndex}
      RETURNING *
    `

    const res =
      await query(
        sql,
        values,
      )

    await recomputeEngagementProgress(
      engagementId,
      actorProfileId,
      actorRole,
    )

    await createTrainingUpdate(
      engagementId,
      actorProfileId,
      "progress_updated",
      "Module Progress Updated",
      "Progress updated for module.",
    )

    return res.rows[0]
  }

  const res = await query(
    `
      INSERT INTO training_module_progress (
        training_engagement_id,
        module_id,
        client_profile_id,
        status,
        completion_percentage,
        trainer_notes,
        updated_by,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      engagementId,
      moduleId,
      clientProfileId,
      updates.status ||
        "not_started",
      updates.completion_percentage ??
        0,
      updates.trainer_notes ||
        null,
      actorProfileId,
    ],
  )

  await recomputeEngagementProgress(
    engagementId,
    actorProfileId,
    actorRole,
  )

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "progress_created",
    "Module Progress Recorded",
    "Initial progress recorded for module.",
  )

  return res.rows[0]
}

/* =======================================================
   Progress / Completion
   ======================================================= */

async function recomputeEngagementProgress(
  engagementId: string,
  actorProfileId: string | null,
  actorRole: string,
) {
  const res =
    await query<{
      avg_completion: number
    }>(
      `
        SELECT
          AVG(completion_percentage) AS avg_completion
        FROM training_module_progress
        WHERE training_engagement_id = $1
      `,
      [engagementId],
    )

  const avg = Math.round(
    Number(
      res.rows[0]?.avg_completion ||
        0,
    ),
  )

  await query(
    `
      UPDATE training_engagements
      SET
        progress = $1,
        updated_at = NOW()
      WHERE id = $2
    `,
    [
      avg,
      engagementId,
    ],
  )

  if (avg < 100) {
    return
  }

  const e =
    await query<{
      assigned_trainer: string | null
      trainer_approval_status: string | null
    }>(
      `
        SELECT
          assigned_trainer,
          trainer_approval_status
        FROM training_engagements
        WHERE id = $1
        LIMIT 1
      `,
      [engagementId],
    )

  const assignedTrainer =
    e.rows[0]?.assigned_trainer ||
    null

  const approvalStatus =
    e.rows[0]?.trainer_approval_status ||
    null

  if (!assignedTrainer) {
    await createTrainingUpdate(
      engagementId,
      actorProfileId,
      "progress_complete",
      "Progress Reached 100%",
      "Overall progress reached 100% but no trainer is assigned. Assign a trainer to complete the engagement.",
    )

    return
  }

  /*
   * Only the approved assigned trainer can trigger
   * automatic completion from module progress.
   *
   * Super Administrator retains full authority through
   * the completion workflow, but is not falsely treated
   * as the assigned trainer here.
   */
  if (
    actorProfileId &&
    assignedTrainer === actorProfileId &&
    approvalStatus ===
      TRAINER_APPROVAL_APPROVED
  ) {
    try {
      await completeTrainingEngagement(
        engagementId,
        actorProfileId,
        actorRole,
      )

      await createTrainingUpdate(
        engagementId,
        actorProfileId,
        "auto_completion",
        "Training Completed",
        "Training was marked completed automatically after progress reached 100% by the approved assigned trainer.",
      )
    } catch (err: any) {
      await createTrainingUpdate(
        engagementId,
        actorProfileId,
        "completion_error",
        "Completion Error",
        `Automatic completion failed: ${String(
          err?.message || err,
        )}`,
      )
    }

    return
  }

  /*
   * Progress reached 100%, but the actor is not the
   * approved assigned trainer. Notify the trainer.
   */
  try {
    const trainerUser =
      await query<{
        user_id: string | null
      }>(
        `
          SELECT user_id
          FROM user_profiles
          WHERE id = $1
          LIMIT 1
        `,
        [assignedTrainer],
      )

    const trainerUserId =
      trainerUser.rows[0]?.user_id ||
      null

    if (trainerUserId) {
      await notifyUser(
        trainerUserId,
        {
          type:
            "training_progress_complete",
          title:
            "Training progress reached 100%",
          message:
            "Overall progress reached 100%. Please confirm completion of the training engagement.",
          metadata: {
            training_engagement_id:
              engagementId,
            action:
              "confirm_completion",
          },
        },
      )
    }
  } catch {
    // Ignore notification failure.
  }

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "progress_complete_pending",
    "Progress Reached 100%",
    "Overall progress reached 100%. Awaiting approved assigned trainer confirmation to complete the engagement.",
  )
}