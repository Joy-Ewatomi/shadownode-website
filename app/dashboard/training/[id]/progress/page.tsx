import { notFound, redirect } from "next/navigation"

import TrainingShell from "@/components/training/TrainingShell"
import ProgressManager from "@/components/training/ProgressManager"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

import {
  ensureAccess,
  isApprovedTrainerForEngagement,
  listMaterials,
  listMaterialProgress,
  listModuleProgress,
  listModules,
} from "@/lib/services/training-operations-service"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

type EngagementRow = {
  id: string
  engagement_number: string | null
  status: string | null
  training_goal: string | null
  client_profile_id: string | null
}

type ProgressModule = {
  id: string
  title?: string | null
  description?: string | null
  objectives?: unknown

  module_order?: number | string | null
  status?: string | null
  completion_percentage?: number | string | null

  material_count?: number | string | null
  completed_material_count?: number | string | null

  session_count?: number | string | null
  attended_session_count?: number | string | null
  completed_session_count?: number | string | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: unknown
}

type ProgressRow = {
  id: string
  training_engagement_id?: string | null
  module_id?: string | null
  client_profile_id?: string | null

  status?: string | null
  completion_percentage?: number | string | null

  trainer_notes?: string | null

  started_at?: string | null
  completed_at?: string | null

  module_title?: string | null
  module_order?: number | string | null

  material_count?: number | string | null
  completed_material_count?: number | string | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: unknown
}

type MaterialProgressRow = {
  id: string
  training_engagement_id?: string | null
  material_id?: string | null
  client_profile_id?: string | null

  status?: string | null
  progress_percentage?: number | string | null

  watched_seconds?: number | null
  duration_seconds?: number | null

  pages_viewed?: number | null
  total_pages?: number | null

  started_at?: string | null
  completed_at?: string | null
  last_accessed_at?: string | null

  module_id?: string | null
  module_title?: string | null
  material_title?: string | null

  module_order?: number | string | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: unknown
}

/*
 * Database timestamp values may arrive as Date objects,
 * strings, null, or undefined depending on the DB/query layer.
 *
 * Keep this helper typed around `unknown` so TypeScript does
 * not complain about `instanceof Date`.
 */
function serializeDate(
  value: unknown,
): string | null | undefined {
  if (value == null) {
    return value as null | undefined
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === "string") {
    return value
  }

  return String(value)
}

