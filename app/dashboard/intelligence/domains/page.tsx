import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { hasPermission } from "@/lib/permission"
import DomainIntelligenceWorkspace from "@/components/intelligence/DomainIntelligenceWorkspace"

export const dynamic = "force-dynamic"

export default async function DomainIntelligencePage({ searchParams }: { searchParams: Promise<{ case_id?: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!hasPermission(user, "intelligence:access")) redirect("/dashboard")
  const cases = await query<{ id: string; case_number: string | null; title: string | null; status: string | null }>(`
    SELECT DISTINCT c.id, c.case_number, c.title, c.status FROM cases c
    JOIN case_assignments ca ON ca.case_id=c.id AND ca.removed_at IS NULL
    JOIN user_profiles up ON up.id=ca.assigned_to
    WHERE up.user_id=$1 AND COALESCE(ca.status, 'assigned') IN ('assigned','approved','active','accepted')
      AND ca.assignment_role IN ('lead_investigator','investigator','analyst')
      AND c.status NOT IN ('completed','closed','archived')
    ORDER BY c.case_number DESC NULLS LAST`, [user.id])
  const requested = (await searchParams).case_id || ""
  const selected = cases.rows.some((item) => item.id === requested) ? requested : ""
  return <DomainIntelligenceWorkspace cases={cases.rows} initialCaseId={selected} />
}
