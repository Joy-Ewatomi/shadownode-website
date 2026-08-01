"use client"

import {useState} from "react"


export default function QuoteApprovalCard({
request
}:{
request:any
}){


const [loading,setLoading]=useState(false)
const [message,setMessage]=useState("")



async function decide(
decision:"accept"|"decline"
){


setLoading(true)


const res = await fetch(
`/api/client/requests/${request.id}/decision`,
{
method:"PATCH",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
decision
})
}
)


const data = await res.json()


if(!res.ok){

setMessage(
data.error || "Action failed"
)

}else{


setMessage(
decision==="accept"
?
"Quote accepted. Case created."
:
"Quote declined."
)

}


setLoading(false)


}



return (

<div className="
rounded-md
border
border-[#143b28]
bg-[#06110f]
p-6
space-y-5
">


<h2 className="
text-xl
font-bold
text-white
">

Investigation Quote

</h2>


<div className="space-y-2 text-white/60">


<p>
Service:
<span className="text-white">
{" "}
{request.service_type}
</span>
</p>


<p>
Amount:

<span className="text-[#20dc73]">
{" "}
{request.approved_quote_currency}

{" "}
{request.approved_quote_amount?.toLocaleString()}
</span>

</p>


<p>
Completion:

<span className="text-white">
{" "}
{request.approved_estimated_completion || "Pending"}
</span>

</p>


</div>



<p className="text-sm text-white/50">
{request.approved_quote_notes}
</p>



<div className="flex gap-3">


<button

disabled={loading}

onClick={()=>decide("accept")}

className="
rounded-md
bg-[#20dc73]
px-5
py-3
font-semibold
text-black
"

>

Accept Quote

</button>



<button

disabled={loading}

onClick={()=>decide("decline")}

className="
rounded-md
border
border-red-500/40
px-5
py-3
text-red-300
"

>

Decline

</button>


</div>



{
message &&
<p className="text-sm text-[#20dc73]">
{message}
</p>
}


</div>

)

}