"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import RequestStatusBadge from "./RequestStatusBadge"


type Request = {
 id:string
 case_number:string|null
 title:string|null
 service_type:string|null
 status:string
 priority:string|null
 ai_price_estimate:number|null
 created_at:string
}



export default function RequestTable(){

const [requests,setRequests] = useState<Request[]>([])
const [loading,setLoading] = useState(true)



useEffect(()=>{


async function load(){

try{

const res = await fetch("/api/requests")

const data = await res.json()

setRequests(data)

}

catch(error){

console.error(error)

}

finally{

setLoading(false)

}

}


load()


},[])



if(loading){

return (

<div className="text-white/50">
Loading requests...
</div>

)

}



return (

<div className="rounded-md border border-[#143b28] bg-[#06110f]">


<div className="border-b border-[#143b28] px-5 py-4">

<h2 className="font-semibold text-white">
Incoming Investigation Requests
</h2>

<p className="text-sm text-white/45">
Review client submissions and prepare quotes.
</p>

</div>



<div className="divide-y divide-[#143b28]">


{
requests.length === 0 ?

<div className="p-5 text-sm text-white/40">
No requests found.
</div>


:

requests.map((request)=>(


<div
key={request.id}
className="flex flex-wrap items-center justify-between gap-4 px-5 py-5"
>


<div className="space-y-1">


<Link
href={`/dashboard/requests/${request.id}`}
className="font-semibold text-white hover:text-[#20dc73]"
>

{request.title || "Untitled Request"}

</Link>



<p className="text-xs text-white/40">

{request.case_number}

</p>



<p className="text-sm text-white/50">

{request.service_type}

</p>



</div>



<div className="flex items-center gap-4">


<RequestStatusBadge
status={request.status}
/>


<Link
href={`/dashboard/requests/${request.id}`}
className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-3 py-2 text-xs text-[#20dc73]"
>

Review

</Link>


</div>


</div>


))

}



</div>


</div>

)

}