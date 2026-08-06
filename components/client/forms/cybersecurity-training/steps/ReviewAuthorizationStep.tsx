"use client"

import {
  CheckCircle2,
} from "lucide-react"


type Props = {
  form: any
  set: (value: any) => void
}


export default function ReviewAuthorizationStep({
  form,
  set,
}: Props) {


return (

<div className="space-y-6">

<p className="text-sm text-white/60">
Review your cybersecurity training request before submission.
</p>


<div className="rounded-md border border-[#143b28] bg-black p-5 space-y-4">


<div className="flex items-center gap-3">

<CheckCircle2
className="h-5 w-5 text-[#20dc73]"
/>

<h3 className="font-semibold text-white">
Training Request Summary
</h3>

</div>



<div className="grid gap-4 text-sm">


<div>
<p className="text-white/40">
Service
</p>

<p className="text-white">
{form.service_type || "Not selected"}
</p>

</div>



<div>
<p className="text-white/40">
Organization
</p>

<p className="text-white">
{
form.training_organization_name ||
"Not provided"
}
</p>

</div>




<div>
<p className="text-white/40">
Audience
</p>

<p className="text-white">
{
form.training_audience ||
"Not selected"
}
</p>

</div>




<div>
<p className="text-white/40">
Training Objectives
</p>

<p className="text-white">
{
form.training_objectives?.join(", ") ||
"Not selected"
}
</p>

</div>




<div>
<p className="text-white/40">
Training Topics
</p>

<p className="text-white">
{
form.training_topics_selected?.join(", ") ||
"Not selected"
}
</p>

</div>




<div>
<p className="text-white/40">
Duration
</p>

<p className="text-white">
{
form.training_duration ||
"Not selected"
}
</p>

</div>




<div>
<p className="text-white/40">
Expected Outcome
</p>

<p className="text-white">
{
form.training_expected_outcome ||
"Not provided"
}
</p>

</div>




<div>
<p className="text-white/40">
Preferred Start
</p>

<p className="text-white">
{
form.training_preferred_start_date ||
"Not provided"
}
</p>

</div>




<div>
<p className="text-white/40">
Contact
</p>

<p className="text-white">

{
form.communication_email ||
form.communication_whatsapp ||
form.communication_signal ||
"No contact provided"
}

</p>

</div>



</div>


</div>





<label className="flex cursor-pointer items-start gap-3 rounded-md border border-[#143b28] p-4">


<input

type="checkbox"

checked={
form.authorization_confirmed
}

onChange={(e)=>

set({

authorization_confirmed:
e.target.checked

})

}

className="mt-1 h-4 w-4 accent-[#20dc73]"

/>


<span className="text-sm text-white/70">

I confirm that the information provided is accurate and I authorize ShadowNode Intelligence Bureau to review this cybersecurity training request.

</span>


</label>


</div>

)

}