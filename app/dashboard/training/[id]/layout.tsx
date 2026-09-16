import { redirect, notFound } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { hasPermission } from "@/lib/permission"
import { query } from "@/lib/db"

import TrainingShell from "@/components/training/TrainingShell"
import { getUserProfileId } from "@/lib/services/training-operations-service"
import MarkResourceNotificationsRead from "@/components/notifications/MarkResourceNotificationsRead"

type TrainingEngagementLayoutProps = {
  children: React.ReactNode
  params: Promise<{
    id: string
  }>
}

type TrainingEngagementRow = {
  id: string
  engagement_number: string
  request_id: string | null
  client_profile_id: string | null

  training_organization_name: string | null
  training_client_type: string | null
  skill_level: string | null
  training_goal: string | null
  training_topics: string | null

  status: string | null
  payment_status: string | null
  assigned_trainer: string | null
  progress: number | null

  started_at: string | null
  completed_at: string | null
  created_at: string | null
}

type RequestRow = {
  title: string | null
  service_type: string | null
}

type ClientProfileRow = {
  id: string
  user_id: string | null
}

export default async function TrainingEngagementLayout({
  children,
  params,
}: TrainingEngagementLayoutProps) {
  const { id } = await params

  if (!id?.trim()) {
    notFound()
  }

  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  /*
   * ============================================================
   * LOAD TRAINING ENGAGEMENT
   * ============================================================
   */

  const engagementResult =
    await query<TrainingEngagementRow>(
      `
        SELECT
          id,
          engagement_number,
          request_id,
          client_profile_id,

          training_organization_name,
          training_client_type,
          skill_level,
          training_goal,
          training_topics,

          status,
          payment_status,
          assigned_trainer,
          progress,

          started_at,
          completed_at,
          created_at

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
   * ACCESS CONTROL
   * ============================================================
   *
   * Staff members with training:view can access engagements.
   *
   * Clients may only access their own training engagement.
   */

  const canViewTraining =
    hasPermission(
      user,
      "training:view",
    )

  // Only approved trainers can access training operations for this engagement.
  let isAssignedTrainer = false

  if (
    user.role === "staff" ||
    user.role === "investigator" ||
    user.role === "analyst"
  ) {
    const profileId = await getUserProfileId(user.id)
    if (
      profileId &&
      engagement.assigned_trainer === profileId &&
      engagement.status !== "pending_super_admin_approval"
    ) {
      isAssignedTrainer = true
    }
  }

  let isOwner = false

  if (
    user.role === "client" &&
    engagement.client_profile_id
  ) {
    const profileResult =
      await query<ClientProfileRow>(
        `
          SELECT
            id,
            user_id

          FROM user_profiles

          WHERE id = $1

          LIMIT 1
        `,
        [
          engagement.client_profile_id,
        ],
      )

    const profile =
      profileResult.rows[0]

    isOwner =
      profile?.user_id === user.id
  }

  if (
    !canViewTraining &&
    !isOwner &&
    !isAssignedTrainer
  ) {
    return (
      <div className="min-h-screen bg-[#020806] px-6 py-20 text-white">
        <div className="mx-auto max-w-xl rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-red-400">
            Access Denied
          </p>

          <h1 className="mt-3 text-2xl font-semibold">
            Training Engagement Restricted
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/50">
            You do not have permission to access
            this training engagement.
          </p>
        </div>
      </div>
    )
  }

  /*
   * ============================================================
   * LOAD ORIGINAL REQUEST
   * ============================================================
   */

  let title =
    engagement.training_goal?.trim() ||
    "Professional Training"

  if (engagement.request_id) {
    const requestResult =
      await query<RequestRow>(
        `
          SELECT
            title,
            service_type

          FROM requests

          WHERE id = $1

          LIMIT 1
        `,
        [engagement.request_id],
      )

    const request =
      requestResult.rows[0]

    if (request?.title?.trim()) {
      title =
        request.title.trim()
    }
  }

  /*
   * ============================================================
   * NORMALIZE STATUS
   * ============================================================
   */

  const status =
    engagement.status?.trim() ||
    "awaiting_payment"

  /*
   * ============================================================
   * RENDER TRAINING SHELL
   * ============================================================
   */

  return (
    <TrainingShell
      user={user}
      engagementId={engagement.id}
      engagementNumber={
        engagement.engagement_number
      }
      title={title}
      status={status}
      isAssignedTrainer={isAssignedTrainer}
    >
      <MarkResourceNotificationsRead
        resourceType="training"
        resourceId={engagement.id}
      />
      {children}
    </TrainingShell>
  )
}
