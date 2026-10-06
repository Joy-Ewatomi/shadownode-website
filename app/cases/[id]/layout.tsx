import DashboardShell from "@/components/dashboard/DashboardShell";
import CaseWorkspaceHeader from "@/components/cases/CaseWorkspaceHeader";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell user={user}>
      <div
        className="
min-h-screen
min-w-0
bg-[#020604]
text-white
p-3
sm:p-6
"
      >
        <CaseWorkspaceHeader caseId={id} />

        <div className="mt-6">{children}</div>
      </div>
    </DashboardShell>
  );
}
