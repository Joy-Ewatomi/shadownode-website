import Link from "next/link"
import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"
import { normalizePermanentRole } from "@/lib/role-access"

type AssignedCaseRow = {
  id: string
  case_number: string | null
  title: string | null
  status: string | null
  assignment_role: string | null
  assigned_at: string | null
}

type AssignedTrainingRow = {
  id: string
  engagement_number: string | null
  training_title: string | null
  status: string | null
  training_role: string | null
  assigned_at: string | null
}

function formatFunctionLabel(value: string | null) {
  if (!value) return "Assigned"
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default async function StaffDashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const normalizedRole = normalizePermanentRole(user.role)

  if (
    normalizedRole !== "staff" &&
    normalizedRole !== "administrator" &&
    normalizedRole !== "super_administrator"
  ) {
    redirect("/dashboard")
  }

  const profileId = await profileIdForUser(user.id)

  if (!profileId) {
    return (
      <main className="space-y-6">
        <section>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#20dc73]">
            Staff Operations
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Staff Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/55">
            Your user profile is not ready for assignments yet.
          </p>
        </section>
      </main>
    )
  }

  const [casesResult, trainingResult] = await Promise.all([
    query<AssignedCaseRow>(
      `
        SELECT
          c.id,
          c.case_number,
          c.title,
          c.status,
          ca.assignment_role,
          ca.assigned_at
        FROM case_assignments ca
        JOIN cases c
          ON c.id = ca.case_id
        WHERE ca.assigned_to = $1::uuid
          AND ca.removed_at IS NULL
          AND COALESCE(ca.status, 'assigned') IN (
            'assigned',
            'approved',
            'active',
            'accepted'
          )
        ORDER BY ca.assigned_at DESC NULLS LAST,
          c.created_at DESC
      `,
      [profileId],
    ),
    query<AssignedTrainingRow>(
      `
        SELECT
          te.id,
          te.engagement_number,
          te.training_title,
          te.status,
          COALESCE(tet.training_role, 'trainer') AS training_role,
          tet.assigned_at
        FROM training_engagement_trainers tet
        JOIN training_engagements te
          ON te.id = tet.training_engagement_id
        WHERE tet.trainer_profile_id = $1::uuid
          AND tet.removed_at IS NULL
          AND COALESCE(tet.assignment_status, 'approved') = 'approved'
        ORDER BY tet.assigned_at DESC NULLS LAST,
          te.created_at DESC
      `,
      [profileId],
    ),
  ])

  const assignedCases = casesResult.rows
  const assignedTraining = trainingResult.rows
  const hasAssignments =
    assignedCases.length > 0 || assignedTraining.length > 0

  return (
    <main className="space-y-8">
      <section>
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#20dc73]">
          Staff Operations
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Staff Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/55">
          Assigned cases and training engagements appear here. Platform
          authority remains separate from resource assignments.
        </p>
      </section>

      {!hasAssignments ? (
        <section className="rounded-md border border-[#143b28] bg-[#06110f] p-6">
          <h2 className="text-lg font-semibold text-white">
            No current assignments
          </h2>
          <p className="mt-2 text-sm text-white/55">
            You do not have any active case or training assignments at the
            moment.
          </p>
        </section>
      ) : null}

      {assignedCases.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Assigned Cases
          </h2>
          <div className="grid gap-3">
            {assignedCases.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/cases/${item.id}`}
                className="rounded-md border border-[#143b28] bg-[#06110f] p-4 transition hover:border-[#20dc73]/45 hover:bg-[#20dc73]/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-[#20dc73]">
                      {item.case_number || "Case"}
                    </p>
                    <h3 className="mt-1 font-semibold text-white">
                      {item.title || "Assigned case"}
                    </h3>
                  </div>
                  <span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs text-[#20dc73]">
                    {formatFunctionLabel(item.assignment_role)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {assignedTraining.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Assigned Training
          </h2>
          <div className="grid gap-3">
            {assignedTraining.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/training/${item.id}`}
                className="rounded-md border border-[#143b28] bg-[#06110f] p-4 transition hover:border-[#20dc73]/45 hover:bg-[#20dc73]/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-[#20dc73]">
                      {item.engagement_number || "Training"}
                    </p>
                    <h3 className="mt-1 font-semibold text-white">
                      {item.training_title || "Assigned training"}
                    </h3>
                  </div>
                  <span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs text-[#20dc73]">
                    {formatFunctionLabel(item.training_role)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
