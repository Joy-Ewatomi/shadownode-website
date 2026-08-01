import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import RoleDashboard from "@/components/dashboard/RoleDashboard"


export default async function AnalystDashboard() {

  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }


  return (
    <RoleDashboard
      role="analyst"

      eyebrow="Intelligence Operations"

      title="Analyst Dashboard"

      description="Analyze intelligence, process OSINT findings, review assigned cases, and produce investigative insights."

      metrics={[
        {
          key: "intelligence_queue",
          label: "Intelligence Queue",
          value: "0",
          helper: "Assigned intelligence operations"
        },
        {
          key: "pending_analysis",
          label: "Pending Analysis",
          value: "0",
          helper: "Cases waiting for analyst review"
        },
        {
          key: "completed_reports",
          label: "Completed Reports",
          value: "0",
          helper: "Reports generated from analysis"
        },
        {
          key: "priority_cases",
          label: "Priority Cases",
          value: "0",
          helper: "High priority intelligence assignments"
        },
      ]}

      queueTitle="Analyst Intelligence Queue"

      queueItems={[
        {
          title:"OSINT assignments",
          detail:"Assigned intelligence collection tasks will appear here.",
          status:"Ready"
        },
        {
          title:"Analysis workspace",
          detail:"Review entities, sources, relationships and findings.",
          status:"Prepared"
        },
        {
          title:"Case intelligence",
          detail:"Connected case intelligence data will appear here.",
          status:"Queued"
        },
        {
          title:"Report preparation",
          detail:"Validated findings will move into reporting workflow.",
          status:"Next"
        },
      ]}
    />
  )
}