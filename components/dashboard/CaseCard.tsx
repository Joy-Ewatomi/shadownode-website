"use client"

import {
  FileSearch,
  Clock,
  CheckCircle,
  XCircle,
  ShieldAlert
} from "lucide-react"

import { CaseData } from "@/app/dashboard/page"



interface Props {

  caseData: CaseData

}



export default function CaseCard({
  caseData
}: Props){



function statusIcon(){


switch(caseData.status){


case "active":

return (
<ShieldAlert
className="h-5 w-5"
/>
)


case "completed":

return (
<CheckCircle
className="h-5 w-5"
/>
)


case "cancelled":

return (
<XCircle
className="h-5 w-5"
/>
)


default:

return (
<Clock
className="h-5 w-5"
/>
)


}



}





function statusStyle(){


switch(caseData.status){


case "active":

return "bg-blue-500/10 text-blue-500"


case "completed":

return "bg-green-500/10 text-green-500"


case "cancelled":

return "bg-red-500/10 text-red-500"


default:

return "bg-yellow-500/10 text-yellow-500"


}



}





return (


<div
className="
border
rounded-xl
p-5
bg-card
shadow-sm
space-y-4
"
>




<div
className="
flex
justify-between
items-start
"
>



<div
className="
flex
gap-3
items-center
"
>


<div
className="
p-2
rounded-lg
bg-primary/10
text-primary
"
>

<FileSearch/>

</div>



<div>


<h3
className="
font-semibold
text-lg
"
>

{caseData.title}

</h3>



<p
className="
text-sm
text-muted-foreground
"
>

{caseData.service_type || "Investigation"}

</p>



</div>


</div>







<div
className={`
px-3
py-1
rounded-full
text-xs
flex
gap-1
items-center
${statusStyle()}
`}
>


{statusIcon()}


{caseData.status}

</div>






</div>









{
caseData.description &&

<p
className="
text-sm
text-muted-foreground
"
>

{caseData.description}

</p>

}









<div
className="
grid
grid-cols-2
gap-4
text-sm
"
>




<div>


<p
className="
text-muted-foreground
"
>

AI Estimated Price

</p>



<p
className="
font-semibold
"
>

{

caseData.estimated_price

?

`₦${caseData.estimated_price.toLocaleString()}`

:

"Pending Review"

}


</p>


</div>







<div>


<p
className="
text-muted-foreground
"
>

Approved Price

</p>



<p
className="
font-semibold
"
>

{

caseData.final_price

?

`₦${caseData.final_price.toLocaleString()}`

:

"Awaiting Approval"

}


</p>


</div>





</div>









<div
className="
flex
justify-between
items-center
pt-3
border-t
"
>



<p
className="
text-xs
text-muted-foreground
"
>

Submitted:

{

new Date(
caseData.created_at
)
.toLocaleDateString()

}

</p>





<button
className="
text-sm
bg-primary
text-primary-foreground
px-4
py-2
rounded-lg
"
>

View Case

</button>




</div>






</div>


)


}