"use client"

import {useEffect,useState} from "react"


type Request={
id:string
case_number:string
title:string
service_type:string
status:string
created_at:string
}


export default function RequestTable(){

const [requests,setRequests]=useState<Request[]>([])


useEffect(()=>{

fetch("/api/requests")
.then(res=>res.json())
.then(setRequests)

},[])


return (

<div className="rounded-md border border-[#143b28] bg-[#06110f]">


<div className="border-b border-[#143b28] p-4">

<h2 className="font-semibold text-white">
Incoming Requests
</h2>

</div>



<div className="divide-y divide-[#143b28]">


{
requests.map(request=>(

<div 
key={request.id}
className="flex items-center justify-between p-5"
>


<div>

<p className="font-medium text-white">
{request.title}
</p>


<p className="text-sm text-white/50">
{request.case_number}
</p>


<p className="text-xs text-white/40">
{request.service_type}
</p>


</div>



<div>

<span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-3 py-1 text-xs text-[#20dc73]">

{request.status}

</span>

</div>


</div>

))

}


</div>


</div>

)

}