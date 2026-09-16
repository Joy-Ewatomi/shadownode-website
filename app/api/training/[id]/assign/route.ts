import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  assignTrainer,
  getUserProfileId,
} from "@/lib/services/training-operations-service"
import {
  isTrainingAssignmentFunction,
  type TrainingAssignmentFunction,
} from "@/lib/role-access"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type RequestBody = {
  action?: string
  trainerProfileId?: string
  trainingRole?: string
  reason?: string
}

type ProfileRow = {
  role: string | null
  status: string | null
  full_name: string | null
}

type EngagementRow = {
  id: string
  engagement_number: string | null
}

type PendingTrainerRow = {
  id: string
  trainer_profile_id: string
  assigned_by: string | null
  approval_requested_by: string | null
  approval_reason: string | null
  assigned_at: Date | string | null
  created_at: Date | string | null
  trainer_name: string | null
  trainer_role: string | null
  trainer_status: string | null
}

/* ============================================================
   ROLE HELPERS
   ============================================================ */

function isSuperAdminRole(
  role: string | null | undefined,
): boolean {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function isAdministratorRole(
  role: string | null | undefined,
): boolean {
  return role === "administrator"
}

function isAllowedTrainerRole(
  role: string | null | undefined,
): boolean {
  return [
    "investigator",
    "analyst",
    "staff",
    "administrator",
    "super_administrator",
    "super-administrator",
  ].includes(role || "")
}

/* ============================================================
   ACTION HELPERS
   ============================================================ */

function normalizeAction(
  action: string | undefined,
): string {
  return String(action || "")
    .trim()
    .toLowerCase()
}

/* ============================================================
   ENGAGEMENT
   ============================================================ */

async function getEngagement(
  engagementId: string,
): Promise<EngagementRow | null> {
  const result =
    await query<EngagementRow>(
      `
        SELECT
          id,
          engagement_number
        FROM training_engagements
        WHERE id = $1
        LIMIT 1
      `,
      [engagementId],
    )

  return result.rows[0] || null
}

/* ============================================================
   TRAINER PROFILE
   ============================================================ */

async function getTrainerProfile(
  profileId: string,
): Promise<ProfileRow | null> {
  const result =
    await query<ProfileRow>(
      `
        SELECT
          au.role,
          au.status,
          up.full_name
        FROM user_profiles up
        JOIN app_users au
          ON au.id = up.user_id
        WHERE up.id = $1
        LIMIT 1
      `,
      [profileId],
    )

  return result.rows[0] || null
}

/* ============================================================
   PENDING TRAINER PROPOSAL
   ============================================================ */
async function getPendingTrainer(
  engagementId: string,
): Promise<PendingTrainerRow | null> {
  const result =
    await query<PendingTrainerRow>(
      `
        SELECT
          tet.id,
          tet.trainer_profile_id,
          tet.assigned_by,
          tet.approval_requested_by,
          tet.approval_reason,
          tet.assigned_at,
          tet.created_at,

          COALESCE(
            NULLIF(TRIM(up.full_name), ''),
            au.email
          ) AS trainer_name,

          au.role AS trainer_role,
          au.status AS trainer_status

        FROM training_engagement_trainers tet

        JOIN user_profiles up
          ON up.id = tet.trainer_profile_id

        JOIN app_users au
          ON au.id = up.user_id

        WHERE tet.training_engagement_id = $1
          AND tet.assignment_status =
            'pending_super_admin_approval'
          AND tet.removed_at IS NULL

        ORDER BY tet.created_at ASC

        LIMIT 1
      `,
      [engagementId],
    )

  return result.rows[0] || null
}

/* ============================================================
   ASSIGNMENT REASON
   ============================================================ */

function validateAssignmentReason(
  reason: string,
): string | null {
  if (!reason) {
    return "A reason for the trainer assignment is required."
  }

  if (reason.length < 20) {
    return "Please provide a more detailed reason for the trainer assignment."
  }

  if (reason.length > 2000) {
    return "The assignment reason must be 2000 characters or less."
  }

  return null
}

/* ============================================================
   POST
   ============================================================ */

export async function POST(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

    const isAdmin =
      isAdministratorRole(user.role)

    const isSuperAdmin =
      isSuperAdminRole(user.role)

    /*
     * Only Administrator and Super Administrator
     * can initiate trainer assignments.
     */
    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      )
    }

    const { id } =
      await context.params

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Training engagement ID is required",
        },
        {
          status: 400,
        },
      )
    }

    let body: RequestBody

    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body",
        },
        {
          status: 400,
        },
      )
    }

    const action =
      normalizeAction(body.action)

    const actorProfileId =
      await getUserProfileId(user.id)

    if (!actorProfileId) {
      return NextResponse.json(
        {
          error:
            "Your user profile could not be resolved.",
        },
        {
          status: 403,
        },
      )
    }

    /* ========================================================
       LOAD ENGAGEMENT
       ======================================================== */

    const engagement =
      await getEngagement(id)

    if (!engagement) {
      return NextResponse.json(
        {
          error:
            "Training engagement not found",
        },
        {
          status: 404,
        },
      )
    }

    /* ========================================================
       SUPER ADMIN — APPROVE
       ======================================================== */

    if (
      isSuperAdmin &&
      action === "approve"
    ) {
      const pendingTrainer =
        await getPendingTrainer(id)

      if (!pendingTrainer) {
        return NextResponse.json(
          {
            error:
              "There is no pending trainer assignment to approve.",
          },
          {
            status: 409,
          },
        )
      }

      /*
       * Re-check the proposed trainer at approval time.
       *
       * A trainer could have been disabled or had their
       * role changed after the administrator submitted
       * the proposal.
       */
      if (
        pendingTrainer.trainer_status !==
        "active"
      ) {
        return NextResponse.json(
          {
            error:
              "The proposed trainer is no longer active.",
          },
          {
            status: 409,
          },
        )
      }

      if (
        !isAllowedTrainerRole(
          pendingTrainer.trainer_role,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "The proposed trainer is no longer authorized to act as a trainer.",
          },
          {
            status: 403,
          },
        )
      }

      /*
       * Promote the EXISTING junction-table proposal
       * to approved.
       *
       * This is important:
       *
       * We do NOT delete existing approved trainers.
       * We do NOT replace the engagement's trainer list.
       */
      await query(
        `
         UPDATE training_engagement_trainers
SET
  assignment_status = 'approved',
  assigned_at = COALESCE(assigned_at, NOW()),
  approved_by = $1,
  approved_at = NOW(),
  updated_at = NOW()
WHERE id = $2
  AND training_engagement_id = $3
  AND assignment_status = 'pending_super_admin_approval'
  AND removed_at IS NULL
        `,
        [
          actorProfileId,
          pendingTrainer.id,
          id,
        ],
      )

      /*
       * Keep legacy engagement columns synchronized
       * for compatibility with older UI/code.
       *
       * These are NOT the source of truth.
       */
      await query(
        `
          UPDATE training_engagements
          SET
            assigned_trainer =
              $1,
            trainer_approval_status =
              'approved',
            trainer_approval_approved_by =
              $2,
            pending_trainer_id =
              NULL,
            trainer_approval_requested_by =
              NULL,
            trainer_approval_reason =
              NULL,
            updated_at = NOW()
          WHERE id = $3
        `,
        [
          pendingTrainer.trainer_profile_id,
          actorProfileId,
          id,
        ],
      )

      return NextResponse.json({
        success: true,
        action: "approved",
        approval_status: "approved",
        trainer: {
          id:
            pendingTrainer.trainer_profile_id,
          name:
            pendingTrainer.trainer_name ||
            "Assigned Trainer",
          role:
            pendingTrainer.trainer_role,
        },
      })
    }

    /* ========================================================
       SUPER ADMIN — REJECT
       ======================================================== */

    if (
      isSuperAdmin &&
      action === "reject"
    ) {
      const rejectionReason =
        typeof body.reason === "string"
          ? body.reason.trim()
          : ""

      if (!rejectionReason) {
        return NextResponse.json(
          {
            error:
              "A reason for rejecting the trainer assignment is required.",
          },
          {
            status: 400,
          },
        )
      }

      if (rejectionReason.length < 10) {
        return NextResponse.json(
          {
            error:
              "Please provide a more detailed rejection reason.",
          },
          {
            status: 400,
          },
        )
      }

      if (rejectionReason.length > 2000) {
        return NextResponse.json(
          {
            error:
              "The rejection reason must be 2000 characters or less.",
          },
          {
            status: 400,
          },
        )
      }

      const pendingTrainer =
        await getPendingTrainer(id)

      if (!pendingTrainer) {
        return NextResponse.json(
          {
            error:
              "There is no pending trainer assignment to reject.",
          },
          {
            status: 409,
          },
        )
      }

      /*
       * Reject the actual junction-table proposal.
       *
       * Keep the row for history.
       * Do NOT delete it.
       */
      await query(
        `
          UPDATE training_engagement_trainers
          SET
            assignment_status = 'rejected',
            approved_by = NULL,
            approved_at = NULL,
            approval_reason = $1,
            updated_at = NOW()
          WHERE id = $2
            AND training_engagement_id = $3
            AND assignment_status =
              'pending_super_admin_approval'
            AND removed_at IS NULL
        `,
        [
          `Rejected by Super Administrator: ${rejectionReason}`,
          pendingTrainer.id,
          id,
        ],
      )

      /*
       * Clear the legacy pending mirror.
       *
       * Existing approved trainers remain untouched.
       */
      await query(
        `
          UPDATE training_engagements
          SET
            pending_trainer_id = NULL,
            trainer_approval_requested_by = NULL,
            trainer_approval_approved_by = NULL,
            trainer_approval_status = 'rejected',
            trainer_approval_reason = $1,
            updated_at = NOW()
          WHERE id = $2
        `,
        [
          `Rejected by Super Administrator: ${rejectionReason}`,
          id,
        ],
      )

      return NextResponse.json({
        success: true,
        action: "rejected",
        approval_status: "rejected",
        trainer: {
          id:
            pendingTrainer.trainer_profile_id,
          name:
            pendingTrainer.trainer_name ||
            "Proposed Trainer",
          role:
            pendingTrainer.trainer_role,
        },
      })
    }

    /* ========================================================
       NORMAL ASSIGNMENT
       ======================================================== */

    const trainerProfileId =
      typeof body.trainerProfileId ===
      "string"
        ? body.trainerProfileId.trim()
        : ""

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : ""

    const trainingRoleRaw =
      typeof body.trainingRole === "string"
        ? body.trainingRole.trim()
        : "trainer"

    if (
      !isTrainingAssignmentFunction(
        trainingRoleRaw,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid training assignment role",
        },
        {
          status: 400,
        },
      )
    }

    const trainingRole: TrainingAssignmentFunction =
      trainingRoleRaw

    if (!trainerProfileId) {
      return NextResponse.json(
        {
          error:
            "trainerProfileId is required",
        },
        {
          status: 400,
        },
      )
    }

    const reasonError =
      validateAssignmentReason(reason)

    if (reasonError) {
      return NextResponse.json(
        {
          error: reasonError,
        },
        {
          status: 400,
        },
      )
    }

    /* ========================================================
       VALIDATE TARGET TRAINER
       ======================================================== */

    const trainerProfile =
      await getTrainerProfile(
        trainerProfileId,
      )

    if (!trainerProfile) {
      return NextResponse.json(
        {
          error:
            "Trainer profile not found",
        },
        {
          status: 404,
        },
      )
    }

    if (
      trainerProfile.status !==
      "active"
    ) {
      return NextResponse.json(
        {
          error:
            "The selected trainer is not active.",
        },
        {
          status: 403,
        },
      )
    }

    if (
      !isAllowedTrainerRole(
        trainerProfile.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Target profile is not authorized to act as a trainer",
        },
        {
          status: 403,
        },
      )
    }

    /* ========================================================
       ADMINISTRATOR → PROPOSAL
       ======================================================== */

    if (isAdmin) {
      /*
       * Prevent multiple simultaneous pending proposals
       * for the same engagement.
       *
       * Multiple APPROVED trainers are supported.
       * Only one proposal waits for Super Admin at a time.
       */
      const existingPending =
        await getPendingTrainer(id)

      if (existingPending) {
        return NextResponse.json(
          {
            error:
              "There is already a trainer assignment waiting for Super Administrator approval.",
            pending_trainer: {
              id:
                existingPending.trainer_profile_id,
              name:
                existingPending.trainer_name ||
                "Proposed Trainer",
              role:
                existingPending.trainer_role,
            },
          },
          {
            status: 409,
          },
        )
      }

      /*
       * Prevent proposing a trainer who is already
       * approved for this engagement.
       */
      const alreadyApproved =
        await query<{
          id: string
        }>(
          `
            SELECT id
            FROM training_engagement_trainers
            WHERE training_engagement_id = $1
              AND trainer_profile_id = $2
              AND assignment_status = 'approved'
              AND removed_at IS NULL
            LIMIT 1
          `,
          [
            id,
            trainerProfileId,
          ],
        )

      if (alreadyApproved.rows[0]) {
        return NextResponse.json(
          {
            error:
              "This trainer is already assigned to the training engagement.",
          },
          {
            status: 409,
          },
        )
      }

      /*
       * assignTrainer() creates/updates the junction
       * table proposal with:
       *
       * pending_super_admin_approval
       */
      await assignTrainer(
        id,
        trainerProfileId,
        actorProfileId,
        user.role,
        trainingRole,
      )

      /*
       * Compatibility mirror only.
       *
       * The junction table remains authoritative.
       */
      await query(
        `
          UPDATE training_engagements
          SET
            pending_trainer_id = $1,
            trainer_approval_status =
              'pending_super_admin_approval',
            trainer_approval_requested_by =
              $2,
            trainer_approval_approved_by =
              NULL,
            trainer_approval_reason =
              $3,
            updated_at = NOW()
          WHERE id = $4
        `,
        [
          trainerProfileId,
          actorProfileId,
          reason,
          id,
        ],
      )

      return NextResponse.json({
        success: true,
        action:
          "submitted_for_approval",
        pending_approval: true,
        approval_status:
          "pending_super_admin_approval",
        trainer: {
          id: trainerProfileId,
          name:
            trainerProfile.full_name ||
            "Selected Trainer",
          role:
            trainerProfile.role,
        },
      })
    }

    /* ========================================================
       SUPER ADMIN → DIRECT ASSIGNMENT
       ======================================================== */

    if (isSuperAdmin) {
      /*
       * Super Administrator can directly approve a trainer.
       *
       * Existing approved trainers remain assigned.
       */
      await assignTrainer(
        id,
        trainerProfileId,
        actorProfileId,
        user.role,
        trainingRole,
      )

      /*
       * Compatibility mirror only.
       */
      await query(
        `
          UPDATE training_engagements
          SET
            assigned_trainer = $1,
            trainer_approval_status =
              'approved',
            trainer_approval_approved_by =
              $2,
            pending_trainer_id = NULL,
            trainer_approval_requested_by =
              NULL,
            trainer_approval_reason =
              $3,
            updated_at = NOW()
          WHERE id = $4
        `,
        [
          trainerProfileId,
          actorProfileId,
          reason,
          id,
        ],
      )

      return NextResponse.json({
        success: true,
        action:
          "assigned_directly",
        pending_approval: false,
        approval_status: "approved",
        trainer: {
          id: trainerProfileId,
          name:
            trainerProfile.full_name ||
            "Assigned Trainer",
          role:
            trainerProfile.role,
        },
      })
    }

    return NextResponse.json(
      {
        error:
          "Unable to process trainer assignment.",
      },
      {
        status: 400,
      },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINER ASSIGNMENT API ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process trainer assignment",
      },
      {
        status: 500,
      },
    )
  }
}
