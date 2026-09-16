import { getCurrentUser } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import MessagePanel from "@/components/cases/MessagePanel"
import { query } from "@/lib/db"


export default async function CaseMessagesPage({
  params,
}:{
  params: Promise<{
    id:string
  }>
}){


const user = await getCurrentUser()


if(!user){
 redirect("/login")
}



const {id} = await params

const result = await query<CaseInfo>(
`
SELECT
id,
case_number,
title

FROM cases

WHERE id=$1

LIMIT 1
`,
[id]
)

type CaseInfo = {
 id:string
 case_number:string
 title:string
}



const caseData =
result.rows[0]


if(!caseData){

notFound()

}



return (

<div className="space-y-6">
<header className="border-b border-[#143b28] pb-6">


<p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
Secure Communication
</p>


<h1 className="mt-2 text-3xl font-bold text-white">
{caseData.title}
</h1>


<p className="text-sm text-white/50">
{caseData.case_number}
</p>


</header>



<MessagePanel
caseId={caseData.id}
/>



</div>

)

}
