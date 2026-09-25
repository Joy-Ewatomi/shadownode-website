import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { isAdminLikeRole } from "@/lib/role-access"
import ServiceLaunchInterestsClient from "./ServiceLaunchInterestsClient"

export const dynamic = "force-dynamic"

export default async function ServiceLaunchInterestsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!isAdminLikeRole(user.role)) redirect("/dashboard")
  return <ServiceLaunchInterestsClient />
}
