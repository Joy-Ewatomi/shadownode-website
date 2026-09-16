import { redirect } from "next/navigation"
import ReportBuilder from "@/components/reports/ReportBuilder"
import { getCurrentUser } from "@/lib/auth"
import MarkResourceNotificationsRead from "@/components/notifications/MarkResourceNotificationsRead"

export default async function CaseReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ reportId?: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const { id } = await params
  const reportId =
    (await searchParams)?.reportId || null

  return (
    <main className="space-y-6">
      {reportId && (
        <MarkResourceNotificationsRead
          resourceType="report"
          resourceId={reportId}
        />
      )}

      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">Case Reports</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Reports</h1>
        <p className="mt-2 text-sm text-white/55">Prepare findings, draft intelligence reports, and manage review status.</p>
      </header>

      <ReportBuilder caseId={id} />
    </main>
  )
}
