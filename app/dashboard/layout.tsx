import DashboardShell from "@/components/dashboard/DashboardShell"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return <DashboardShell user={user}>{children}</DashboardShell>
}
