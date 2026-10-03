import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { isSuperAdministratorRole } from "@/lib/role-access"
import PublicProfileEditor from "@/components/settings/PublicProfileEditor"

export const dynamic = "force-dynamic"
export default async function PublicProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!isSuperAdministratorRole(user.role)) redirect("/dashboard")
  return <PublicProfileEditor />
}
