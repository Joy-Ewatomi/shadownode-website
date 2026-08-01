"use client"

import Link from "next/link"


type Request = {
 id:string
 title:string
 category:string
 status:string
 created_at:string
}


export default function RequestList({
requests=[]
}:{
requests?:Request[]
}){


return (

<div className="rounded-md border border-[#143b28] bg-[#06110f]">


<div className="border-b border-[#143b28] px-5 py-4">

<h2 className="font-semibold text-white">
Service Requests
</h2>

</div>


<div className="divide-y divide-[#143b28]">


{
requests.length === 0 ?

<div className="px-5 py-6 text-sm text-white/40">
No requests available
</div>


:

requests.map((request)=>(

<div
key={request.id}
className="flex items-center justify-between px-5 py-4"
>


<div>

<p className="font-medium text-white">
{request.title}
</p>


<p className="text-xs text-white/45">
{request.category}
</p>


<span className="mt-2 inline-flex rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs text-[#20dc73]">
{request.status}
</span>


</div>



<Link

href={`/dashboard/requests/${request.id}`}

className="text-sm text-[#20dc73]"

>
Open
</Link>


</div>


))

}


</div>


</div>

)

}