import { notFound, redirect } from "next/navigation"

import { query } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

import {
  ensureAccess,
  listMaterials,
  listModules,
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
  const normalized = String(role || "")
    .trim()
    .toLowerCase()

  return (
    normalized === "super_administrator" ||
    normalized === "super-administrator"
  )
}

function isClientRole(
  role: string | null | undefined,
) {
  return (
    String(role || "")
      .trim()
      .toLowerCase() === "client"
  )
}

export default async function MaterialsPage({
  params,
}: Props) {
  const { id } = await params

  if (!id) {
    return notFound()
  }

  const user = await getCurrentUser()

  if (!user) {
    return redirect("/login")
  }

  /*
   * ============================================================
   * VIEW ACCESS
   * ============================================================
   *
   * Viewing materials is allowed through the existing
   * training engagement authorization layer.
   *
   * We do not introduce a second permission system here.
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
      "TRAINING MATERIALS ACCESS ERROR:",
      error,
    )

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
   * LOAD CURRENT CURRICULUM
   * ============================================================
   *
   * IMPORTANT:
   *
   * Materials are attached to curriculum modules.
   *
   * The previous version of this page loaded materials but
   * never loaded the modules. That caused MaterialsManager's
   * default:
   *
   *     modules = []
   *
   * and therefore displayed:
   *
   * "Create at least one curriculum module..."
   *
   * even when modules already existed.
   *
   * We now reuse the existing listModules() service so the
   * Materials workspace and Curriculum Roadmap use the same
   * source of truth.
   */

  const rawModules =
    await listModules(id)

 const modules =
  (rawModules || [])
    .map((module) => ({
      id: String(module.id),
      title:
        module.title != null
          ? String(module.title)
          : null,
      description:
        module.description != null
          ? String(module.description)
          : null,
      module_order:
        module.module_order != null
          ? Number(module.module_order)
          : null,
      status:
        module.status != null
          ? String(module.status)
          : null,
      completion_percentage:
        module.completion_percentage != null
          ? Number(
              module.completion_percentage,
            )
          : null,
    }))
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
   * LOAD MATERIALS
   * ============================================================
   */

  const rawMaterials =
    await listMaterials(id)

  const materials =
    (rawMaterials || []).map(
      (material) => ({
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
   *   Full training management access.
   *
   * Approved trainer:
   *   Can manage materials only for an engagement
   *   where they are actually approved.
   *
   * Administrator:
   *   View only unless they are separately approved
   *   as a trainer for this engagement.
   *
   * Investigator / Analyst:
   *   View only unless approved as trainer.
   *
   * Client:
   *   View only.
   */

  let canManageMaterials = false

  if (
    isSuperAdminRole(user.role)
  ) {
    canManageMaterials = true
  } else {
    canManageMaterials =
      await isApprovedTrainerForEngagement(
        id,
        user,
        access.profileId,
      )
  }

  const isClient =
    isClientRole(user.role)

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
            modules={modules}
            isClient={isClient}
          />
        </section>
      </div>
    </TrainingShell>
  )
}
