import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

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
        <div
          className="
min-w-0
border
border-[#143b28]
bg-[#06100c]
rounded-lg
p-5
"
        >
          <div
            className="
flex
justify-between
items-start
gap-3
flex-wrap
"
          >
            <div className="min-w-0 flex-1">
              <h1
                className="
text-xl
font-bold
text-[#20dc73]
"
              >
                Case Workspace
              </h1>

              <p
                className="
text-sm
text-white/50
break-all
"
              >
                Case ID: {id}
              </p>
            </div>

            <div
              className="
text-sm
text-green-400
shrink-0
"
            >
              ACTIVE
            </div>
          </div>

          <div className="mt-6 max-w-full overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
          <nav
            className="
flex
gap-5
w-max
min-w-full
text-sm
text-white/60
"
            aria-label="Case workspace sections"
          >
            <Link className="shrink-0 whitespace-nowrap" href={`/cases/${id}`}>Overview</Link>

            <Link className="shrink-0 whitespace-nowrap" href={`/cases/${id}/workspace`}>Workspace</Link>

            <Link className="shrink-0 whitespace-nowrap" href={`/cases/${id}/graph`}>Graph</Link>

            <Link className="shrink-0 whitespace-nowrap" href={`/cases/${id}/timeline`}>Timeline</Link>

            <Link className="shrink-0 whitespace-nowrap" href={`/cases/${id}/evidence`}>Evidence</Link>

            <Link className="shrink-0 whitespace-nowrap" href={`/cases/${id}/reports`}>Reports</Link>

            <Link className="shrink-0 whitespace-nowrap" href={`/cases/${id}/updates`}>Updates</Link>
          </nav>
          </div>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </DashboardShell>
  );
}
