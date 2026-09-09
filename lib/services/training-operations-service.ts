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

const MATERIAL_PROGRESS_MILESTONES = [
  1,
  25,
  50,
  75,
  100,
]

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

function normalizePercentage(
  value: unknown,
): number {
  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    return 0
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(numeric),
    ),
  )
}

function getProgressMilestone(
  percentage: number,
): number {
  const normalized =
    normalizePercentage(percentage)

  let milestone = 0

  for (
    const threshold of MATERIAL_PROGRESS_MILESTONES
  ) {
    if (normalized >= threshold) {
      milestone = threshold
    }
  }

  return milestone
}

function shouldCreateMaterialProgressUpdate(
  previousPercentage: number,
  previousStatus: string | null | undefined,
  nextPercentage: number,
  nextStatus: string,
): {
  shouldCreate: boolean
  updateType:
    | "material_started"
    | "material_progress_updated"
    | "material_completed"
} {
  const previous =
    normalizePercentage(previousPercentage)

  const next =
    normalizePercentage(nextPercentage)

  const previousMilestone =
    getProgressMilestone(previous)

  const nextMilestone =
    getProgressMilestone(next)

  if (
    nextStatus === "completed" &&
    previousStatus !== "completed"
  ) {
    return {
      shouldCreate: true,
      updateType: "material_completed",
    }
  }

  if (
    previousStatus === "not_started" &&
    next > 0
  ) {
    return {
      shouldCreate: true,
      updateType: "material_started",
    }
  }

  if (
    nextMilestone > previousMilestone
  ) {
    return {
      shouldCreate: true,
      updateType: "material_progress_updated",
    }
  }

  return {
    shouldCreate: false,
    updateType: "material_progress_updated",
  }
}

/* =======================================================
   Trainer State
   ======================================================= */

