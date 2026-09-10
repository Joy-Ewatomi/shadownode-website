import { notFound, redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import {
  canUseInvestigationWorkspace,
  resolveCaseId,
} from "@/lib/investigation-workspace"
import CaseUpdatesClient from "components/cases/CaseUpdatesClient"

export default async function CaseUpdatesPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
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

  const canCreate =
    user.role !== "client"

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
          Case Operations
        </p>

        <h1 className="mt-3 text-3xl font-bold text-white">
          Updates
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
          Operational updates and investigation progress recorded
          against this case.
        </p>
      </header>

      <CaseUpdatesClient
        caseId={caseId}
        canCreate={canCreate}
      />
    </main>
  )
}