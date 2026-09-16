import { notFound, redirect } from "next/navigation"
import Link from "next/link"

import { query } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { hasPermission } from "@/lib/permission"
import {
  getUserProfileId,
  isApprovedTrainerForEngagement,
} from "@/lib/services/training-operations-service"
import AssignTrainerForm from "@/components/training/AssignTrainerForm"
import TrainerApprovalActions from "@/components/training/TrainerApprovalActions"
import MarkResourceNotificationsRead from "@/components/notifications/MarkResourceNotificationsRead"

type TrainingEngagementPageProps = {
  params: Promise<{
    id: string
  }>
}

type TrainingEngagementRow = {
  id: string
  engagement_number: string
  organization_id: string
  request_id: string | null
  client_profile_id: string | null

  training_organization_name: string | null
  training_client_type: string | null
  participant_count: number | null
  skill_level: string | null
  training_goal: string | null
  training_topics: string | null
  preferred_dates: string | Date | null
  additional_requirements: string | null

  preferred_start_date: string | Date | null
  preferred_completion_date: string | Date | null
  timeline_flexible: boolean | null

  status: string | null
  payment_status: string | null

  /*
   * Legacy compatibility fields.
   *
   * These are intentionally NOT used as the authoritative
   * trainer source of truth.
   */
  assigned_trainer: string | null
  pending_trainer_id: string | null
  trainer_approval_status: string | null
  trainer_approval_requested_by: string | null
  trainer_approval_approved_by: string | null
  trainer_approval_reason: string | null

  progress: number | null

  started_at: string | Date | null
  completed_at: string | Date | null

  created_at: string | Date | null
  updated_at: string | Date | null
}

type RequestRow = {
  title: string | null
  description: string | null
  service_type: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
}

type TrainerAssignmentRow = {
  id: string
  training_engagement_id: string
  trainer_profile_id: string
  assignment_status: string
  assigned_by: string | null
  approval_requested_by: string | null
  approved_by: string | null
  approval_reason: string | null
  assigned_at: string | Date | null
  approved_at: string | Date | null
  removed_at: string | Date | null
  trainer_name: string | null
}

type PendingTrainerRow = TrainerAssignmentRow

/*
 * ============================================================
 * DISPLAY HELPERS
 * ============================================================
 */