async function getEngagementTrainerState(
  engagementId: string,
) {
  const engagementResult =
    await query<{
      assigned_trainer: string | null
      trainer_approval_status: string | null
      trainer_approval_requested_by:
        | string
        | null
      trainer_approval_approved_by:
        | string
        | null
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

  if (!engagementResult.rows[0]) {
    return null
  }

  const trainersResult =
    await query<{
      id: string
      trainer_profile_id: string
      assignment_status: string
      assigned_by: string | null
      approval_requested_by:
        | string
        | null
      approved_by: string | null
      approval_reason: string | null
      assigned_at: string | null
      approved_at: string | null
      removed_at: string | null
    }>(
      `
        SELECT
          id,
          trainer_profile_id,
          assignment_status,
          assigned_by,
          approval_requested_by,
          approved_by,
          approval_reason,
          assigned_at,
          approved_at,
          removed_at
        FROM training_engagement_trainers
        WHERE training_engagement_id = $1
          AND removed_at IS NULL
        ORDER BY created_at ASC
      `,
      [engagementId],
    )

  return {
    ...engagementResult.rows[0],
    trainers: trainersResult.rows,

    approved_trainers:
      trainersResult.rows.filter(
        (trainer) =>
          trainer.assignment_status ===
          TRAINER_APPROVAL_APPROVED,
      ),

    pending_trainers:
      trainersResult.rows.filter(
        (trainer) =>
          trainer.assignment_status ===
          TRAINER_APPROVAL_PENDING,
      ),
  }
}

export async function listEngagementTrainers(
  engagementId: string,
) {
  const result = await query(
    `
      SELECT
        tet.*,

        up.id AS trainer_profile_id,

        au.id AS user_id,
        au.email,
        au.role,

        COALESCE(
          NULLIF(TRIM(up.full_name), ''),
          au.email
        ) AS trainer_name

      FROM training_engagement_trainers tet

      JOIN user_profiles up
        ON up.id = tet.trainer_profile_id

      JOIN app_users au
        ON au.id = up.user_id

      WHERE tet.training_engagement_id = $1
        AND tet.removed_at IS NULL

      ORDER BY
        CASE
          WHEN tet.assignment_status = 'approved'
          THEN 0

          WHEN tet.assignment_status =
            'pending_super_admin_approval'
          THEN 1

          ELSE 2
        END,

        tet.created_at ASC
    `,
    [engagementId],
  )

  return result.rows
}

type ApprovedTrainerRow = {
  id: string
  training_engagement_id: string
  trainer_profile_id: string
  assigned_by: string | null
  approved_by: string | null
  approval_reason: string | null
  assigned_at: Date | string | null
  approved_at: Date | string | null
  user_id: string
  email: string | null
  role: string
  trainer_name: string | null
}

export async function listApprovedTrainers(
  engagementId: string,
): Promise<ApprovedTrainerRow[]> {
  const result =
    await query<ApprovedTrainerRow>(
      `
        SELECT
          tet.id,
          tet.training_engagement_id,
          tet.trainer_profile_id,
          tet.assigned_by,
          tet.approved_by,
          tet.approval_reason,
          tet.assigned_at,
          tet.approved_at,

          up.user_id,

          au.email,
          au.role,

          COALESCE(
            NULLIF(TRIM(up.full_name), ''),
            au.email
          ) AS trainer_name

        FROM training_engagement_trainers tet

        JOIN user_profiles up
          ON up.id = tet.trainer_profile_id

        JOIN app_users au
          ON au.id = up.user_id

        WHERE tet.training_engagement_id = $1
          AND tet.assignment_status = $2
          AND tet.removed_at IS NULL

        ORDER BY tet.approved_at ASC
      `,
      [
        engagementId,
        TRAINER_APPROVAL_APPROVED,
      ],
    )

  return result.rows
}

/* =======================================================
   User / Profile Helpers
   ======================================================= */

async function getUserRoleByProfileId(
  profileId: string | null,
): Promise<string | null> {
  if (!profileId) {
    return null
  }

  const result =
    await query<{
      role: string | null
    }>(
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

async function getUserProfileId(
  userId: string,
): Promise<string | null> {
  const result =
    await query<{ id: string }>(
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
   Trainer Authorization
   ======================================================= */

export async function isApprovedTrainerForEngagement(
  engagementId: string,
  user: {
    id: string
    role: string
  } | null,
  profileId?: string | null,
): Promise<boolean> {
  if (!user) {
    return false
  }

  if (isSuperAdminRole(user.role)) {
    return true
  }

  const currentProfileId =
    profileId ||
    (await getUserProfileId(user.id))

  if (!currentProfileId) {
    return false
  }

  const result =
    await query<{ id: string }>(
      `
        SELECT id
        FROM training_engagement_trainers

        WHERE training_engagement_id = $1
          AND trainer_profile_id = $2
          AND assignment_status = $3
          AND removed_at IS NULL

        LIMIT 1
      `,
      [
        engagementId,
        currentProfileId,
        TRAINER_APPROVAL_APPROVED,
      ],
    )

  return Boolean(
    result.rows[0],
  )
}

export async function requireApprovedTrainerForEngagement(
  engagementId: string,
  actorProfileId: string | null,
): Promise<void> {
  if (!actorProfileId) {
    throw new Error(
      "Trainer profile is required",
    )
  }

  const result =
    await query<{ id: string }>(
      `
        SELECT id
        FROM training_engagement_trainers

        WHERE training_engagement_id = $1
          AND trainer_profile_id = $2
          AND assignment_status = $3
          AND removed_at IS NULL

        LIMIT 1
      `,
      [
        engagementId,
        actorProfileId,
        TRAINER_APPROVAL_APPROVED,
      ],
    )

  if (!result.rows[0]) {
    throw new Error(
      "This user is not an approved trainer for this engagement",
    )
  }
}

export async function requireTrainingOperatorForEngagement(
  engagementId: string,
  actor: AppUser | null,
  actorProfileId: string | null,
): Promise<void> {
  if (!actor) {
    throw new Error(
      "Unauthorized",
    )
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
    throw new Error(
      "User profile is required",
    )
  }

  const role =
    await getUserRoleByProfileId(
      actorProfileId,
    )

  if (!role) {
    throw new Error(
      "User role could not be determined",
    )
  }

  if (isSuperAdminRole(role)) {
    return
  }

  await requireApprovedTrainerForEngagement(
    engagementId,
    actorProfileId,
  )
}

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
    await getEngagementTrainerState(
      engagementId,
    )

  if (!engagement) {
    throw new Error(
      "Training engagement not found",
    )
  }

  const targetResult =
    await query<{
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

  const target =
    targetResult.rows[0]

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

  if (!actorProfileId) {
    throw new Error(
      "Actor profile is required",
    )
  }

  const normalizedActorRole =
    actorRole || "administrator"

  const existingAssignment =
    await query<{
      id: string
      assignment_status: string
    }>(
      `
        SELECT
          id,
          assignment_status

        FROM training_engagement_trainers

        WHERE training_engagement_id = $1
          AND trainer_profile_id = $2

        LIMIT 1
      `,
      [
        engagementId,
        trainerProfileId,
      ],
    )

  if (
    isSuperAdminRole(
      normalizedActorRole,
    )
  ) {
    if (existingAssignment.rows[0]) {
      await query(
        `
          UPDATE training_engagement_trainers
          SET
            assignment_status = $1,
            assigned_by = $2,
            approved_by = $2,

            approval_requested_by =
              COALESCE(
                approval_requested_by,
                $2
              ),

            approval_reason = NULL,

            assigned_at =
              COALESCE(
                assigned_at,
                NOW()
              ),

            approved_at = NOW(),
            removed_at = NULL,
            updated_at = NOW()

          WHERE id = $3
        `,
        [
          TRAINER_APPROVAL_APPROVED,
          actorProfileId,
          existingAssignment.rows[0].id,
        ],
      )
    } else {
      await query(
        `
          INSERT INTO training_engagement_trainers (
            training_engagement_id,
            trainer_profile_id,
            assignment_status,
            assigned_by,
            approval_requested_by,
            approved_by,
            assigned_at,
            approved_at,
            created_at,
            updated_at
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $4,
            $4,
            NOW(),
            NOW(),
            NOW(),
            NOW()
          )
        `,
        [
          engagementId,
          trainerProfileId,
          TRAINER_APPROVAL_APPROVED,
          actorProfileId,
        ],
      )
    }

    await query(
      `
        UPDATE training_engagements

        SET
          assigned_trainer =
            COALESCE(
              assigned_trainer,
              $1
            ),

          trainer_approval_status = $2,
          trainer_approval_approved_by = $3,
          updated_at = NOW()

        WHERE id = $4
      `,
      [
        trainerProfileId,
        TRAINER_APPROVAL_APPROVED,
        actorProfileId,
        engagementId,
      ],
    )

    await createTrainingUpdate(
      engagementId,
      actorProfileId,
      "trainer_assigned",
      "Trainer Assigned",
      `Trainer profile ${trainerProfileId} has been approved and assigned to the engagement.`,
    )

    return {
      success: true,
      assignment_status:
        TRAINER_APPROVAL_APPROVED,
      trainer_profile_id:
        trainerProfileId,
    }
  }

  if (
    normalizedActorRole !==
    "administrator"
  ) {
    throw new Error(
      "Forbidden",
    )
  }

  if (
    existingAssignment.rows[0]
  ) {
    const existing =
      existingAssignment.rows[0]

    if (
      existing.assignment_status ===
      TRAINER_APPROVAL_APPROVED
    ) {
      throw new Error(
        "This trainer is already approved for this engagement",
      )
    }

    await query(
      `
        UPDATE training_engagement_trainers

        SET
          assignment_status = $1,
          assigned_by = $2,
          approval_requested_by = $2,
          approved_by = NULL,
          approval_reason = NULL,
          assigned_at = NULL,
          approved_at = NULL,
          removed_at = NULL,
          updated_at = NOW()

        WHERE id = $3
      `,
      [
        TRAINER_APPROVAL_PENDING,
        actorProfileId,
        existing.id,
      ],
    )
  } else {
    await query(
      `
        INSERT INTO training_engagement_trainers (
          training_engagement_id,
          trainer_profile_id,
          assignment_status,
          assigned_by,
          approval_requested_by,
          created_at,
          updated_at
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $4,
          NOW(),
          NOW()
        )
      `,
      [
        engagementId,
        trainerProfileId,
        TRAINER_APPROVAL_PENDING,
        actorProfileId,
      ],
    )
  }

  await query(
    `
      UPDATE training_engagements

      SET
        pending_trainer_id = $1,
        trainer_approval_status = $2,
        trainer_approval_requested_by = $3,
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

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "trainer_assignment_requested",
    "Trainer Assignment Requested",
    `Trainer profile ${trainerProfileId} was proposed and sent to Super Administrator approval.`,
  )

  return {
    success: true,
    assignment_status:
      TRAINER_APPROVAL_PENDING,
    trainer_profile_id:
      trainerProfileId,
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
  await query(
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
        $3,
        $4,
        $5
      )
    `,
    [
      trainingEngagementId,
      updatedBy,
      updateType,
      title,
      content,
    ],
  )

  await notifyTrainingClient(
    trainingEngagementId,
    {
      type:
        `training_${updateType}`,

      title,

      message:
        content,

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

export async function ensureAccess(
  engagementId: string,
  user: AppUser | null,
  allowTrainer = false,
): Promise<{
  profileId: string | null
  role: string | null
}> {
  if (!user) {
    throw new Error(
      "Unauthorized",
    )
  }

  const res =
    await query<{
      client_profile_id:
        | string
        | null
    }>(
      `
        SELECT
          client_profile_id

        FROM training_engagements

        WHERE id = $1
        LIMIT 1
      `,
      [engagementId],
    )

  const engagement =
    res.rows[0]

  if (!engagement) {
    throw new Error(
      "Training engagement not found",
    )
  }

  const profileId =
    await getUserProfileId(
      user.id,
    )

  if (
    isSuperAdminRole(
      user.role,
    )
  ) {
    return {
      profileId,
      role: user.role,
    }
  }

  if (
    user.role ===
    "administrator"
  ) {
    if (allowTrainer) {
      await requireApprovedTrainerForEngagement(
        engagementId,
        profileId,
      )
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
    await requireApprovedTrainerForEngagement(
      engagementId,
      profileId,
    )

    return {
      profileId,
      role: user.role,
    }
  }

  if (
    user.role ===
    "client"
  ) {
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

    throw new Error(
      "Forbidden",
    )
  }

  throw new Error(
    "Forbidden",
  )
}

/* =======================================================
   Modules
   ======================================================= */

export async function listModules(
  engagementId: string,
  clientProfileId?: string | null,
) {
  const result =
    await query(
      `
        SELECT
          tm.*,

          COALESCE(
            (
              SELECT COUNT(*)
              FROM training_materials mat
              WHERE
                mat.training_engagement_id =
                  tm.training_engagement_id
                AND mat.module_id =
                  tm.id
            ),
            0
          ) AS material_count,

          COALESCE(
            (
              SELECT COUNT(*)
              FROM training_materials mat

              WHERE
                mat.training_engagement_id =
                  tm.training_engagement_id

                AND mat.module_id =
                  tm.id

                AND EXISTS (
                  SELECT 1

                  FROM training_material_progress mp

                  WHERE
                    mp.training_engagement_id =
                      mat.training_engagement_id

                    AND mp.material_id =
                      mat.id

                    ${
                      clientProfileId
                        ? `AND mp.client_profile_id = $2`
                        : ""
                    }

                    AND mp.status =
                      'completed'
                )
            ),
            0
          ) AS completed_material_count,

          COALESCE(
            (
              SELECT COUNT(*)

              FROM training_sessions ts

              WHERE
                ts.training_engagement_id =
                  tm.training_engagement_id

                AND ts.module_id =
                  tm.id

                AND ts.status !=
                  'cancelled'
            ),
            0
          ) AS session_count,

          COALESCE(
            (
              SELECT COUNT(*)

              FROM training_sessions ts

              WHERE
                ts.training_engagement_id =
                  tm.training_engagement_id

                AND ts.module_id =
                  tm.id

                AND ts.status !=
                  'cancelled'

                AND ts.attendance_status =
                  'attended'
            ),
            0
          ) AS attended_session_count,

          COALESCE(
            (
              SELECT COUNT(*)

              FROM training_sessions ts

              WHERE
                ts.training_engagement_id =
                  tm.training_engagement_id

                AND ts.module_id =
                  tm.id

                AND ts.status =
                  'completed'
            ),
            0
          ) AS completed_session_count

        FROM training_modules tm

        WHERE
          tm.training_engagement_id = $1

        ORDER BY
          tm.module_order ASC,
          tm.created_at ASC
      `,
      clientProfileId
        ? [
            engagementId,
            clientProfileId,
          ]
        : [engagementId],
    )

  if (!clientProfileId) {
    return result.rows
  }

  return Promise.all(
    result.rows.map(
      async (module: any) => {
        const calculated =
          await calculateModuleProgress(
            engagementId,
            module.id,
            clientProfileId,
          )

        return {
          ...module,

          completion_percentage:
            calculated.completion_percentage,

          status:
            calculated.status,

          material_count:
            calculated.material_count,

          completed_material_count:
            calculated.completed_material_count,

          session_count:
            calculated.session_count,

          completed_session_count:
            calculated.completed_session_count,
        }
      },
    ),
  )
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
    throw new Error(
      "Module title is required",
    )
  }

  const result =
    await query(
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
        payload.description ||
          null,
        payload.objectives ||
          null,
        payload.module_order ||
          0,
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
  updates: {
    title?: string
    description?: string | null
    objectives?: string | null
    module_order?: number
  },
  actorProfileId: string | null,
) {
  const moduleRow =
    await query<{
      training_engagement_id: string
    }>(
      `
        SELECT
          training_engagement_id
        FROM training_modules
        WHERE id = $1
        LIMIT 1
      `,
      [moduleId],
    )

  if (!moduleRow.rows[0]) {
    throw new Error(
      "Module not found",
    )
  }

  const engagementId =
    moduleRow.rows[0]
      .training_engagement_id

  /*
   * Only an approved training operator for this
   * engagement may update the module.
   */
  await requireTrainingOperatorByProfile(
    engagementId,
    actorProfileId,
  )

  const fields: string[] = []
  const values: unknown[] = []

  let ix = 0

  /*
   * Title
   */
  if (updates.title !== undefined) {
    const title =
      typeof updates.title === "string"
        ? updates.title.trim()
        : updates.title

    if (
      typeof title === "string" &&
      title.length === 0
    ) {
      throw new Error(
        "Module title cannot be empty",
      )
    }

    fields.push(
      `"title" = $${ix + 1}`,
    )

    values.push(title)

    ix++
  }

  /*
   * Description
   */
  if (
    updates.description !== undefined
  ) {
    fields.push(
      `"description" = $${ix + 1}`,
    )

    values.push(
      updates.description,
    )

    ix++
  }

  /*
   * Objectives
   */
  if (
    updates.objectives !== undefined
  ) {
    fields.push(
      `"objectives" = $${ix + 1}`,
    )

    values.push(
      updates.objectives,
    )

    ix++
  }

  /*
   * Module order
   */
  if (
    updates.module_order !== undefined
  ) {
    if (
      !Number.isInteger(
        updates.module_order,
      ) ||
      updates.module_order < 1
    ) {
      throw new Error(
        "module_order must be a positive integer",
      )
    }

    fields.push(
      `"module_order" = $${ix + 1}`,
    )

    values.push(
      updates.module_order,
    )

    ix++
  }

  if (fields.length === 0) {
    throw new Error(
      "No updates provided",
    )
  }

  /*
   * moduleId becomes the final query parameter.
   *
   * Example:
   *
   *   title         -> $1
   *   description   -> $2
   *   moduleId      -> $3
   */
  values.push(moduleId)

  const moduleIdPlaceholder =
    `$${ix + 1}`

  const sql = `
    UPDATE training_modules

    SET
      ${fields.join(", ")},
      updated_at = NOW()

    WHERE id = ${moduleIdPlaceholder}

    RETURNING *
  `

  const res =
    await query<any>(
      sql,
      values,
    )

  if (!res.rows[0]) {
    throw new Error(
      "Module not found",
    )
  }

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "module_updated",
    `Module Updated: ${res.rows[0].title}`,
    `Module '${res.rows[0].title}' was updated.`,
  )

  return res.rows[0]
}

export async function deleteModule(
  moduleId: string,
  actorProfileId: string | null,
) {
  const mod =
    await query<{
      training_engagement_id:
        string
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
    throw new Error(
      "Module not found",
    )
  }

  const engagementId =
    mod.rows[0]
      .training_engagement_id

  await requireTrainingOperatorByProfile(
    engagementId,
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
    engagementId,
    actorProfileId,
    "module_deleted",
    `Module Deleted: ${mod.rows[0].title}`,
    "Module deleted by trainer or training administrator.",
  )

  const actorRole =
    await getUserRoleByProfileId(
      actorProfileId,
    )

  if (actorRole) {
    await recomputeEngagementProgress(
      engagementId,
      actorProfileId,
      actorRole,
    )
  }

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
    const result =
      await query<{ id: string }>(
        `
          SELECT id

          FROM training_session_calendar_events

          WHERE training_session_id = $1

          LIMIT 1
        `,
        [sessionId],
      )

    return Boolean(
      result.rows[0],
    )
  } catch (error) {
    console.error(
      "TRAINING SESSION CALENDAR STATE ERROR:",
      error,
    )

    return false
  }
}

async function attachCalendarSyncState<
  T extends { id: string },
>(session: T) {
  return {
    ...session,

    calendar_synced:
      await getTrainingSessionCalendarSynced(
        session.id,
      ),
  }
}

export async function listSessions(
  engagementId: string,
) {
  type TrainingSessionQueryRow = {
    id: string
    [key: string]: unknown
  }

  const res =
    await query<TrainingSessionQueryRow>(
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

        WHERE
          ts.training_engagement_id = $1

        ORDER BY
          ts.scheduled_at NULLS LAST
      `,
      [engagementId],
    )

  return Promise.all(
    res.rows.map(
      (session) =>
        attachCalendarSyncState(
          session,
        ),
    ),
  )
}

export async function createSession(
  engagementId: string,
  payload: any,
  actorOrProfile:
    | AppUser
    | string
    | null,
  actorProfileId?: string | null,
) {
  let actor: AppUser | null =
    null

  let profileId:
    | string
    | null = null

  if (
    actorOrProfile &&
    typeof actorOrProfile ===
      "object"
  ) {
    actor = actorOrProfile

    profileId =
      actorProfileId || null
  } else {
    profileId =
      typeof actorOrProfile ===
      "string"
        ? actorOrProfile
        : null

    const role =
      await getUserRoleByProfileId(
        profileId,
      )

    if (role) {
      actor = {
        id: "",
        role,
      }
    }
  }

  if (!actor) {
    throw new Error(
      "Unauthorized",
    )
  }

  await requireTrainingOperatorForEngagement(
    engagementId,
    actor,
    profileId,
  )

  /*
   * Every training session must belong to
   * a training module.
   */
  const moduleId =
    payload.module_id

  if (!moduleId) {
    throw new Error(
      "A training session must be assigned to a training module",
    )
  }

  const moduleCheck =
    await query<{ id: string }>(
      `
        SELECT id

        FROM training_modules

        WHERE
          id = $1
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
      "Selected module does not belong to this training engagement",
    )
  }

  let sessionTrainerId =
    payload.trainer_id ||
    null

  if (sessionTrainerId) {
    const trainerCheck =
      await query<{ id: string }>(
        `
          SELECT id

          FROM training_engagement_trainers

          WHERE
            training_engagement_id = $1
            AND trainer_profile_id = $2
            AND assignment_status = $3
            AND removed_at IS NULL

          LIMIT 1
        `,
        [
          engagementId,
          sessionTrainerId,
          TRAINER_APPROVAL_APPROVED,
        ],
      )

    if (!trainerCheck.rows[0]) {
      throw new Error(
        "Selected session trainer is not an approved trainer for this engagement",
      )
    }
  } else {
    const trainers =
      await listApprovedTrainers(
        engagementId,
      )

    sessionTrainerId =
      trainers[0]
        ?.trainer_profile_id ||
      null
  }

  const res =
    await query(
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
          NOW(),
          NOW()
        )

        RETURNING *
      `,
      [
        engagementId,
        moduleId,
        sessionTrainerId,
        payload.scheduled_at ||
          null,
        payload.duration_minutes ||
          null,
        payload.session_type ||
          null,
        payload.meeting_url ||
          null,
        payload.location ||
          null,
        payload.status ||
          "scheduled",
        payload.attendance_status ||
          "pending",
        payload.session_notes ||
          null,
      ],
    )

  const session: any =
    res.rows[0]

  await createTrainingUpdate(
    engagementId,
    profileId,
    "session_scheduled",
    "Session Scheduled",
    "A training session has been scheduled and connected to a training module.",
  )

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

  const role =
    await getUserRoleByProfileId(
      profileId,
    )

  if (role) {
    await recomputeEngagementProgress(
      engagementId,
      profileId,
      role,
    )
  }

  return attachCalendarSyncState(
    session,
  )
}

export async function updateSession(
  sessionId: string,
  updates: any,
  actorProfileId: string | null,
) {
  const sessionRow =
    await query<{
      training_engagement_id:
        string
      module_id:
        string | null
    }>(
      `
        SELECT
          training_engagement_id,
          module_id

        FROM training_sessions

        WHERE id = $1
        LIMIT 1
      `,
      [sessionId],
    )

  if (!sessionRow.rows[0]) {
    throw new Error(
      "Session not found",
    )
  }

  const engagementId =
    sessionRow.rows[0]
      .training_engagement_id

  await requireTrainingOperatorByProfile(
    engagementId,
    actorProfileId,
  )

  /*
   * A session must always belong to a module.
   */
  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      "module_id",
    )
  ) {
    if (!updates.module_id) {
      throw new Error(
        "A training session must be assigned to a training module",
      )
    }

    const moduleCheck =
      await query<{ id: string }>(
        `
          SELECT id

          FROM training_modules

          WHERE
            id = $1
            AND training_engagement_id = $2

          LIMIT 1
        `,
        [
          updates.module_id,
          engagementId,
        ],
      )

    if (!moduleCheck.rows[0]) {
      throw new Error(
        "Selected module does not belong to this training engagement",
      )
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      "trainer_id",
    )
  ) {
    if (updates.trainer_id) {
      const trainerCheck =
        await query<{
          id: string
        }>(
          `
            SELECT id

            FROM training_engagement_trainers

            WHERE
              training_engagement_id = $1
              AND trainer_profile_id = $2
              AND assignment_status = $3
              AND removed_at IS NULL

            LIMIT 1
          `,
          [
            engagementId,
            updates.trainer_id,
            TRAINER_APPROVAL_APPROVED,
          ],
        )

      if (
        !trainerCheck.rows[0]
      ) {
        throw new Error(
          "Selected session trainer is not an approved trainer for this engagement",
        )
      }
    }
  }

  const fields: string[] = []
  const values: any[] = []

  let ix = 1

  for (
    const key of [
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
    ]
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        key,
      )
    ) {
      fields.push(
        `${key} = $${ix}`,
      )

      values.push(
        updates[key],
      )

      ix++
    }
  }

  if (fields.length === 0) {
    throw new Error(
      "No updates provided",
    )
  }

  values.push(sessionId)

  const sql = `
    UPDATE training_sessions

    SET
      ${fields.join(", ")},
      sequence =
        COALESCE(sequence, 0) + 1,
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
    throw new Error(
      "Session not found",
    )
  }

  const session =
    res.rows[0]

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "session_updated",
    "Session Updated",
    "Training session updated by trainer or training administrator.",
  )

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

  const role =
    await getUserRoleByProfileId(
      actorProfileId,
    )

  if (role) {
    await recomputeEngagementProgress(
      engagementId,
      actorProfileId,
      role,
    )
  }

  return attachCalendarSyncState(
    session,
  )
}

export async function deleteSession(
  sessionId: string,
  actorProfileId: string | null,
) {
  const sres =
    await query(
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
    throw new Error(
      "Session not found",
    )
  }

  await requireTrainingOperatorByProfile(
    session.training_engagement_id,
    actorProfileId,
  )

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

  const role =
    await getUserRoleByProfileId(
      actorProfileId,
    )

  if (role) {
    await recomputeEngagementProgress(
      session.training_engagement_id,
      actorProfileId,
      role,
    )
  }

  return {
    success: true,
  }
}

/* =======================================================
   Materials
   ======================================================= */

export type TrainingMaterial = {
  id: string
  training_engagement_id: string
  module_id: string | null
  title: string
  description: string | null
  material_type: string | null
  file_url: string | null
  external_url: string | null
  visibility: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export async function listMaterials(
  engagementId: string,
) {
  const res =
    await query<TrainingMaterial>(
      `
        SELECT
          tm.*,
          m.title AS module_title,
          m.module_order

        FROM training_materials tm

        LEFT JOIN training_modules m
          ON m.id = tm.module_id

        WHERE
          tm.training_engagement_id = $1

        ORDER BY
          COALESCE(
            m.module_order,
            999999
          ) ASC,

          tm.created_at ASC
      `,
      [engagementId],
    )

  return res.rows
}

export async function createMaterial(
  engagementId: string,
  payload: {
    module_id?: string | null
    title: string
    description?: string | null
    material_type?: string | null
    file_url?: string | null
    external_url?: string | null
    visibility?: string | null
  },
  actorProfileId: string | null,
) {
  await requireTrainingOperatorByProfile(
    engagementId,
    actorProfileId,
  )

  if (!payload.title?.trim()) {
    throw new Error(
      "Material title is required",
    )
  }

  if (payload.module_id) {
    const moduleCheck =
      await query<{ id: string }>(
        `
          SELECT id

          FROM training_modules

          WHERE
            id = $1
            AND training_engagement_id = $2

          LIMIT 1
        `,
        [
          payload.module_id,
          engagementId,
        ],
      )

    if (!moduleCheck.rows[0]) {
      throw new Error(
        "Selected module does not belong to this training engagement",
      )
    }
  }

  if (!payload.module_id) {
    throw new Error(
      "Training materials must be assigned to a training module",
    )
  }

  const res =
    await query<TrainingMaterial>(
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
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          NOW(),
          NOW()
        )

        RETURNING *
      `,
      [
        engagementId,
        payload.module_id,
        payload.title.trim(),
        payload.description ||
          null,
        payload.material_type ||
          "other",
        payload.file_url ||
          null,
        payload.external_url ||
          null,
        payload.visibility ||
          "private",
        actorProfileId,
      ],
    )

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "material_uploaded",
    `Material Uploaded: ${payload.title}`,
    `Material '${payload.title}' was added to a training module.`,
  )

  const role =
    await getUserRoleByProfileId(
      actorProfileId,
    )

  if (role) {
    await recomputeEngagementProgress(
      engagementId,
      actorProfileId,
      role,
    )
  }

  return res.rows[0]
}

export async function updateMaterial(
  materialId: string,
  updates: any,
  actorProfileId: string | null,
) {
  const materialRow =
    await query<{
      training_engagement_id:
        string
    }>(
      `
        SELECT
          training_engagement_id

        FROM training_materials

        WHERE id = $1

        LIMIT 1
      `,
      [materialId],
    )

  if (!materialRow.rows[0]) {
    throw new Error(
      "Material not found",
    )
  }

  const engagementId =
    materialRow.rows[0]
      .training_engagement_id

  await requireTrainingOperatorByProfile(
    engagementId,
    actorProfileId,
  )

  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      "module_id",
    )
  ) {
    if (!updates.module_id) {
      throw new Error(
        "Training materials must be assigned to a training module",
      )
    }

    const moduleCheck =
      await query<{ id: string }>(
        `
          SELECT id

          FROM training_modules

          WHERE
            id = $1
            AND training_engagement_id = $2

          LIMIT 1
        `,
        [
          updates.module_id,
          engagementId,
        ],
      )

    if (!moduleCheck.rows[0]) {
      throw new Error(
        "Selected module does not belong to this training engagement",
      )
    }
  }

  const fields: string[] = []
  const values: any[] = []

  let ix = 1

  for (
    const key of [
      "module_id",
      "title",
      "description",
      "material_type",
      "file_url",
      "external_url",
      "visibility",
    ]
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        key,
      )
    ) {
      fields.push(
        `${key} = $${ix}`,
      )

      values.push(
        key === "title" &&
        typeof updates[key] ===
          "string"
          ? updates[key].trim()
          : updates[key],
      )

      ix++
    }
  }

  if (fields.length === 0) {
    throw new Error(
      "No updates provided",
    )
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
    await query<TrainingMaterial>(
      sql,
      values,
    )

  if (!res.rows[0]) {
    throw new Error(
      "Material not found",
    )
  }

  await createTrainingUpdate(
    res.rows[0]
      .training_engagement_id,
    actorProfileId,
    "material_updated",
    `Material Updated: ${res.rows[0].title}`,
    "Training material updated by trainer or training administrator.",
  )

  const role =
    await getUserRoleByProfileId(
      actorProfileId,
    )

  if (role) {
    await recomputeEngagementProgress(
      res.rows[0]
        .training_engagement_id,
      actorProfileId,
      role,
    )
  }

  return res.rows[0]
}

export async function deleteMaterial(
  materialId: string,
  actorProfileId: string | null,
) {
  const m =
    await query<{
      training_engagement_id:
        string
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
    throw new Error(
      "Material not found",
    )
  }

  const engagementId =
    m.rows[0]
      .training_engagement_id

  await requireTrainingOperatorByProfile(
    engagementId,
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
    engagementId,
    actorProfileId,
    "material_deleted",
    `Material Deleted: ${m.rows[0].title}`,
    "Training material deleted by trainer or training administrator.",
  )

  const role =
    await getUserRoleByProfileId(
      actorProfileId,
    )

  if (role) {
    await recomputeEngagementProgress(
      engagementId,
      actorProfileId,
      role,
    )
  }

  return {
    success: true,
  }
}

/* =======================================================
   Material Consumption / Progress
   ======================================================= */

export type TrainingMaterialProgress = {
  id: string
  training_engagement_id: string
  material_id: string
  client_profile_id: string
  status: string
  progress_percentage: number
  watched_seconds: number | null
  duration_seconds: number | null
  pages_viewed: number | null
  total_pages: number | null
  started_at: string | null
  completed_at: string | null
  last_accessed_at: string | null
  created_at: string
  updated_at: string
  [key: string]: unknown
}

function normalizeMaterialStatus(
  value: unknown,
): string {
  const status =
    String(value || "")
      .trim()
      .toLowerCase()

  if (
    status === "completed" ||
    status === "complete"
  ) {
    return "completed"
  }

  if (
    status === "in_progress" ||
    status === "in-progress" ||
    status === "started"
  ) {
    return "in_progress"
  }

  return "not_started"
}

export async function listMaterialProgress(
  engagementId: string,
  clientProfileId?: string | null,
) {
  if (clientProfileId) {
    const result =
      await query<TrainingMaterialProgress>(
        `
          SELECT
            tmp.*,

            tm.title AS material_title,
            tm.description AS material_description,
            tm.material_type,
            tm.file_url,
            tm.external_url,
            tm.module_id,

            m.title AS module_title,
            m.module_order

          FROM training_material_progress tmp

          JOIN training_materials tm
            ON tm.id = tmp.material_id

          LEFT JOIN training_modules m
            ON m.id = tm.module_id

          WHERE
            tmp.training_engagement_id = $1
            AND tmp.client_profile_id = $2

          ORDER BY
            COALESCE(
              m.module_order,
              999999
            ) ASC,

            tm.created_at ASC
        `,
        [
          engagementId,
          clientProfileId,
        ],
      )

    return result.rows
  }

  const result =
    await query<TrainingMaterialProgress>(
      `
        SELECT
          tmp.*,

          tm.title AS material_title,
          tm.description AS material_description,
          tm.material_type,
          tm.file_url,
          tm.external_url,
          tm.module_id,

          m.title AS module_title,
          m.module_order

        FROM training_material_progress tmp

        JOIN training_materials tm
          ON tm.id = tmp.material_id

        LEFT JOIN training_modules m
          ON m.id = tm.module_id

        WHERE
          tmp.training_engagement_id = $1

        ORDER BY
          COALESCE(
            m.module_order,
            999999
          ) ASC,

          tm.created_at ASC
      `,
      [engagementId],
    )

  return result.rows
}

export async function getMaterialProgress(
  engagementId: string,
  materialId: string,
  clientProfileId: string,
) {
  const material =
    await query<{
      id: string
      training_engagement_id:
        string
      module_id: string | null
      title: string
      material_type:
        string | null
    }>(
      `
        SELECT
          id,
          training_engagement_id,
          module_id,
          title,
          material_type

        FROM training_materials

        WHERE
          id = $1
          AND training_engagement_id = $2

        LIMIT 1
      `,
      [
        materialId,
        engagementId,
      ],
    )

  if (!material.rows[0]) {
    throw new Error(
      "Material not found",
    )
  }

  const result =
    await query<TrainingMaterialProgress>(
      `
        SELECT *

        FROM training_material_progress

        WHERE
          training_engagement_id = $1
          AND material_id = $2
          AND client_profile_id = $3

        LIMIT 1
      `,
      [
        engagementId,
        materialId,
        clientProfileId,
      ],
    )

  return (
    result.rows[0] ||
    null
  )
}

export async function updateMaterialProgress(
  engagementId: string,
  materialId: string,
  clientProfileId: string,
  updates: {
    status?: string
    progress_percentage?: number
    watched_seconds?: number
    duration_seconds?: number
    pages_viewed?: number
    total_pages?: number
    completed?: boolean
  },
) {
  const materialResult =
    await query<{
      id: string
      title: string
      material_type:
        string | null
      module_id: string | null
    }>(
      `
        SELECT
          id,
          title,
          material_type,
          module_id

        FROM training_materials

        WHERE
          id = $1
          AND training_engagement_id = $2

        LIMIT 1
      `,
      [
        materialId,
        engagementId,
      ],
    )

  const material =
    materialResult.rows[0]

  if (!material) {
    throw new Error(
      "Material does not belong to this training engagement",
    )
  }

  if (!material.module_id) {
    throw new Error(
      "Training material must belong to a module before progress can be calculated",
    )
  }

  const existing =
    await query<{
      id: string
      status: string
      progress_percentage:
        number
    }>(
      `
        SELECT
          id,
          status,
          progress_percentage

        FROM training_material_progress

        WHERE
          training_engagement_id = $1
          AND material_id = $2
          AND client_profile_id = $3

        LIMIT 1
      `,
      [
        engagementId,
        materialId,
        clientProfileId,
      ],
    )

  const previousPercentage =
    existing.rows[0]
      ?.progress_percentage ||
    0

  const previousStatus =
    existing.rows[0]
      ?.status ||
    "not_started"

  let progress =
    normalizePercentage(
      updates.progress_percentage,
    )

  let status =
    normalizeMaterialStatus(
      updates.status,
    )

  if (
    updates.completed === true
  ) {
    progress = 100
    status = "completed"
  }

  if (
    progress >= 100
  ) {
    status = "completed"
  } else if (
    progress > 0 &&
    status === "not_started"
  ) {
    status = "in_progress"
  }

  const completedAt =
    status === "completed"
      ? "NOW()"
      : null

  const activityDecision =
    shouldCreateMaterialProgressUpdate(
      Number(
        previousPercentage,
      ),
      previousStatus,
      progress,
      status,
    )

  let resultRow:
    | TrainingMaterialProgress
    | null = null

  if (existing.rows[0]) {
    const fields: string[] = []
    const values: any[] = []

    let ix = 1

    if (
      updates.status !==
        undefined ||
      updates.completed !==
        undefined ||
      updates.progress_percentage !==
        undefined
    ) {
      fields.push(
        `status = $${ix}`,
      )

      values.push(status)

      ix++
    }

    if (
      updates.progress_percentage !==
        undefined ||
      updates.completed === true
    ) {
      fields.push(
        `progress_percentage = $${ix}`,
      )

      values.push(progress)

      ix++
    }

    if (
      updates.watched_seconds !==
        undefined
    ) {
      fields.push(
        `watched_seconds = $${ix}`,
      )

      values.push(
        Math.max(
          0,
          Number(
            updates.watched_seconds,
          ) || 0,
        ),
      )

      ix++
    }

    if (
      updates.duration_seconds !==
        undefined
    ) {
      fields.push(
        `duration_seconds = $${ix}`,
      )

      values.push(
        Math.max(
          0,
          Number(
            updates.duration_seconds,
          ) || 0,
        ),
      )

      ix++
    }

    if (
      updates.pages_viewed !==
        undefined
    ) {
      fields.push(
        `pages_viewed = $${ix}`,
      )

      values.push(
        Math.max(
          0,
          Math.floor(
            Number(
              updates.pages_viewed,
            ) || 0,
          ),
        ),
      )

      ix++
    }

    if (
      updates.total_pages !==
        undefined
    ) {
      fields.push(
        `total_pages = $${ix}`,
      )

      values.push(
        Math.max(
          0,
          Math.floor(
            Number(
              updates.total_pages,
            ) || 0,
          ),
        ),
      )

      ix++
    }

    fields.push(
      `started_at = COALESCE(started_at, NOW())`,
    )

    fields.push(
      `completed_at = ${
        completedAt
          ? "NOW()"
          : "completed_at"
      }`,
    )

    fields.push(
      `last_accessed_at = NOW()`,
    )

    fields.push(
      `updated_at = NOW()`,
    )

    values.push(
      existing.rows[0].id,
    )

    const idIndex =
      values.length

    const sql = `
      UPDATE training_material_progress

      SET
        ${fields.join(", ")}

      WHERE id = $${idIndex}

      RETURNING *
    `

    const result =
      await query<TrainingMaterialProgress>(
        sql,
        values,
      )

    resultRow =
      result.rows[0]
  } else {
    const result =
      await query<TrainingMaterialProgress>(
        `
          INSERT INTO training_material_progress (
            training_engagement_id,
            material_id,
            client_profile_id,
            status,
            progress_percentage,
            watched_seconds,
            duration_seconds,
            pages_viewed,
            total_pages,
            started_at,
            completed_at,
            last_accessed_at,
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
            NOW(),
            $10,
            NOW(),
            NOW(),
            NOW()
          )

          RETURNING *
        `,
        [
          engagementId,
          materialId,
          clientProfileId,
          status,
          progress,

          updates.watched_seconds !==
          undefined
            ? Math.max(
                0,
                Number(
                  updates.watched_seconds,
                ) || 0,
              )
            : null,

          updates.duration_seconds !==
          undefined
            ? Math.max(
                0,
                Number(
                  updates.duration_seconds,
                ) || 0,
              )
            : null,

          updates.pages_viewed !==
          undefined
            ? Math.max(
                0,
                Math.floor(
                  Number(
                    updates.pages_viewed,
                  ) || 0,
                ),
              )
            : null,

          updates.total_pages !==
          undefined
            ? Math.max(
                0,
                Math.floor(
                  Number(
                    updates.total_pages,
                  ) || 0,
                ),
              )
            : null,

          completedAt
            ? new Date()
            : null,
        ],
      )

    resultRow =
      result.rows[0]
  }

  if (!resultRow) {
    throw new Error(
      "Unable to save material progress",
    )
  }

  if (
    activityDecision.shouldCreate
  ) {
    if (
      activityDecision.updateType ===
      "material_completed"
    ) {
      await createTrainingUpdate(
        engagementId,
        clientProfileId,
        "material_completed",
        `Material Completed: ${material.title}`,
        `Client completed the training material '${material.title}'.`,
      )
    } else if (
      activityDecision.updateType ===
      "material_started"
    ) {
      await createTrainingUpdate(
        engagementId,
        clientProfileId,
        "material_started",
        `Material Started: ${material.title}`,
        `Client started accessing the training material '${material.title}'.`,
      )
    } else {
      const milestone =
        getProgressMilestone(
          progress,
        )

      await createTrainingUpdate(
        engagementId,
        clientProfileId,
        "material_progress_updated",
        `Material Progress: ${material.title}`,
        `Client reached ${milestone}% progress on training material '${material.title}'.`,
      )
    }
  }

  /*
   * Material progress is an input to the
   * module progress engine.
   */
  const clientRole =
    await getUserRoleByProfileId(
      clientProfileId,
    )

  if (clientRole) {
    await recomputeEngagementProgress(
      engagementId,
      clientProfileId,
      clientRole,
    )
  }

  return resultRow
}

/* =======================================================
   Convenience Material Actions
   ======================================================= */

export async function recordMaterialOpened(
  engagementId: string,
  materialId: string,
  clientProfileId: string,
) {
  return updateMaterialProgress(
    engagementId,
    materialId,
    clientProfileId,
    {
      status: "in_progress",
      progress_percentage: 1,
    },
  )
}

export async function recordMaterialVisited(
  engagementId: string,
  materialId: string,
  clientProfileId: string,
) {
  return updateMaterialProgress(
    engagementId,
    materialId,
    clientProfileId,
    {
      status: "completed",
      progress_percentage: 100,
      completed: true,
    },
  )
}

export async function recordVideoProgress(
  engagementId: string,
  materialId: string,
  clientProfileId: string,
  watchedSeconds: number,
  durationSeconds: number,
) {
  const safeDuration =
    Math.max(
      0,
      Number(durationSeconds) || 0,
    )

  const safeWatched =
    Math.max(
      0,
      Math.min(
        safeDuration ||
          Number.MAX_SAFE_INTEGER,
        Number(watchedSeconds) || 0,
      ),
    )

  const percentage =
    safeDuration > 0
      ? Math.min(
          100,
          Math.round(
            (safeWatched /
              safeDuration) *
              100,
          ),
        )
      : 0

  const completed =
    percentage >= 95

  return updateMaterialProgress(
    engagementId,
    materialId,
    clientProfileId,
    {
      status: completed
        ? "completed"
        : "in_progress",

      progress_percentage:
        completed
          ? 100
          : percentage,

      watched_seconds:
        safeWatched,

      duration_seconds:
        safeDuration,

      completed,
    },
  )
}

export async function recordDocumentProgress(
  engagementId: string,
  materialId: string,
  clientProfileId: string,
  pagesViewed: number,
  totalPages: number,
) {
  const safeTotal =
    Math.max(
      0,
      Math.floor(
        Number(totalPages) || 0,
      ),
    )

  const safeViewed =
    Math.max(
      0,
      Math.min(
        safeTotal ||
          Number.MAX_SAFE_INTEGER,
        Math.floor(
          Number(pagesViewed) || 0,
        ),
      ),
    )

  const percentage =
    safeTotal > 0
      ? Math.min(
          100,
          Math.round(
            (safeViewed /
              safeTotal) *
              100,
          ),
        )
      : 0

  const completed =
    safeTotal > 0 &&
    safeViewed >= safeTotal

  return updateMaterialProgress(
    engagementId,
    materialId,
    clientProfileId,
    {
      status: completed
        ? "completed"
        : "in_progress",

      progress_percentage:
        completed
          ? 100
          : percentage,

      pages_viewed:
        safeViewed,

      total_pages:
        safeTotal,

      completed,
    },
  )
}

/* =======================================================
   Material Readiness
   ======================================================= */

export type TrainingModuleMaterialReadiness = {
  module_id: string
  module_title: string
  material_count: number
  completed_material_count: number
  readiness_percentage: number
  all_materials_completed: boolean
}

export async function getModuleMaterialReadiness(
  engagementId: string,
  moduleId?: string,
  clientProfileId?: string | null,
) {
  const values: any[] = [
    engagementId,
  ]

  let moduleFilter = ""

  if (moduleId) {
    values.push(moduleId)

    moduleFilter = `
      AND m.id = $${values.length}
    `
  }

  if (clientProfileId) {
    values.push(
      clientProfileId,
    )
  }

  const clientProgressJoin =
    clientProfileId
      ? `
          LEFT JOIN training_material_progress mp
            ON mp.training_engagement_id =
              tm.training_engagement_id

            AND mp.material_id =
              tm.id

            AND mp.client_profile_id =
              $${values.length}
        `
      : `
          LEFT JOIN training_material_progress mp
            ON mp.training_engagement_id =
              tm.training_engagement_id

            AND mp.material_id =
              tm.id
        `

  const result =
    await query<{
      module_id: string
      module_title: string
      material_count: number
      completed_material_count:
        number
    }>(
      `
        SELECT
          m.id AS module_id,
          m.title AS module_title,

          COUNT(tm.id) AS material_count,

          COUNT(
            CASE
              WHEN mp.status =
                'completed'
              THEN 1
            END
          ) AS completed_material_count

        FROM training_modules m

        LEFT JOIN training_materials tm
          ON tm.module_id = m.id
          AND tm.training_engagement_id =
            m.training_engagement_id

        ${clientProgressJoin}

        WHERE
          m.training_engagement_id = $1

        ${moduleFilter}

        GROUP BY
          m.id,
          m.title

        ORDER BY
          MIN(m.module_order) ASC,
          MIN(m.created_at) ASC
      `,
      values,
    )

  return result.rows.map(
    (row) => {
      const materialCount =
        Number(
          row.material_count,
        ) || 0

      const completedCount =
        Number(
          row.completed_material_count,
        ) || 0

      const readiness =
        materialCount === 0
          ? 100
          : Math.round(
              (completedCount /
                materialCount) *
                100,
            )

      return {
        module_id:
          row.module_id,

        module_title:
          row.module_title,

        material_count:
          materialCount,

        completed_material_count:
          completedCount,

        readiness_percentage:
          readiness,

        all_materials_completed:
          materialCount === 0 ||
          completedCount >=
            materialCount,
      }
    },
  )
}

/* =======================================================
   SYSTEM-CALCULATED MODULE PROGRESS
   ======================================================= */

export type CalculatedModuleProgress = {
  module_id: string
  module_title: string
  module_order: number
  material_count: number
  completed_material_count: number
  session_count: number
  completed_session_count: number
  material_progress: number
  session_progress: number
  completion_percentage: number
  status:
    | "not_started"
    | "in_progress"
    | "completed"
}

export async function calculateModuleProgress(
  engagementId: string,
  moduleId: string,
  clientProfileId: string,
): Promise<CalculatedModuleProgress> {
  const moduleResult =
    await query<{
      id: string
      title: string
      module_order: number
    }>(
      `
        SELECT
          id,
          title,
          module_order

        FROM training_modules

        WHERE
          id = $1
          AND training_engagement_id = $2

        LIMIT 1
      `,
      [
        moduleId,
        engagementId,
      ],
    )

  const module =
    moduleResult.rows[0]

  if (!module) {
    throw new Error(
      "Module not found",
    )
  }

  const materialResult =
    await query<{
      material_count: number
      completed_material_count:
        number
    }>(
      `
        SELECT
          COUNT(*) AS material_count,

          COUNT(
            CASE
              WHEN mp.status =
                'completed'
              THEN 1
            END
          ) AS completed_material_count

        FROM training_materials mat

        LEFT JOIN training_material_progress mp
          ON mp.training_engagement_id =
            mat.training_engagement_id

          AND mp.material_id =
            mat.id

          AND mp.client_profile_id =
            $3

        WHERE
          mat.training_engagement_id = $1
          AND mat.module_id = $2
      `,
      [
        engagementId,
        moduleId,
        clientProfileId,
      ],
    )

  const sessionResult =
    await query<{
      session_count: number
      completed_session_count:
        number
    }>(
      `
        SELECT
          COUNT(*) AS session_count,

          COUNT(
            CASE
              WHEN status =
                'completed'
              THEN 1
            END
          ) AS completed_session_count

        FROM training_sessions

        WHERE
          training_engagement_id = $1
          AND module_id = $2
          AND status != 'cancelled'
      `,
      [
        engagementId,
        moduleId,
      ],
    )

  const materialCount =
    Number(
      materialResult.rows[0]
        ?.material_count || 0,
    )

  const completedMaterialCount =
    Number(
      materialResult.rows[0]
        ?.completed_material_count || 0,
    )

  const sessionCount =
    Number(
      sessionResult.rows[0]
        ?.session_count || 0,
    )

  const completedSessionCount =
    Number(
      sessionResult.rows[0]
        ?.completed_session_count ||
        0,
    )

  const materialProgress =
    materialCount > 0
      ? Math.round(
          (completedMaterialCount /
            materialCount) *
            100,
        )
      : 0

  const sessionProgress =
    sessionCount > 0
      ? Math.round(
          (completedSessionCount /
            sessionCount) *
            100,
        )
      : 0

  const components: number[] = []

  if (materialCount > 0) {
    components.push(
      materialProgress,
    )
  }

  if (sessionCount > 0) {
    components.push(
      sessionProgress,
    )
  }

  /*
   * A module with no activities is never
   * considered complete.
   */
  const completionPercentage =
    components.length === 0
      ? 0
      : Math.round(
          components.reduce(
            (sum, value) =>
              sum + value,
            0,
          ) /
            components.length,
        )

  const status =
    completionPercentage >= 100
      ? "completed"
      : completionPercentage > 0
        ? "in_progress"
        : "not_started"

  return {
    module_id:
      module.id,

    module_title:
      module.title,

    module_order:
      Number(
        module.module_order || 0,
      ),

    material_count:
      materialCount,

    completed_material_count:
      completedMaterialCount,

    session_count:
      sessionCount,

    completed_session_count:
      completedSessionCount,

    material_progress:
      materialProgress,

    session_progress:
      sessionProgress,

    completion_percentage:
      completionPercentage,

    status,
  }
}

async function persistCalculatedModuleProgress(
  engagementId: string,
  moduleId: string,
  clientProfileId: string,
) {
  const calculated =
    await calculateModuleProgress(
      engagementId,
      moduleId,
      clientProfileId,
    )

  const existing =
    await query<{
      id: string
      trainer_notes: string | null
    }>(
      `
        SELECT
          id,
          trainer_notes

        FROM training_module_progress

        WHERE
          training_engagement_id = $1
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
    const result =
      await query(
        `
          UPDATE training_module_progress

          SET
            status = $1,
            completion_percentage = $2,
            updated_at = NOW()

          WHERE id = $3

          RETURNING *
        `,
        [
          calculated.status,
          calculated.completion_percentage,
          existing.rows[0].id,
        ],
      )

    return {
      ...calculated,
      progress_row:
        result.rows[0],
    }
  }

  const result =
    await query(
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
          $1,
          $2,
          $3,
          $4,
          $5,
          NULL,
          NULL,
          NOW(),
          NOW()
        )

        RETURNING *
      `,
      [
        engagementId,
        moduleId,
        clientProfileId,
        calculated.status,
        calculated.completion_percentage,
      ],
    )

  return {
    ...calculated,
    progress_row:
      result.rows[0],
  }
}

/* =======================================================
   Module Progress
   ======================================================= */

export async function listModuleProgress(
  engagementId: string,
  clientProfileId?: string,
) {
  let resolvedClientProfileId =
    clientProfileId || null

  if (!resolvedClientProfileId) {
    const engagement =
      await query<{
        client_profile_id:
          string | null
      }>(
        `
          SELECT
            client_profile_id

          FROM training_engagements

          WHERE id = $1

          LIMIT 1
        `,
        [engagementId],
      )

    resolvedClientProfileId =
      engagement.rows[0]
        ?.client_profile_id ||
      null
  }

  if (!resolvedClientProfileId) {
    return []
  }

  const modules =
    await query<{
      id: string
      title: string
      module_order: number
    }>(
      `
        SELECT
          id,
          title,
          module_order

        FROM training_modules

        WHERE
          training_engagement_id =
            $1

        ORDER BY
          module_order ASC,
          created_at ASC
      `,
      [engagementId],
    )

  const calculated =
    await Promise.all(
      modules.rows.map(
        async (module) => {
          const progress =
            await calculateModuleProgress(
              engagementId,
              module.id,
              resolvedClientProfileId!,
            )

          const persisted =
            await persistCalculatedModuleProgress(
              engagementId,
              module.id,
              resolvedClientProfileId!,
            )

          return {
            ...persisted.progress_row,

            module_title:
              progress.module_title,

            module_order:
              progress.module_order,

            material_count:
              progress.material_count,

            completed_material_count:
              progress.completed_material_count,

            session_count:
              progress.session_count,

            completed_session_count:
              progress.completed_session_count,

            material_progress:
              progress.material_progress,

            session_progress:
              progress.session_progress,

            material_readiness_percentage:
              progress.material_count === 0
                ? 100
                : progress.material_progress,

            all_materials_completed:
              progress.material_count === 0 ||
              progress.completed_material_count >=
                progress.material_count,

            completion_percentage:
              progress.completion_percentage,

            status:
              progress.status,
          }
        },
      ),
    )

  return calculated
}

/*
 * Compatibility wrapper.
 *
 * IMPORTANT:
 * This function no longer accepts trainer-controlled
 * progress values.
 *
 * It recalculates the module from actual training
 * activities. Trainer notes remain editable.
 */
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

  /*
   * Manual percentage/status changes are no longer
   * allowed. Progress is calculated by the system.
   */
  if (
    updates.completion_percentage !==
      undefined ||
    updates.status !==
      undefined
  ) {
    throw new Error(
      "Module progress and status are system-calculated and cannot be manually changed",
    )
  }

  const moduleCheck =
    await query<{ id: string }>(
      `
        SELECT id

        FROM training_modules

        WHERE
          id = $1
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
    updates.trainer_notes !==
    undefined
  ) {
    const existing =
      await query<{ id: string }>(
        `
          SELECT id

          FROM training_module_progress

          WHERE
            training_engagement_id = $1
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
      await query(
        `
          UPDATE training_module_progress

          SET
            trainer_notes = $1,
            updated_by = $2,
            updated_at = NOW()

          WHERE id = $3
        `,
        [
          updates.trainer_notes,
          actorProfileId,
          existing.rows[0].id,
        ],
      )
    } else {
      const calculated =
        await calculateModuleProgress(
          engagementId,
          moduleId,
          clientProfileId,
        )

      await query(
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
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            NOW(),
            NOW()
          )
        `,
        [
          engagementId,
          moduleId,
          clientProfileId,
          calculated.status,
          calculated.completion_percentage,
          updates.trainer_notes,
          actorProfileId,
        ],
      )
    }
  }

  const calculated =
    await persistCalculatedModuleProgress(
      engagementId,
      moduleId,
      clientProfileId,
    )

  const actorRole =
    await getUserRoleByProfileId(
      actorProfileId,
    )

  if (actorRole) {
    await recomputeEngagementProgress(
      engagementId,
      actorProfileId,
      actorRole,
    )
  }

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "progress_updated",
    "Module Progress Recalculated",
    `Module progress was recalculated automatically from its training sessions and materials.`,
  )

  return calculated.progress_row
}

/* =======================================================
   Progress / Completion
   ======================================================= */

async function recomputeEngagementProgress(
  engagementId: string,
  actorProfileId: string | null,
  actorRole: string,
) {
  const engagement =
    await query<{
      client_profile_id:
        string | null
      progress:
        number | null
    }>(
      `
        SELECT
          client_profile_id,
          progress

        FROM training_engagements

        WHERE id = $1

        LIMIT 1
      `,
      [engagementId],
    )

  const clientProfileId =
    engagement.rows[0]
      ?.client_profile_id ||
    null

  if (!clientProfileId) {
    return
  }

  const modules =
    await query<{
      id: string
    }>(
      `
        SELECT id

        FROM training_modules

        WHERE training_engagement_id =
          $1

        ORDER BY
          module_order ASC,
          created_at ASC
      `,
      [engagementId],
    )

  const calculatedModules =
    await Promise.all(
      modules.rows.map(
        async (module) =>
          persistCalculatedModuleProgress(
            engagementId,
            module.id,
            clientProfileId,
          ),
      ),
    )

  const moduleCount =
    calculatedModules.length

  const overallProgress =
    moduleCount === 0
      ? 0
      : Math.round(
          calculatedModules.reduce(
            (
              total,
              module,
            ) =>
              total +
              Number(
                module.completion_percentage ||
                  0,
              ),
            0,
          ) /
            moduleCount,
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
      overallProgress,
      engagementId,
    ],
  )

  /*
   * 100% requires an actual curriculum.
   */
  if (
    moduleCount === 0 ||
    overallProgress < 100
  ) {
    return
  }

  const approvedTrainers =
    await listApprovedTrainers(
      engagementId,
    )

  if (
    approvedTrainers.length === 0
  ) {
    await createTrainingUpdate(
      engagementId,
      actorProfileId,
      "progress_complete",
      "Progress Reached 100%",
      "Overall calculated training progress reached 100%, but no approved trainer is assigned. At least one approved trainer must confirm completion.",
    )

    return
  }

  const actorIsApprovedTrainer =
    Boolean(
      actorProfileId &&
        approvedTrainers.some(
          (trainer) =>
            trainer.trainer_profile_id ===
            actorProfileId,
        ),
    )

  const actorIsSuperAdmin =
    isSuperAdminRole(
      actorRole,
    )

  /*
   * Existing completion service remains
   * authoritative.
   */
  if (
    actorIsApprovedTrainer ||
    actorIsSuperAdmin
  ) {
    if (!actorProfileId) {
      return
    }

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
        actorIsSuperAdmin
          ? "Training was marked completed by the Super Administrator after calculated module progress reached 100%."
          : "Training was marked completed after calculated module progress reached 100% and an approved trainer confirmed completion.",
      )
    } catch (err: any) {
      console.error(
        "TRAINING COMPLETION ERROR:",
        err,
      )

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

  for (
    const trainer of approvedTrainers
  ) {
    try {
      if (!trainer.user_id) {
        continue
      }

      await notifyUser(
        trainer.user_id,
        {
          type:
            "training_progress_complete",

          title:
            "Training progress reached 100%",

          message:
            "Calculated training progress has reached 100%. Please confirm completion of the training engagement.",

          metadata: {
            training_engagement_id:
              engagementId,

            action:
              "confirm_completion",

            trainer_profile_id:
              trainer.trainer_profile_id,
          },
        },
      )
    } catch (
      notificationError
    ) {
      console.error(
        "TRAINER COMPLETION NOTIFICATION ERROR:",
        notificationError,
      )
    }
  }

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "progress_complete_pending",
    "Progress Reached 100%",
    "Calculated training progress reached 100%. Awaiting confirmation from an approved trainer to complete the training engagement.",
  )
}