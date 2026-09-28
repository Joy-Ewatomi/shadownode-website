import { redirect } from "next/navigation";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/auth";
import { isStaffLikeRole } from "@/lib/role-access";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (!isStaffLikeRole(user.role)) redirect("/dashboard");

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
