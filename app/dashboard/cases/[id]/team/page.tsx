import { notFound, redirect } from "next/navigation"

import { getCurrentUser, isAdminRole } from "@/lib/auth"
import CaseAssignment from "@/components/cases/CaseAssignment"
import MarkResourceNotificationsRead from "@/components/notifications/MarkResourceNotificationsRead"
import {
  canUseInvestigationWorkspace,
  resolveCaseId,
} from "@/lib/investigation-workspace"

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

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
    isAdminRole(user.role) ||
    (await canUseInvestigationWorkspace(
      user.id,
      user.role,
      caseId,
    ))

  if (!canView) {
    redirect("/403")
  }

  const isSuperAdmin =
    isSuperAdminRole(user.role)

  const canAssign =
    isSuperAdmin ||
    user.role === "administrator"

  return (
    <main className="space-y-6">
      <MarkResourceNotificationsRead
        resourceType="assignment"
        resourceId={caseId}
      />

      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
          Case Operations
        </p>

        <h1 className="mt-3 text-3xl font-bold text-white">
          Case Team
        </h1>

        <p className="mt-2 text-sm text-white/55">
          Manage assigned investigators and analysts and review
          assignment history for this case.
        </p>
      </header>

      <CaseAssignment
        caseId={caseId}
        canAssign={canAssign}
        canApprove={isSuperAdmin}
      />
    </main>
  )
}
