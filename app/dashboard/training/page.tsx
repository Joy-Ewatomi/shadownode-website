import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { hasPermission } from "@/lib/permission"
import { getUserProfileId } from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"

import Link from "next/link"

export default async function TrainingPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  /*
   * ============================================================
   * CLIENT TRAINING AREA
   * ============================================================
   */

  if (user.role === "client") {
    const profileId =
      await getUserProfileId(user.id)

    if (!profileId) {
      return (
        <div className="space-y-4 p-6">
          <header>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#20dc73]/60">
              Training
            </p>

            <h1 className="mt-2 text-2xl font-semibold text-white">
              My Trainings
            </h1>
          </header>

          <div className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-5">
            <p className="text-sm text-white/60">
              No client profile was found
              for your account.
            </p>
          </div>
        </div>
      )
    }

    const result =
      await query(
        `
          SELECT
            id,
            engagement_number,
            training_organization_name,
            status,
            payment_status,
            progress,
            created_at
          FROM training_engagements
          WHERE client_profile_id = $1
          ORDER BY created_at DESC
        `,
        [profileId],
      )

    const rows = result.rows

    return (
      <div className="space-y-6 p-6">
        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#20dc73]/60">
            Training Bureau
          </p>

          <h1 className="mt-2 text-2xl font-semibold text-white">
            My Trainings
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Training engagements associated
            with your account.
          </p>
        </header>

        <div className="space-y-3">
          {rows.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <p className="text-sm text-white/60">
                No training engagements found.
              </p>
            </div>
          )}

          {rows.map((training: any) => {
            const progress = Math.min(
              100,
              Math.max(
                0,
                Number(
                  training.progress ?? 0,
                ),
              ),
            )

            return (
              <Link
                key={training.id}
                href={`/dashboard/training/${training.id}`}
                className="block rounded-xl border border-[#143b28] bg-[#04100b]/60 p-5 transition hover:border-[#20dc73]/30 hover:bg-[#20dc73]/5"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#20dc73]/70">
                      {training.engagement_number ||
                        "Training Engagement"}
                    </p>

                    <h2 className="mt-2 text-lg font-semibold text-white">
                      {training.training_organization_name ||
                        "Professional Training"}
                    </h2>

                    <p className="mt-1 text-sm text-white/45">
                      {training.status ||
                        "pending"}
                    </p>
                  </div>

                  <div className="w-full md:w-64">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.12em] text-white/35">
                        Progress
                      </span>

                      <span className="font-mono text-sm text-[#20dc73]">
                        {progress}%
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-[#20dc73] transition-all"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  /*
   * ============================================================
   * TRAINERS
   * ============================================================
   */

  if (
    user.role === "investigator" ||
    user.role === "analyst"
  ) {
    redirect("/trainer/training")
  }

  /*
   * ============================================================
   * ADMINISTRATIVE TRAINING AREA
   * ============================================================
   */

  if (
    !hasPermission(
      user,
      "training:view",
    )
  ) {
    redirect("/dashboard")
  }

  const result =
    await query(
      `
        SELECT
          id,
          engagement_number,
          training_organization_name,
          status,
          payment_status,
          progress,
          created_at
        FROM training_engagements
        ORDER BY created_at DESC
      `,
      [],
    )

  const rows = result.rows

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#20dc73]/60">
          Training Bureau
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-white">
          Training Engagements
        </h1>

        <p className="mt-2 text-sm text-white/60">
          All training engagements.
        </p>
      </header>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm text-white/60">
              No training engagements found.
            </p>
          </div>
        )}

        {rows.map((training: any) => (
          <Link
            key={training.id}
            href={`/dashboard/training/${training.id}`}
            className="block rounded-xl border border-[#143b28] bg-[#04100b]/60 p-5 transition hover:border-[#20dc73]/30 hover:bg-[#20dc73]/5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white">
                  {training.engagement_number ||
                    training.training_organization_name ||
                    training.id}
                </p>

                <p className="mt-1 text-sm text-white/60">
                  {training.training_organization_name ||
                    ""}
                </p>
              </div>

              <div className="text-right text-sm text-white/60">
                <div>
                  Progress:{" "}
                  {training.progress ?? 0}%
                </div>

                <div className="mt-1">
                  {training.status ||
                    "unknown"}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}