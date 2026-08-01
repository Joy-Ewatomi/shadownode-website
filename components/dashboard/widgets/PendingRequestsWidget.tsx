"use client"

import { FileText, ArrowRight } from "lucide-react"
import Link from "next/link"


type RequestItem = {
  id:string
  title:string
  category:string
  status:string
  created_at:string
}


export default function PendingRequestsWidget({
  requests = []
}:{
  requests?:RequestItem[]
}){


return (

<div className="rounded-md border border-[#143b28] bg-[#06110f]">


<div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4">

<div className="flex items-center gap-2">

<FileText className="h-5 w-5 text-[#20dc73]" />

<h2 className="font-semibold text-white">
Pending Requests
</h2>

</div>


<Link
href="/dashboard/requests"
className="text-xs text-[#20dc73]"
>
View all
</Link>


</div>



<div className="divide-y divide-[#143b28]">


{
requests.length === 0 ?

<div className="px-5 py-6 text-sm text-white/40">
No pending requests
</div>

:

requests.map((request)=>(

<div
key={request.id}
className="flex items-center justify-between gap-3 px-5 py-4"
>


<div>

<p className="font-medium text-white">
{request.title}
</p>


<p className="mt-1 text-xs text-white/45">
{request.category}
</p>


</div>


<Link
href={`/dashboard/requests/${request.id}`}
className="flex items-center gap-1 text-xs text-[#20dc73]"
>

Review

<ArrowRight className="h-3 w-3"/>

</Link>


</div>


))

}


</div>


</div>

)

}