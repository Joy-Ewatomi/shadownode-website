import { redirect, notFound } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  canUseInvestigationWorkspace,
  resolveCaseId,
} from "@/lib/investigation-workspace"
import TimelinePanel from "@/components/cases/TimelinePanel"

type CaseUpdate = {
  id: string
  title: string
  content: string
  update_type: string
  created_at: string
}

export default async function TimelinePage({
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

  const result = await query<CaseUpdate>(
    `
      SELECT
        id,
        title,
        content,
        update_type,
        created_at

      FROM case_updates

      WHERE case_id = $1

      ORDER BY created_at DESC
    `,
    [caseId],
  )

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
          Case Operations
        </p>

        <h1 className="mt-3 text-3xl font-bold text-white">
          Timeline
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
          Chronological case activity, operational updates,
          and investigation events recorded against this case.
        </p>
      </header>

      <TimelinePanel updates={result.rows} />
    </main>
  )
}