function numberOrNull(
  value: unknown,
): number | null {
  if (value == null || value === "") {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : null
}

function stringOrNull(
  value: unknown,
): string | null {
  if (value == null) {
    return null
  }

  return String(value)
}

function serializeModules(
  rows: readonly Record<string, unknown>[],
): ProgressModule[] {
  return rows
    .map((row) => ({
      ...row,

      id: String(row.id),

      title: stringOrNull(row.title),

      description:
        stringOrNull(
          row.description,
        ),

      objectives:
        row.objectives,

      module_order:
        numberOrNull(
          row.module_order,
        ),

      status:
        stringOrNull(row.status),

      completion_percentage:
        numberOrNull(
          row.completion_percentage,
        ),

      material_count:
        numberOrNull(
          row.material_count,
        ),

      completed_material_count:
        numberOrNull(
          row.completed_material_count,
        ),

      session_count:
        numberOrNull(
          row.session_count,
        ),

      attended_session_count:
        numberOrNull(
          row.attended_session_count,
        ),

      completed_session_count:
        numberOrNull(
          row.completed_session_count,
        ),

      created_at:
        serializeDate(
          row.created_at,
        ),

      updated_at:
        serializeDate(
          row.updated_at,
        ),
    }))
}

function serializeModuleProgress(
  rows: readonly Record<string, unknown>[],
): ProgressRow[] {
  return rows.map((row) => ({
    ...row,

    id: String(row.id),

    training_engagement_id:
      stringOrNull(
        row.training_engagement_id,
      ),

    module_id:
      stringOrNull(
        row.module_id,
      ),

    client_profile_id:
      stringOrNull(
        row.client_profile_id,
      ),

    status:
      stringOrNull(
        row.status,
      ),

    completion_percentage:
      numberOrNull(
        row.completion_percentage,
      ),

    trainer_notes:
      stringOrNull(
        row.trainer_notes,
      ),

    started_at:
      serializeDate(
        row.started_at,
      ),

    completed_at:
      serializeDate(
        row.completed_at,
      ),

    module_title:
      stringOrNull(
        row.module_title,
      ),

    module_order:
      numberOrNull(
        row.module_order,
      ),

    material_count:
      numberOrNull(
        row.material_count,
      ),

    completed_material_count:
      numberOrNull(
        row.completed_material_count,
      ),

    created_at:
      serializeDate(
        row.created_at,
      ),

    updated_at:
      serializeDate(
        row.updated_at,
      ),
  }))
}

function serializeMaterials(
  rows: readonly Record<string, unknown>[],
) {
  return rows.map((row) => ({
    ...row,

    id: String(row.id),

    training_engagement_id:
      stringOrNull(
        row.training_engagement_id,
      ),

    module_id:
      stringOrNull(
        row.module_id,
      ),

    title:
      stringOrNull(
        row.title,
      ),

    description:
      stringOrNull(
        row.description,
      ),

    material_type:
      stringOrNull(
        row.material_type,
      ),

    file_url:
      stringOrNull(
        row.file_url,
      ),

    external_url:
      stringOrNull(
        row.external_url,
      ),

    visibility:
      stringOrNull(
        row.visibility,
      ),

    uploaded_by:
      stringOrNull(
        row.uploaded_by,
      ),

    created_at:
      serializeDate(
        row.created_at,
      ) ?? "",

    updated_at:
      serializeDate(
        row.updated_at,
      ) ?? "",
  }))
}

function serializeMaterialProgress(
  rows: readonly Record<string, unknown>[],
): MaterialProgressRow[] {
  return rows.map((row) => ({
    ...row,

    id: String(row.id),

    training_engagement_id:
      stringOrNull(
        row.training_engagement_id,
      ),

    material_id:
      stringOrNull(
        row.material_id,
      ),

    client_profile_id:
      stringOrNull(
        row.client_profile_id,
      ),

    status:
      stringOrNull(
        row.status,
      ),

    progress_percentage:
      numberOrNull(
        row.progress_percentage,
      ),

    watched_seconds:
      row.watched_seconds == null
        ? null
        : Number(row.watched_seconds),

    duration_seconds:
      row.duration_seconds == null
        ? null
        : Number(row.duration_seconds),

    pages_viewed:
      row.pages_viewed == null
        ? null
        : Number(row.pages_viewed),

    total_pages:
      row.total_pages == null
        ? null
        : Number(row.total_pages),

    started_at:
      serializeDate(
        row.started_at,
      ),

    completed_at:
      serializeDate(
        row.completed_at,
      ),

    last_accessed_at:
      serializeDate(
        row.last_accessed_at,
      ),

    module_id:
      stringOrNull(
        row.module_id,
      ),

    module_title:
      stringOrNull(
        row.module_title,
      ),

    material_title:
      stringOrNull(
        row.material_title,
      ),

    module_order:
      numberOrNull(
        row.module_order,
      ),

    created_at:
      serializeDate(
        row.created_at,
      ),

    updated_at:
      serializeDate(
        row.updated_at,
      ),
  }))
}

export default async function TrainingProgressPage({
  params,
}: PageProps) {
  const { id } = await params

  if (!id) {
    notFound()
  }

  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  /*
   * ensureAccess is the authoritative engagement-level
   * authorization guard.
   *
   * It throws when the user is not allowed to access
   * the engagement.
   */
  const access =
    await ensureAccess(
      id,
      user,
      false,
    )

  if (
    !access.profileId ||
    !access.role
  ) {
    notFound()
  }

  /*
   * Fetch engagement information separately.
   *
   * ensureAccess performs authorization;
   * query() performs data retrieval.
   */
  const engagementResult =
    await query<EngagementRow>(
      `
        SELECT
          id,
          engagement_number,
          status,
          training_goal,
          client_profile_id
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
   * Super Administrator has system-level training
   * management authority.
   */
  const isSuperAdmin =
    access.role ===
      "super_administrator" ||
    access.role ===
      "super-administrator"

  /*
   * Being an administrator does NOT automatically
   * make the user a trainer.
   *
   * Trainer management access is activated only
   * when the user's profile is approved for this
   * engagement.
   */
  const isApprovedTrainer =
    await isApprovedTrainerForEngagement(
      id,
      user,
      access.profileId,
    )

  const isAssignedTrainer =
    isSuperAdmin ||
    isApprovedTrainer

  const isClient =
    access.role === "client"

  /*
   * Only clients receive client-specific material
   * progress on this page.
   */
  const clientProfileId =
    isClient
      ? access.profileId
      : undefined

  /*
   * Load curriculum, module progress and materials.
   *
   * listModules() is the authoritative source for
   * which modules exist.
   */
  const [
    rawModules,
    rawModuleProgress,
    rawMaterials,
  ] = await Promise.all([
    listModules(id),

    listModuleProgress(
      id,
      clientProfileId,
    ),

    listMaterials(id),
  ])

  /*
   * Material progress is client-specific.
   *
   * For administrators/trainers we intentionally
   * do not select one client's progress as though
   * it represented the whole engagement.
   */
  const rawMaterialProgress =
    isClient &&
    clientProfileId
      ? await listMaterialProgress(
          id,
          clientProfileId,
        )
      : []

  /*
   * Normalize database results into the exact
   * structures expected by ProgressManager.
   *
   * This also eliminates the previous:
   *
   *   Property 'id' is missing
   *
   * and:
   *
   *   left-hand side of instanceof expression
   *
   * TypeScript errors.
   */
  const initialModules =
    serializeModules(
      rawModules as unknown as Record<
        string,
        unknown
      >[],
    )

  const initialProgress =
    serializeModuleProgress(
      rawModuleProgress as unknown as Record<
        string,
        unknown
      >[],
    )

  const initialMaterials =
    serializeMaterials(
      rawMaterials as unknown as Record<
        string,
        unknown
      >[],
    )

  const initialMaterialProgress =
    serializeMaterialProgress(
      rawMaterialProgress as unknown as Record<
        string,
        unknown
      >[],
    )

  /*
   * Only an approved trainer or Super Administrator
   * may update module progress.
   */
  const canManageProgress =
    isAssignedTrainer

  return (
    <TrainingShell
      user={user}
      engagementId={engagement.id}
      engagementNumber={
        engagement.engagement_number ??
        "Training Engagement"
      }
      title="Training Progress"
      status={
        engagement.status ??
        "unknown"
      }
      isAssignedTrainer={
        isAssignedTrainer
      }
    >
      <ProgressManager
        engagementId={
          engagement.id
        }
        engagementNumber={
          engagement.engagement_number
        }
        engagementStatus={
          engagement.status
        }
        initialModules={
          initialModules
        }
        initialProgress={
          initialProgress
        }
        initialMaterials={
          initialMaterials
        }
        initialMaterialProgress={
          initialMaterialProgress
        }
        canManageProgress={
          canManageProgress
        }
      />
    </TrainingShell>
  )
}
