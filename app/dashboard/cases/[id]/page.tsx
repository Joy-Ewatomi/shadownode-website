import { notFound, redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import {
  canUseInvestigationWorkspace,
  resolveCaseId,
} from "@/lib/investigation-workspace"

import CaseAssignment from "@/components/cases/CaseAssignment"

export default async function CaseTeamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const { id } = await params

  const caseId = await resolveCaseId(id)

  if (!caseId) {
    notFound()
  }

  const canView =
    await canUseInvestigationWorkspace(
      user.id,
      user.role,
      caseId,
    )

  if (!canView) {
    redirect("/403")
  }

  const isSuperAdmin =
    user.role ===
      "super_administrator" ||
    user.role ===
      "super-administrator"

  /*
   * Administrators and Super Administrators can
   * coordinate case assignments.
   *
   * Investigators/analysts can see the team but
   * cannot assign other operators.
   *
   * Super Admin always has global case authority.
   */

  const canAssign =
    isSuperAdmin ||
    user.role === "administrator"

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Case Team
            </p>

            <h1 className="mt-3 text-3xl font-bold text-white">
              Assignments
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Manage the operators responsible for
              this investigation and review the
              assignment history.
            </p>
          </div>

          {isSuperAdmin ? (
            <div className="rounded-md border border-[#20dc73]/25 bg-[#071b12] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#20dc73]">
                System Oversight
              </p>

              <p className="mt-1 text-xs text-white/55">
                Super Administrator
              </p>

              <p className="mt-1 text-[11px] text-[#62e79c]">
                Global case access enabled
              </p>
            </div>
          ) : null}
        </div>
      </header>

      <CaseAssignment
        caseId={caseId}
        canAssign={canAssign}
      />
    </main>
  )
}