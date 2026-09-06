import { notFound, redirect } from "next/navigation"

import { query } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

import {
  ensureAccess,
  listMaterials,
  isApprovedTrainerForEngagement,
} from "@/lib/services/training-operations-service"

import TrainingShell from "@/components/training/TrainingShell"
import MaterialsManager from "@/components/training/MaterialsManager"

type Props = {
  params: Promise<{ id: string }>
}

type EngagementRow = {
  id: string
  engagement_number: string | null
  status: string | null
}

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

export default async function MaterialsPage({
  params,
}: Props) {
  const { id } = await params

  const user = await getCurrentUser()

  if (!user) {
    return redirect("/login")
  }

  /*
   * ============================================================
   * VIEW ACCESS
   * ============================================================
   *
   * Viewing materials does not require trainer-level access.
   *
   * Clients can view their own engagement.
   * Administrators can oversee training.
   * Super Administrators have full access.
   * Approved trainers can access their engagement.
   *
   * Uploading/managing materials is handled separately below.
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
          status
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
   * LOAD MATERIALS
   * ============================================================
   */

  const rawMaterials =
    await listMaterials(id)

  const materials =
    (rawMaterials || []).map(
      (material: any) => ({
        ...material,

        created_at:
          material.created_at
            ? String(
                material.created_at,
              )
            : null,

        updated_at:
          material.updated_at
            ? String(
                material.updated_at,
              )
            : null,
      }),
    )

  /*
   * ============================================================
   * MATERIAL MANAGEMENT ACCESS
   * ============================================================
   *
   * Super Administrator:
   *   Always allowed.
   *
   * Approved trainer:
   *   Allowed only when assigned and approved
   *   for this engagement.
   *
   * Normal Administrator:
   *   View only unless separately approved
   *   as the trainer for this engagement.
   *
   * Unassigned Investigator/Analyst:
   *   View only.
   *
   * Client:
   *   View only.
   */

  let canManageMaterials = false

  if (isSuperAdminRole(user.role)) {
    canManageMaterials = true
  } else {
    canManageMaterials =
      await isApprovedTrainerForEngagement(
        id,
        user,
        access.profileId,
      )
  }

  /*
   * ============================================================
   * TRAINING SHELL
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
      title="Materials"
      status={String(
        engagement.status ||
          "unknown",
      )}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-6">
          <MaterialsManager
            initialMaterials={
              materials
            }
            engagementId={id}
            canManageMaterials={
              canManageMaterials
            }
          />
        </section>
      </div>
    </TrainingShell>
  )
}