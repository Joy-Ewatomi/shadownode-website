"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type RequestData = {
  currency: string | null
  id: string
  case_number: string | null
  title: string | null

  preferred_currency: string | null
  client_country: string | null
  service_type: string | null
  description: string | null
  investigation_objective: string | null
  status: string

  ai_price_estimate: number | null
  ai_complexity: string | null
  ai_confidence: number | null
  ai_reasoning: string | null

  client_email: string | null

  approved_quote_amount: number | null
  approved_quote_currency: string | null
approved_start_date: string | null
approved_completion_date: string | null

  training_preferred_start_date: string | null
training_preferred_completion_date: string | null
training_timeline_flexible: boolean | null
training_topics: string | null
training_skill_level: string | null
training_goal: string | null
training_client_type: string | null
training_participant_count: number | null
training_organization_name: string | null
}


export default function AdminRequestReviewCard({
  request,
}: {
  request: RequestData
}) {

  const router = useRouter()

  const [loading,setLoading] = useState(false)
  const [message,setMessage] = useState("")


 const [form, setForm] = useState({
  amount:
    request.approved_quote_amount?.toString() ??
    request.ai_price_estimate?.toString() ??
    "",

 currency:
request.approved_quote_currency ??
request.preferred_currency ??
request.currency ??
"USD",

  start_date:
 request.approved_start_date ??
 request.training_preferred_start_date ??
 "",

completion_date:
 request.approved_completion_date ??
 request.training_preferred_completion_date ??
 "",

  reason: "",
})



  async function submitForReview(){

    try{

      setLoading(true)
      setMessage("")


      const res = await fetch(
        `/api/admin/requests/${request.id}`,
        {
          method:"PATCH",
          headers:{
            "Content-Type":"application/json"
          },
body:JSON.stringify({

  action:
    "submit_for_super_admin_review",

  approved_quote_amount:
    Number(form.amount),

  approved_quote_currency:
    form.currency,

  approved_start_date:
    form.start_date,

  approved_completion_date:
    form.completion_date,

  approved_estimated_completion:
    form.completion_date,

  admin_quote_notes:
    form.reason

})
        }
      )


      const data = await res.json()


      if(!res.ok){

        throw new Error(
          data.error ||
          "Failed to submit quote"
        )

      }

router.push("/dashboard/requests")
router.refresh()

    }catch(error){

      setMessage(
        error instanceof Error
        ?
        error.message
        :
        "Something went wrong"
      )

    }finally{

      setLoading(false)

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
Administrator Review
</p>


<h2
className="
mt-3
text-2xl
font-bold
text-white
"
>
{request.title}
</h2>


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





<div
className="
grid
gap-6
lg:grid-cols-2
"
>



<div
className="
rounded-md
border
border-[#143b28]
bg-[#06110f]
p-5
"
>

<h3 className="font-semibold text-white">
Request Details
</h3>


<div
  className="
  mt-4
  space-y-3
  text-sm
  text-white/60
  "
>

<p>
Service:
<span className="ml-2 text-white">
{request.service_type || "Pending"}
</span>
</p>

<p>
Training Goal:
<span className="ml-2 text-white">
{request.training_goal || "Not provided"}
</span>
</p>

<p>
Skill Level:
<span className="ml-2 text-white capitalize">
{request.training_skill_level || "Not provided"}
</span>
</p>

<p>
Topics:
<span className="ml-2 text-white">
{request.training_topics || "Not provided"}
</span>
</p>

<p>
Participants:
<span className="ml-2 text-white">
{request.training_participant_count || "Not provided"}
</span>
</p>

<p>
Organization:
<span className="ml-2 text-white">
{request.training_organization_name || "Individual"}
</span>
</p>

<p>
Training Start:
<span className="ml-2 text-white">
{
request.approved_start_date ||
request.training_preferred_start_date ||
"Not provided"
}
</span>
</p>


<p>
Training Completion:
<span className="ml-2 text-white">
{
request.approved_completion_date ||
request.training_preferred_completion_date ||
"Not provided"
}
</span>
</p>


<p>
Timeline Flexible:
<span className="ml-2 text-white">
{
request.training_timeline_flexible
?
"Yes"
:
"No"
}
</span>
</p>

<p>
Client Country:
<span className="ml-2 text-white">
{request.client_country || "Not provided"}
</span>
</p>

<p>
Objective:
<span className="ml-2 text-white">
{request.investigation_objective || "Not provided"}
</span>
</p>

<p>
Description:
<span className="ml-2 text-white">
{request.description || "None"}
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

<h3 className="font-semibold text-white">
AI Proposal
</h3>


<p className="mt-4 text-sm text-white/60">
AI Estimate:

<span className="ml-2 text-[#20dc73]">

{request.preferred_currency || "USD"}{" "}
{Number(request.ai_price_estimate || 0).toLocaleString()}

</span>

</p>

<p className="mt-3 text-sm text-white/60">
Current Status:

<span className="ml-2 text-[#20dc73]">
{request.status}
</span>

</p>

<p className="mt-3 text-sm text-white/60">

Complexity:

<span className="ml-2 text-[#20dc73]">
{request.ai_complexity || "Pending"}
</span>

</p>


<p className="mt-3 text-sm text-white/60">

Confidence:

<span className="ml-2 text-[#20dc73]">
{request.ai_confidence || 0}%
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

<h3 className="font-semibold text-white">
AI Reasoning
</h3>


<p
className="
mt-3
text-sm
leading-7
text-white/60
"
>
{request.ai_reasoning || "No reasoning available"}
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

<h3 className="font-semibold text-white">
Administrator Quote
</h3>



<div
className="
mt-4
grid
gap-4
md:grid-cols-2
"
>


<label className="text-sm text-white/60">

Quote Amount

<input
type="number"
value={form.amount}
onChange={(e)=>
setForm({
...form,
amount:e.target.value
})
}
className="
mt-2
h-10
w-full
rounded
border
border-[#143b28]
bg-black
px-3
text-white
"
/>

</label>





<label className="text-sm text-white/60">

  Currency

  <select
    value={form.currency}
    onChange={(e) =>
      setForm({
        ...form,
        currency: e.target.value
      })
    }
    className="
      mt-2
      h-10
      w-full
      rounded
      border
      border-[#143b28]
      bg-black
      px-3
      text-white
    "
  >

    <option value={request.preferred_currency || "USD"}>
      {request.preferred_currency || "USD"} (Client Currency)
    </option>

    {[
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "CAD",
  "AUD",
  "JPY",
  "INR",
  "SGD",
  "CNY",
  "KES",
  "GHS",
].map((currency) => (
  <option key={currency} value={currency}>
    {currency}
  </option>
))}

  </select>

</label>



<label className="text-sm text-white/60 md:col-span-2">
  Training Start Date

  <input
    type="date"
    value={form.start_date}
    onChange={(e) =>
      setForm({
        ...form,
        start_date: e.target.value,
      })
    }
    className="
      mt-2
      h-10
      w-full
      rounded
      border
      border-[#143b28]
      bg-black
      px-3
      text-white
    "
  />

  <div className="mt-4">Training Completion Date</div>

  <input
    type="date"
    value={form.completion_date}
    onChange={(e) =>
      setForm({
        ...form,
        completion_date: e.target.value,
      })
    }
    className="
      mt-2
      h-10
      w-full
      rounded
      border
      border-[#143b28]
      bg-black
      px-3
      text-white
    "
  />
</label>




<label
className="
text-sm
text-white/60
md:col-span-2
"
>

Reason / Note


<textarea

value={form.reason}

onChange={(e)=>
setForm({
...form,
reason:e.target.value
})
}

className="
mt-2
min-h-24
w-full
rounded
border
border-[#143b28]
bg-black
px-3
py-2
text-white
"

/>


</label>



</div>


<button

onClick={submitForReview}

disabled={loading}

className="
mt-5
rounded-md
bg-[#20dc73]
px-5
py-3
font-semibold
text-black
disabled:opacity-50
"

>

{
loading
?
"Sending..."
:
"Send to Super Administrator"
}


</button>


</div>


</div>

)

}