"use client"

import { useState } from "react"

type RequestData = {
  id: string
  case_number: string | null
  title: string | null
  service_type: string | null
  description: string | null
  status: string
  priority: string | null
  ai_price_estimate: number | null
  ai_complexity: string | null
  ai_confidence: number | null
  ai_reasoning: string | null
  client_email: string | null
}


export default function RequestReviewCard({
  request
}: {
  request: RequestData
}) {

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [rejecting, setRejecting] = useState(false)


  async function updateRequest(
    action: string,
    extra: Record<string, unknown> = {}
  ) {

    try {

      setLoading(true)
      setMessage("")


      const res = await fetch(
        `/api/admin/requests/${request.id}`,
        {
          method: "PATCH",
          headers:{
            "Content-Type":"application/json"
          },
          body: JSON.stringify({
            action,
            ...extra
          })
        }
      )


      const data = await res.json()


      if(!res.ok){

        throw new Error(
          data.error || "Action failed"
        )

      }


      setMessage(
        action === "submit_for_super_admin_review"
        ?
        "Sent to super administrator review."
        :
        "Updated successfully."
      )


    }
    catch(error){

      setMessage(
        error instanceof Error
        ? error.message
        : "Something went wrong"
      )

    }
    finally{

      setLoading(false)

    }

  }



  async function acceptRequest(){

    await updateRequest(
      "submit_for_super_admin_review",
      {
        decision:"accepted",

        approved_quote_amount:
          request.ai_price_estimate || 0,

        approved_quote_currency:"NGN",

        admin_quote_notes:
          "Accepted based on AI assessment."
      }
    )

  }



  async function adjustRequest(){

    const amount = prompt(
      "Enter adjusted quote amount",
      String(request.ai_price_estimate || "")
    )


    if(!amount){
      return
    }


    const reason = prompt(
      "Reason for adjustment"
    )


    if(!reason){
      return
    }


    await updateRequest(
      "submit_for_super_admin_review",
      {
        decision:"adjusted",

        approved_quote_amount:
          Number(amount),

        approved_quote_currency:"NGN",

        admin_quote_notes:
          reason
      }
    )

  }



  async function rejectRequest(){

    const reason = prompt(
      "Reason for rejection"
    )


    if(!reason){
      return
    }


    try{

      setRejecting(true)


      await updateRequest(
        "submit_for_super_admin_review",
        {
          decision:"rejected",

          admin_quote_notes:
            reason
        }
      )


    }
    finally{

      setRejecting(false)

    }

  }




return (

<div className="space-y-6">


{
message && (

<div
className="
rounded-md
border
border-[#20dc73]/30
bg-[#20dc73]/10
px-4
py-3
text-sm
text-[#20dc73]
"
>
{message}
</div>

)
}



<div
className="
rounded-md
border
border-[#143b28]
bg-[#06110f]
p-6
"
>

<p
className="
text-xs
uppercase
tracking-[0.2em]
text-[#20dc73]
"
>
Investigation Request
</p>


<h1
className="
mt-3
text-2xl
font-bold
text-white
"
>
{request.title}
</h1>


<p
className="
mt-2
text-sm
text-white/50
"
>
{request.case_number}
</p>


</div>





<div className="grid gap-6 lg:grid-cols-2">


<div
className="
rounded-md
border
border-[#143b28]
bg-[#06110f]
p-5
"
>

<h2 className="font-semibold text-white">
Client Information
</h2>


<p className="mt-4 text-sm text-white/60">
{request.client_email}
</p>


</div>





<div
className="
rounded-md
border
border-[#143b28]
bg-[#06110f]
p-5
"
>

<h2 className="font-semibold text-white">
AI Analysis
</h2>


<p className="mt-4 text-sm text-white/60">
Complexity:

<span className="text-[#20dc73]">
{" "}
{request.ai_complexity}
</span>

</p>



<p className="mt-2 text-sm text-white/60">
Confidence:

<span className="text-[#20dc73]">
{" "}
{request.ai_confidence}%
</span>

</p>



<p className="mt-2 text-sm text-white/60">
Estimated:

<span className="text-[#20dc73]">
{" "}
₦{request.ai_price_estimate?.toLocaleString()}
</span>

</p>


</div>


</div>





<div
className="
rounded-md
border
border-[#143b28]
bg-[#06110f]
p-5
"
>

<h2 className="font-semibold text-white">
Description
</h2>


<p
className="
mt-3
text-sm
leading-7
text-white/60
"
>
{request.description}
</p>


</div>





<div
className="
rounded-md
border
border-[#143b28]
bg-[#06110f]
p-5
"
>

<h2 className="font-semibold text-white">
AI Reasoning
</h2>


<p
className="
mt-3
text-sm
leading-7
text-white/60
"
>
{request.ai_reasoning}
</p>


</div>





<div className="flex flex-wrap gap-3">


<button
onClick={acceptRequest}
disabled={loading}
className="
rounded-md
bg-[#20dc73]
px-5
py-3
font-semibold
text-black
disabled:opacity-50
"
>
Accept
</button>




<button
onClick={adjustRequest}
disabled={loading}
className="
rounded-md
border
border-yellow-400/40
px-5
py-3
text-yellow-300
disabled:opacity-50
"
>
Adjust
</button>




<button
onClick={rejectRequest}
disabled={rejecting}
className="
rounded-md
border
border-red-500/40
px-5
py-3
text-red-300
disabled:opacity-50
"
>
{
rejecting
?
"Rejecting..."
:
"Reject"
}
</button>


</div>


</div>

)

}