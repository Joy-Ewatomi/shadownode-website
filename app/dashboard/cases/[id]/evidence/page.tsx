import { redirect } from "next/navigation"
import EvidencePanel from "@/components/evidence/EvidencePanel"
import { getCurrentUser } from "@/lib/auth"

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

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">Case Evidence</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Evidence Vault</h1>
        <p className="mt-2 text-sm text-white/55">Upload, hash, and review files attached to this investigation.</p>
      </header>

      <EvidencePanel caseId={id} />
    </main>
  )
}
