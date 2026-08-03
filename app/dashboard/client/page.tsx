import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import RoleDashboard from "@/components/dashboard/RoleDashboard"
import ClientQuotes from "@/components/client/ClientQuotes"

export default async function ClientDashboard() {

  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }


  return (
    <div className="space-y-8">

      <RoleDashboard
        role="client"
        eyebrow="Client Operations"
        title="Client Dashboard"
        description="Track investigations, requests, quotes, reports and bureau communication."
        metrics={[
  {
    key:"active_cases",
    label:"Active Cases",
    value:"0",
    helper:"Current investigations"
  },
  {
    key:"open_requests",
    label:"Requests",
    value:"0",
    helper:"Open investigation requests"
  },
  {
    key:"unread_notifications",
    label:"Notifications",
    value:"0",
    helper:"Unread bureau notifications"
  },
  {
    key:"reports_available",
    label:"Reports",
    value:"0",
    helper:"Available reports"
  }
]}
        queueTitle="Client Activity"
        queueItems={[
          {
            title:"Requests",
            detail:"Submit OSINT, cybersecurity or investigation requests.",
            status:"Ready"
          },
          {
            title:"Quotes",
            detail:"Review, negotiate or approve investigation quotes.",
            status:"Workflow"
          },
          {
            title:"Cases",
            detail:"Access converted investigations.",
            status:"Active"
          }
        ]}
      />


      {/* LIVE QUOTES SECTION */}
      <ClientQuotes />


    </div>
  )
}