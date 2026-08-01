import { redirect, notFound } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import Link from "next/link"


async function getCase(id:string){

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/cases/${id}`,
    {
      cache:"no-store"
    }
  )


  if(!res.ok){
    return null
  }


  return res.json()

}



export default async function CaseWorkspacePage({
  params
}:{
  params:{
    id:string
  }
}){


const user = await getCurrentUser()


if(!user){
 redirect("/login")
}



const investigation = await getCase(params.id)


if(!investigation){
 notFound()
}



return (

<div className="space-y-6">


<header className="border-b border-[#143b28] pb-6">


<p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
Investigation Workspace
</p>


<h1 className="mt-3 text-3xl font-bold text-white">
{investigation.title}
</h1>


<p className="text-white/50">
{investigation.case_number}
</p>


</header>



<div className="grid gap-5 md:grid-cols-4">


<Card
title="Status"
value={investigation.status}
/>


<Card
title="Priority"
value={investigation.priority}
/>


<Card
title="Progress"
value={`${investigation.progress || 0}%`}
/>


<Card
title="Budget"
value={`₦${investigation.budget || 0}`}
/>


</div>





<div className="grid gap-5 md:grid-cols-3">


<WorkspaceLink
href={`/dashboard/cases/${params.id}/timeline`}
title="Timeline"
text="Investigation activity"
/>


<WorkspaceLink
href={`/dashboard/cases/${params.id}/evidence`}
title="Evidence"
text="Files and chain of custody"
/>


<WorkspaceLink
href={`/dashboard/cases/${params.id}/graph`}
title="Intelligence Graph"
text="Entities and relationships"
/>


<WorkspaceLink
href={`/dashboard/cases/${params.id}/messages`}
title="Messages"
text="Secure communication"
/>


<WorkspaceLink
href={`/dashboard/cases/${params.id}/reports`}
title="Reports"
text="Final intelligence reports"
/>


<WorkspaceLink
href={`/dashboard/cases/${params.id}/team`}
title="Team"
text="Assigned investigators"
/>


</div>




<div className="rounded-md border border-[#143b28] bg-[#06110f] p-6">

<h2 className="text-white font-semibold">
Description
</h2>


<p className="mt-3 text-sm leading-7 text-white/60">
{investigation.description}
</p>


</div>


</div>

)

}





function Card({
title,
value
}:{
title:string
value:string
}){

return (

<div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">

<p className="text-xs uppercase text-white/40">
{title}
</p>

<p className="mt-2 text-xl font-bold text-[#20dc73]">
{value}
</p>

</div>

)

}




function WorkspaceLink({
href,
title,
text
}:{
href:string
title:string
text:string
}){

return (

<Link
href={href}
className="
rounded-md
border
border-[#143b28]
bg-[#06110f]
p-5
hover:border-[#20dc73]/50
transition
"
>


<h3 className="font-semibold text-white">
{title}
</h3>


<p className="mt-2 text-sm text-white/50">
{text}
</p>


</Link>

)

}