function formatDate(value: string | Date | null): string {
  if (!value) {
    return "Not specified"
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatDateTime(
  value: string | Date | null,
): string {
  if (!value) {
    return "Not available"
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatStatus(
  value: string | null | undefined,
): string {
  if (!value) {
    return "Unknown"
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    )
}

function isSuperAdminRole(
  role: string | null | undefined,
): boolean {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function isPendingAssignment(
  status: string | null | undefined,
): boolean {
  return (
    status ===
      "pending_super_admin_approval" ||
    status === "pending"
  )
}

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default async function TrainingEngagementPage({
  params,
}: TrainingEngagementPageProps) {
  const { id } = await params

  /*
   * ============================================================
   * CURRENT USER
   * ============================================================
   */

  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  /*
   * ============================================================
   * LOAD ENGAGEMENT
   * ============================================================
   */

  const engagementResult =
    await query<TrainingEngagementRow>(
      `
        SELECT
          id,
          engagement_number,
          organization_id,
          request_id,
          client_profile_id,

          training_organization_name,
          training_client_type,
          participant_count,
          skill_level,
          training_goal,
          training_topics,
          preferred_dates,
          additional_requirements,

          preferred_start_date,
          preferred_completion_date,
          timeline_flexible,

          status,
          payment_status,

          assigned_trainer,
          pending_trainer_id,
          trainer_approval_status,
          trainer_approval_requested_by,
          trainer_approval_approved_by,
          trainer_approval_reason,

          progress,

          started_at,
          completed_at,

          created_at,
          updated_at

        FROM training_engagements

        WHERE id = $1

        LIMIT 1
      `,
      [id],
    )

  const engagement =
    engagementResult.rows[0]

  if (!engagement) {
    notFound()
  }

  /*
   * ============================================================
   * CURRENT USER PROFILE
   * ============================================================
   */

  let profileId: string | null = null

  try {
    profileId =
      await getUserProfileId(user.id)
  } catch {
    profileId = null
  }

  /*
   * ============================================================
   * AUTHORIZATION
   * ============================================================
   */

  if (user.role === "client") {
    if (!profileId) {
      redirect("/dashboard/training")
    }

    if (
      !engagement.client_profile_id ||
      engagement.client_profile_id !== profileId
    ) {
      notFound()
    }
  } else if (
    user.role === "staff" ||
    user.role === "investigator" ||
    user.role === "analyst"
  ) {
    if (!profileId) {
      notFound()
    }

    const approvedTrainer =
      await isApprovedTrainerForEngagement(
        id,
        user,
        profileId,
      )

    if (!approvedTrainer) {
      notFound()
    }
  } else if (
    user.role === "administrator"
  ) {
    if (!hasPermission(user, "training:view")) {
      redirect("/dashboard")
    }
  } else if (
    isSuperAdminRole(user.role)
  ) {
    if (!hasPermission(user, "training:view")) {
      redirect("/dashboard")
    }
  } else {
    redirect("/dashboard")
  }

  /*
   * ============================================================
   * REQUEST
   * ============================================================
   */

  let request: RequestRow | null = null

  if (engagement.request_id) {
    const requestResult =
      await query<RequestRow>(
        `
          SELECT
            title,
            description,
            service_type
          FROM requests
          WHERE id = $1
          LIMIT 1
        `,
        [engagement.request_id],
      )

    request =
      requestResult.rows[0] || null
  }

  /*
   * ============================================================
   * CLIENT
   * ============================================================
   */

  let clientName =
    "Training Client"

  if (engagement.client_profile_id) {
    const clientResult =
      await query<ProfileRow>(
        `
          SELECT
            id,
            full_name
          FROM user_profiles
          WHERE id = $1
          LIMIT 1
        `,
        [engagement.client_profile_id],
      )

    clientName =
      clientResult.rows[0]
        ?.full_name?.trim() ||
      clientName
  }

  /*
   * ============================================================
   * AUTHORITATIVE TRAINER ASSIGNMENTS
   *
   * IMPORTANT:
   *
   * training_engagement_trainers is now the source of truth.
   *
   * We intentionally do NOT derive the active trainer list
   * from training_engagements.assigned_trainer.
   * ============================================================
   */

  const trainerAssignmentsResult =
    await query<TrainerAssignmentRow>(
      `
        SELECT
          tet.id,
          tet.training_engagement_id,
          tet.trainer_profile_id,
          tet.assignment_status,
          tet.assigned_by,
          tet.approval_requested_by,
          tet.approved_by,
          tet.approval_reason,
          tet.assigned_at,
          tet.approved_at,
          tet.removed_at,

          COALESCE(
            NULLIF(TRIM(up.full_name), ''),
            'Unnamed Trainer'
          ) AS trainer_name

        FROM training_engagement_trainers tet

        LEFT JOIN user_profiles up
          ON up.id = tet.trainer_profile_id

        WHERE tet.training_engagement_id = $1

        ORDER BY
          CASE
            WHEN tet.assignment_status = 'approved'
              THEN 0
            WHEN tet.assignment_status = 'pending_super_admin_approval'
              THEN 1
            ELSE 2
          END,
          tet.created_at ASC
      `,
      [id],
    )

  const trainerAssignments =
    trainerAssignmentsResult.rows

  /*
   * ============================================================
   * APPROVED TRAINERS
   * ============================================================
   */

  const approvedTrainers =
    trainerAssignments.filter(
      (trainer) =>
        trainer.assignment_status ===
          "approved" &&
        !trainer.removed_at,
    )

  /*
   * ============================================================
   * PENDING PROPOSAL
   *
   * Current design intentionally supports only one pending
   * proposal at a time.
   * ============================================================
   */

  const pendingTrainer =
    trainerAssignments.find(
      (trainer) =>
        isPendingAssignment(
          trainer.assignment_status,
        ) &&
        !trainer.removed_at,
    ) || null

  const hasPendingTrainerApproval =
    Boolean(pendingTrainer)

  /*
   * ============================================================
   * TRAINER DISPLAY
   * ============================================================
   */

  const trainerName =
    approvedTrainers.length > 0
      ? approvedTrainers
          .map(
            (trainer) =>
              trainer.trainer_name ||
              "Unnamed Trainer",
          )
          .join(", ")
      : "Not assigned"

  const pendingTrainerName =
    pendingTrainer?.trainer_name?.trim() ||
    "Not specified"

  /*
   * ============================================================
   * VALUES
   * ============================================================
   */

  const progress = Math.min(
    100,
    Math.max(
      0,
      Number(
        engagement.progress ?? 0,
      ),
    ),
  )

  const status =
    engagement.status ||
    "awaiting_payment"

  const paymentStatus =
    engagement.payment_status ||
    "pending"

  const statusLabel =
    formatStatus(status)

  const paymentLabel =
    formatStatus(paymentStatus)

  /*
   * Administrator can propose a trainer.
   *
   * Super Administrator can directly assign a trainer,
   * except while a pending proposal is awaiting a decision.
   *
   * This is intentionally separate from trainer capability.
   */
  const canAssignTrainer =
    user.role === "administrator" ||
    isSuperAdminRole(user.role)

  /*
   * A normal administrator does NOT become a trainer simply
   * because they are an administrator.
   *
   * They only gain trainer capabilities if they themselves
   * become an approved trainer in training_engagement_trainers.
   */

  const isCurrentUserApprovedTrainer =
    Boolean(
      profileId &&
        approvedTrainers.some(
          (trainer) =>
            trainer.trainer_profile_id ===
            profileId,
        ),
    )

  /*
   * ============================================================
   * LEGACY APPROVAL STATUS
   *
   * Only used for displaying old compatibility information
   * when the junction table has no current pending proposal.
   *
   * The actual pending state comes from the junction table.
   * ============================================================
   */

  const legacyApprovalStatus =
    engagement.trainer_approval_status ||
    "none"

  const trainerApprovalReason =
    pendingTrainer?.approval_reason ||
    engagement.trainer_approval_reason ||
    null

  /*
   * ============================================================
   * FORMATTED DATES
   * ============================================================
   */

  const preferredDates =
    engagement.preferred_dates
      ? typeof engagement.preferred_dates ===
        "string"
        ? engagement.preferred_dates
        : formatDate(
            engagement.preferred_dates,
          )
      : "Not specified"

  const preferredStartDate =
    formatDate(
      engagement.preferred_start_date,
    )

  const preferredCompletionDate =
    formatDate(
      engagement.preferred_completion_date,
    )

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <div className="space-y-6">
      <MarkResourceNotificationsRead
        resourceType="training"
        resourceId={id}
      />

      {/* ======================================================
          ENGAGEMENT SUMMARY
      ====================================================== */}

      <section className="group rounded-xl border border-[#143b28] bg-[#020806]/90 p-6 transition hover:border-[#20dc73]/30 hover:bg-[#06150d]/95">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#20dc73]/60">
              Training Engagement
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              {request?.title ||
                engagement.training_goal ||
                "Professional Training"}
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
              {request?.description ||
                "Training engagement workspace for planning, scheduling, materials, progress, feedback and certificate completion."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-md border border-[#20dc73]/20 bg-[#20dc73]/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#20dc73]">
                {statusLabel}
              </span>

              <span className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/50">
                Payment: {paymentLabel}
              </span>

              {hasPendingTrainerApproval && (
                <span className="rounded-md border border-yellow-400/20 bg-yellow-400/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-yellow-300">
                  Trainer Approval Pending
                </span>
              )}

              {approvedTrainers.length > 0 && (
                <span className="rounded-md border border-[#20dc73]/20 bg-[#20dc73]/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#20dc73]">
                  {approvedTrainers.length}{" "}
                  {approvedTrainers.length ===
                  1
                    ? "Trainer"
                    : "Trainers"}{" "}
                  Assigned
                </span>
              )}
            </div>
          </div>

          {/* ==================================================
              PROGRESS
          ================================================== */}

          <div className="w-full shrink-0 rounded-xl border border-[#143b28] bg-black/20 p-5 sm:w-64">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/35">
                  Overall Progress
                </p>

                <p className="mt-2 font-mono text-3xl font-semibold text-[#20dc73]">
                  {progress}%
                </p>
              </div>

              <span className="font-mono text-[10px] text-white/30">
                {progress === 100
                  ? "COMPLETE"
                  : "ACTIVE"}
              </span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[#20dc73] transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          CORE INFORMATION
      ====================================================== */}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label="Client"
          value={clientName}
        />

        {/* ====================================================
            TRAINERS
        ==================================================== */}

        <div className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/35">
                Assigned Trainers
              </p>

              <p className="mt-2 text-sm font-medium text-white">
                {trainerName}
              </p>
            </div>

            {approvedTrainers.length >
              0 && (
              <span className="rounded-md border border-[#20dc73]/20 bg-[#20dc73]/5 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#20dc73]">
                {approvedTrainers.length}
              </span>
            )}
          </div>

          {approvedTrainers.length >
            0 && (
            <div className="mt-4 space-y-2">
              {approvedTrainers.map(
                (trainer) => (
                  <div
                    key={trainer.id}
                    className="rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                  >
                    <p className="text-xs font-medium text-white">
                      {trainer.trainer_name ||
                        "Unnamed Trainer"}
                    </p>

                    <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[#20dc73]/50">
                      Approved Trainer
                    </p>
                  </div>
                ),
              )}
            </div>
          )}

          {/* ==================================================
              ASSIGNMENT FORM
          ================================================== */}

          {canAssignTrainer &&
            !(
              isSuperAdminRole(
                user.role,
              ) &&
              hasPendingTrainerApproval
            ) && (
              <div className="mt-4">
                <AssignTrainerForm
                  engagementId={id}
                  currentTrainer={trainerName}
                  isSuperAdmin={isSuperAdminRole(
                    user.role,
                  )}
                />
              </div>
            )}

          {/* ==================================================
              PENDING PROPOSAL
          ================================================== */}

          {hasPendingTrainerApproval && (
            <div className="mt-4 rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-yellow-300/70">
                    Pending Trainer Proposal
                  </p>

                  <p className="mt-1 text-sm font-medium text-white">
                    {pendingTrainerName}
                  </p>

                  <p className="mt-1 text-[10px] leading-4 text-white/35">
                    Awaiting Super Administrator
                    approval. This person does not
                    have trainer access yet.
                  </p>
                </div>

                <span className="shrink-0 rounded-md border border-yellow-400/20 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-yellow-300">
                  Pending
                </span>
              </div>
            </div>
          )}

          {/* ==================================================
              TRAINER ACCESS NOTICE
          ================================================== */}

          {isCurrentUserApprovedTrainer && (
            <div className="mt-4 rounded-lg border border-[#20dc73]/20 bg-[#20dc73]/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#20dc73]/70">
                Trainer Access Active
              </p>

              <p className="mt-1 text-xs leading-5 text-white/55">
                You are an approved trainer for
                this engagement and may access the
                training operational functions
                available to your role.
              </p>
            </div>
          )}
        </div>

        <InfoCard
          label="Participants"
          value={
            engagement.participant_count !==
            null
              ? String(
                  engagement.participant_count,
                )
              : "Not specified"
          }
        />

        <InfoCard
          label="Skill Level"
          value={
            engagement.skill_level ||
            "Not specified"
          }
        />
      </section>

      {/* ======================================================
          TRAINING DETAILS
      ====================================================== */}

      <section className="grid gap-5 lg:grid-cols-2">
        <DetailCard title="Training Objective">
          <p className="text-sm leading-7 text-white/55">
            {engagement.training_goal ||
              "No training objective has been provided."}
          </p>
        </DetailCard>

        <DetailCard title="Training Topics">
          <p className="whitespace-pre-wrap text-sm leading-7 text-white/55">
            {engagement.training_topics ||
              "No training topics have been specified."}
          </p>
        </DetailCard>

        <DetailCard title="Preferred Timeline">
          <div className="space-y-3">
            <DetailRow
              label="Preferred Dates"
              value={preferredDates}
            />

            <DetailRow
              label="Start"
              value={preferredStartDate}
            />

            <DetailRow
              label="Completion"
              value={
                preferredCompletionDate
              }
            />

            <DetailRow
              label="Flexible"
              value={
                engagement.timeline_flexible
                  ? "Yes"
                  : "No"
              }
            />
          </div>
        </DetailCard>

        <DetailCard title="Additional Requirements">
          <p className="whitespace-pre-wrap text-sm leading-7 text-white/55">
            {engagement.additional_requirements ||
              "No additional requirements have been specified."}
          </p>
        </DetailCard>
      </section>

      {/* ======================================================
          TRAINER ASSIGNMENT / APPROVAL
      ====================================================== */}

      {(hasPendingTrainerApproval ||
        approvedTrainers.length > 0 ||
        legacyApprovalStatus ===
          "rejected") &&
        (canAssignTrainer ||
          isSuperAdminRole(user.role)) && (
          <section className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#20dc73]/60">
                  Trainer Assignment
                </p>

                <h3 className="mt-1 text-lg font-semibold text-white">
                  Assignment Management
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                  {hasPendingTrainerApproval
                    ? "A trainer assignment has been proposed and is awaiting Super Administrator review."
                    : approvedTrainers.length >
                        0
                      ? "Approved trainers currently have active access to this training engagement."
                      : "No trainer is currently assigned to this engagement."}
                </p>
              </div>

              <div
                className={[
                  "rounded-lg border px-4 py-3",
                  hasPendingTrainerApproval
                    ? "border-yellow-400/20 bg-yellow-400/5"
                    : approvedTrainers.length >
                        0
                      ? "border-[#20dc73]/20 bg-[#20dc73]/5"
                      : "border-red-400/20 bg-red-400/5",
                ].join(" ")}
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">
                  Status
                </p>

                <p
                  className={[
                    "mt-1 text-sm font-medium",
                    hasPendingTrainerApproval
                      ? "text-yellow-300"
                      : approvedTrainers.length >
                          0
                        ? "text-[#20dc73]"
                        : "text-red-300",
                  ].join(" ")}
                >
                  {hasPendingTrainerApproval
                    ? "Pending Super Admin Approval"
                    : approvedTrainers.length >
                        0
                      ? "Active"
                      : "Unassigned"}
                </p>
              </div>
            </div>

            {/* ==================================================
                APPROVED TRAINER LIST
            ================================================== */}

            {approvedTrainers.length >
              0 && (
              <div className="mt-5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">
                  Active Trainers
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {approvedTrainers.map(
                    (trainer) => (
                      <div
                        key={trainer.id}
                        className="rounded-lg border border-[#143b28] bg-black/20 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {trainer.trainer_name ||
                                "Unnamed Trainer"}
                            </p>

                            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#20dc73]/50">
                              Approved Trainer
                            </p>
                          </div>

                          <span className="rounded-md border border-[#20dc73]/20 bg-[#20dc73]/5 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#20dc73]">
                            ACTIVE
                          </span>
                        </div>

                        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                          <DetailRow
                            label="Assigned"
                            value={formatDateTime(
                              trainer.assigned_at,
                            )}
                          />

                          <DetailRow
                            label="Approved"
                            value={formatDateTime(
                              trainer.approved_at,
                            )}
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* ==================================================
                PENDING APPROVAL
            ================================================== */}

            {hasPendingTrainerApproval &&
              pendingTrainer && (
                <div className="mt-5 rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-yellow-300/70">
                        Pending Trainer Proposal
                      </p>

                      <h4 className="mt-1 text-base font-semibold text-white">
                        {pendingTrainerName}
                      </h4>

                      <p className="mt-2 text-xs leading-5 text-white/45">
                        This assignment is not active
                        yet. Super Administrator approval
                        is required before trainer access is
                        granted.
                      </p>
                    </div>

                    <span className="shrink-0 rounded-md border border-yellow-400/20 bg-yellow-400/5 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-yellow-300">
                      Awaiting Review
                    </span>
                  </div>

                  {trainerApprovalReason && (
                    <div className="mt-4 rounded-lg border border-white/5 bg-black/20 p-4">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">
                        Assignment Reason
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/55">
                        {trainerApprovalReason}
                      </p>
                    </div>
                  )}

                  {/* ==================================================
                      SUPER ADMIN APPROVAL ACTIONS
                  ================================================== */}

                  {isSuperAdminRole(
                    user.role,
                  ) && (
                    <TrainerApprovalActions
                      engagementId={id}
                      pendingTrainerName={
                        pendingTrainerName
                      }
                    />
                  )}
                </div>
              )}

            {/* ==================================================
                REJECTED
            ================================================== */}

            {!hasPendingTrainerApproval &&
              legacyApprovalStatus ===
                "rejected" &&
              approvedTrainers.length ===
                0 && (
                <div className="mt-5 rounded-lg border border-red-400/20 bg-red-400/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-red-300/70">
                    Previous Proposal Rejected
                  </p>

                  <p className="mt-2 text-sm leading-6 text-white/50">
                    The previous trainer assignment
                    proposal was rejected. An Administrator
                    may submit a new proposal.
                  </p>

                  {engagement.trainer_approval_reason && (
                    <div className="mt-3 rounded-lg border border-white/5 bg-black/20 p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">
                        Previous Decision Reason
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/50">
                        {
                          engagement.trainer_approval_reason
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
          </section>
        )}

      {/* ======================================================
          WORKSPACE
      ====================================================== */}

      <section>
        <div className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#20dc73]/60">
            Engagement Workspace
          </p>

          <h2 className="mt-1 text-lg font-semibold text-white">
            Training Operations
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <WorkspaceLink
            href={`/dashboard/training/${id}/plan`}
            title="Curriculum Roadmap"
            description="Learning path, modules, objectives and training structure."
          />

          <WorkspaceLink
            href={`/dashboard/training/${id}/schedule`}
            title="Schedule"
            description="Sessions, dates and training timeline."
          />

          <WorkspaceLink
            href={`/dashboard/training/${id}/materials`}
            title="Materials"
            description="Resources, links and uploaded training material."
          />

          <WorkspaceLink
            href={`/dashboard/training/${id}/progress`}
            title="Progress"
            description="Track modules, milestones and completion."
          />

          <WorkspaceLink
            href={`/dashboard/training/${id}/updates`}
            title="Updates"
            description="Engagement activity and important updates."
          />

          <WorkspaceLink
            href={`/dashboard/training/${id}/feedback`}
            title="Feedback"
            description="Required client feedback after completion."
          />

          <WorkspaceLink
            href={`/dashboard/training/${id}/certificate`}
            title="Certificate"
            description="View and verify the training certificate."
          />
        </div>
      </section>
    </div>
  )
}

/* ============================================================
   COMPONENTS
============================================================ */

function InfoCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-5">
      <p className="text-[10px] uppercase tracking-[0.15em] text-white/35">
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-medium text-white">
        {value}
      </p>
    </div>
  )
}

function DetailCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-5">
      <h3 className="text-sm font-semibold text-white">
        {title}
      </h3>

      <div className="mt-4">
        {children}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-white/35">
        {label}
      </span>

      <span className="text-right text-xs text-white/65">
        {value}
      </span>
    </div>
  )
}

function WorkspaceLink({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-[#143b28] bg-[#04100b]/60 p-5 transition hover:border-[#20dc73]/30 hover:bg-[#20dc73]/5"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-semibold text-white transition group-hover:text-[#20dc73]">
          {title}
        </h3>

        <span className="text-white/20 transition group-hover:text-[#20dc73]">
          →
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-white/45">
        {description}
      </p>

      <div className="mt-5 h-px bg-[#143b28]" />

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[#20dc73]/50">
        Open Module
      </p>
    </Link>
  )
}
