"use client"

import {
  Activity,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Users,
} from "lucide-react"

import DashboardMetricCard from "@/components/dashboard/widgets/DashboardMetricCard"
import PendingRequestsWidget from "@/components/dashboard/widgets/PendingRequestsWidget"
import ActiveCasesWidget from "@/components/dashboard/widgets/ActiveCasesWidget"
import TeamStatusWidget from "@/components/dashboard/widgets/TeamStatusWidget"

export default function DashboardHome(){

return (

<div className="space-y-6">


<header className="border-b border-[#143b28] pb-6">

<p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
Mission Control
</p>


<h1 className="mt-2 text-3xl font-bold text-white">
Operations Dashboard
</h1>


<p className="mt-2 text-sm text-white/50">
ShadowNode Intelligence Bureau operational overview.
</p>


</header>



<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">


<DashboardMetricCard
label="Active Cases"
value="0"
helper="Currently running investigations"
icon={ShieldCheck}
/>


<DashboardMetricCard
label="Pending Requests"
value="0"
helper="Awaiting administrator review"
icon={Clock}
/>


<DashboardMetricCard
label="Team Online"
value="0"
helper="Active operators"
icon={Users}
/>


<DashboardMetricCard
label="Critical Alerts"
value="0"
helper="Security notifications"
icon={AlertTriangle}
/>


</section>


<section className="grid gap-6 lg:grid-cols-2">

<PendingRequestsWidget />


<ActiveCasesWidget />


</section>

<section className="grid gap-6 lg:grid-cols-3">

<TeamStatusWidget />


<div className="rounded-md border border-[#143b28] bg-[#06110f] p-5 lg:col-span-2">

<h2 className="font-semibold text-white">
Recent Activity
</h2>


<div className="mt-4 text-sm text-white/50">
No activity recorded yet.
</div>


</div>


</section>

</div>

)

}