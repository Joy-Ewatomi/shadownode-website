"use client"

import { Shield } from "lucide-react"
import Link from "next/link"


type CaseItem = {
id:string
case_number:string
title:string
status:string
}


export default function ActiveCasesWidget({
cases=[]
}:{
cases?:CaseItem[]
}){


return (

<div className="rounded-md border border-[#143b28] bg-[#06110f]">


<div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4">


<div className="flex items-center gap-2">

<Shield className="h-5 w-5 text-[#20dc73]"/>

<h2 className="font-semibold text-white">
Active Cases
</h2>

</div>


<Link
href="/dashboard/cases"
className="text-xs text-[#20dc73]"
>
View cases
</Link>


</div>



<div className="divide-y divide-[#143b28]">


{
cases.length === 0 ?

<div className="px-5 py-6 text-sm text-white/40">
No active cases
</div>

:

cases.map(item=>(

<div
key={item.id}
className="px-5 py-4"
>


<p className="font-medium text-white">
{item.case_number}
</p>


<p className="text-sm text-white/50">
{item.title}
</p>


<span className="mt-2 inline-block rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs text-[#20dc73]">

{item.status}

</span>


</div>

))

}


</div>


</div>

)

}