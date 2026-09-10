import { notFound, redirect } from "next/navigation"
import EvidencePanel from "@/components/evidence/EvidencePanel"
import { getCurrentUser } from "@/lib/auth"
import {
  canUseInvestigationWorkspace,
  resolveCaseId,
} from "@/lib/investigation-workspace"

export default async function CaseEvidencePage({
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

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
          Case Operations
        </p>

        <h1 className="mt-3 text-3xl font-bold text-white">
          Evidence Vault
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
          Upload, review, hash, and maintain the evidentiary
          record attached to this case.
        </p>
      </header>

      <EvidencePanel caseId={caseId} />
    </main>
  )
}