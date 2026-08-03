"use client"

import { useEffect, useState } from "react"
import RoleDashboard from "@/components/dashboard/RoleDashboard"

export default function AdministratorDashboard() {

const [stats,setStats] = useState<any>(null)


useEffect(()=>{

fetch("/api/dashboard/overview")
.then(res=>res.json())
.then(data=>setStats(data))

},[])


if(!stats){

return (
<div className="text-white/50">
Loading Mission Control...
</div>
)

}
  return (
    <RoleDashboard
      eyebrow="Mission Control"
      title="Administrator Dashboard"
       description="Monitor client requests, investigation workflow, quote approvals, team workload, and bureau operations."
      metrics={[
{
key:"total_cases",
label:"Mission Control Summary",
value:String(stats.total_cases ?? 0),
helper:"Total client requests received"
},

{
key:"active_investigations",
label:"Active Investigations",
value:String(stats.active_investigations ?? 0),
helper:"Requests currently in workflow"
},

{
key:"pending_assignments",
label:"Team Workload",
value:String(stats.pending_assignments ?? 0),
helper:"Requests waiting for review"
},

{
key:"unresolved_alerts",
label:"Pending Approvals",
value:String(stats.unresolved_alerts ?? 0),
helper:"Unread operational notifications"
},
]}
      queueTitle="Administrator Review Queue"
     queueItems={[
{
id:"pending_requests",
title:"Pending Requests",
detail:`${stats.pending_assignments ?? 0} requests awaiting review`,
status:"Live"
},

{
id:"active_investigations",
title:"Active Investigations",
detail:`${stats.active_investigations ?? 0} active workflows`,
status:"Monitoring"
},

{
id:"client_requests",
title:"Client Requests",
detail:`${stats.total_cases ?? 0} total submissions`,
status:"Tracked"
},

{
id:"security_alerts",
title:"Security Alerts",
detail:`${stats.unresolved_alerts ?? 0} unread alerts`,
status:"Review"
},
]} role={"administrator"}    />
  )
}
