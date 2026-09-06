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

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date)
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

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date)
}

function formatStatus(value: string | null): string {
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
   *
   * Client:
   *   Only their own engagement.
   *
   * Investigator / Analyst:
   *   Only if explicitly approved as trainer
   *   for THIS engagement.
   *
   * Administrator:
   *   Can oversee training when training:view exists.
   *   Administrator role alone does NOT make them
   *   the trainer.
   *
   * Super Administrator:
   *   Full training oversight.
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
   * TRAINER
   * ============================================================
   */

  let trainerName =
    "Not assigned"

  if (engagement.assigned_trainer) {
    const trainerResult =
      await query<ProfileRow>(
        `
          SELECT
            id,
            full_name

          FROM user_profiles

          WHERE id = $1

          LIMIT 1
        `,
        [engagement.assigned_trainer],
      )

    trainerName =
      trainerResult.rows[0]
        ?.full_name?.trim() ||
      trainerName
  }

  /*
   * ============================================================
   * PENDING TRAINER
   * ============================================================
   */

  let pendingTrainerName =
    "Not specified"

  if (engagement.pending_trainer_id) {
    const pendingTrainerResult =
      await query<ProfileRow>(
        `
          SELECT
            id,
            full_name

          FROM user_profiles

          WHERE id = $1

          LIMIT 1
        `,
        [engagement.pending_trainer_id],
      )

    pendingTrainerName =
      pendingTrainerResult.rows[0]
        ?.full_name?.trim() ||
      pendingTrainerName
  }

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

  const canAssignTrainer =
    user.role === "administrator" ||
    isSuperAdminRole(user.role)

  const trainerApprovalStatus =
    engagement.trainer_approval_status ||
    "none"

  const hasPendingTrainerApproval =
    trainerApprovalStatus ===
      "pending" ||
    trainerApprovalStatus ===
      "pending_super_admin_approval"

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
   * OVERVIEW
   * ============================================================
   */

  return (
    <div className="space-y-6">
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

              {trainerApprovalStatus ===
                "approved" && (
                <span className="rounded-md border border-[#20dc73]/20 bg-[#20dc73]/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#20dc73]">
                  Trainer Approved
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

        <div>
          <InfoCard
            label="Trainer"
            value={trainerName}
          />

          {canAssignTrainer && (
            <AssignTrainerForm
              engagementId={id}
              currentTrainer={trainerName}
            />
          )}

          {hasPendingTrainerApproval && (
            <div className="mt-3 rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-yellow-300/70">
                Pending Trainer
              </p>

              <p className="mt-1 text-sm font-medium text-white">
                {pendingTrainerName}
              </p>

              <p className="mt-1 text-[10px] leading-4 text-white/35">
                Awaiting Super Administrator
                approval before this person
                becomes the assigned trainer.
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
          TRAINER APPROVAL INFORMATION
      ====================================================== */}

      {(hasPendingTrainerApproval ||
        trainerApprovalStatus ===
          "approved") &&
        (canAssignTrainer ||
          isSuperAdminRole(
            user.role,
          )) && (
          <section className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#20dc73]/60">
                  Trainer Assignment
                </p>

                <h3 className="mt-1 text-lg font-semibold text-white">
                  Assignment Approval
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                  Trainer assignments proposed
                  by Administrators require
                  Super Administrator approval
                  before trainer access is
                  activated.
                </p>
              </div>

              <div className="rounded-lg border border-[#143b28] bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">
                  Status
                </p>

                <p className="mt-1 text-sm font-medium text-white">
                  {formatStatus(
                    trainerApprovalStatus,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoCard
                label="Proposed Trainer"
                value={
                  pendingTrainerName
                }
              />

              <InfoCard
                label="Current Trainer"
                value={trainerName}
              />
            </div>

            {engagement.trainer_approval_reason && (
              <div className="mt-4 rounded-lg border border-white/5 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">
                  Assignment Reason
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/55">
                  {
                    engagement.trainer_approval_reason
                  }
                </p>
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