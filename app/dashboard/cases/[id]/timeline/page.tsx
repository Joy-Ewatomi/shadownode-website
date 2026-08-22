import {getCurrentUser} from "@/lib/auth"
import {redirect,notFound} from "next/navigation"
import {query} from "@/lib/db"
import {canUseInvestigationWorkspace, resolveCaseId} from "@/lib/investigation-workspace"
type CaseUpdate = {
  id:string
  title:string
  content:string
  update_type:string
  created_at:string
}
import TimelinePanel from "@/components/cases/TimelinePanel"


export default async function TimelinePage({
params
}:{
params:Promise<{
id:string
}>
}){


const user =
await getCurrentUser()


if(!user){
redirect("/login")
}



const {id}=await params
const caseId =
await resolveCaseId(id)

if(!caseId){
notFound()
}

if(!(await canUseInvestigationWorkspace(user.id,user.role,caseId))){
redirect("/dashboard")
}



const result =
await query<CaseUpdate>(
`
SELECT

id,
title,
content,
update_type,
created_at

FROM case_updates

WHERE case_id=$1

ORDER BY created_at DESC

`,
[
caseId
]
)



if(!result.rows){

notFound()

}



return (

<div className="space-y-6">


<header className="border-b border-[#143b28] pb-6">


<p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
Case Activity
</p>


<h1 className="mt-2 text-3xl font-bold text-white">
Timeline
</h1>


</header>


<TimelinePanel
updates={result.rows}
/>


</div>

)

}
