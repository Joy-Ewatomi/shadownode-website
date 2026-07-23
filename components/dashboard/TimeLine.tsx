'use client'


import {
  CheckCircle,
  Clock,
  FileSearch,
  CreditCard
} from "lucide-react"



const activities = [

{
title:"Request Submitted",
description:"Your intelligence request has been received",
date:"23 July 2026",
status:"completed",
icon:FileSearch
},


{
title:"Payment Confirmed",
description:"Payment verification completed",
date:"23 July 2026",
status:"completed",
icon:CreditCard
},


{
title:"Investigation Started",
description:"Analyst assigned and investigation started",
date:"24 July 2026",
status:"active",
icon:CheckCircle
},


{
title:"Final Report",
description:"Awaiting completion of investigation",
date:"Pending",
status:"pending",
icon:Clock
}


]





export default function Timeline(){



return (

<div

className="
bg-card
border
border-border/30
rounded-xl
p-6
"

>



<h2

className="
font-semibold
text-lg
mb-6
"

>

Case Timeline

</h2>





<div

className="
space-y-6
"

>


{

activities.map((item,index)=>{


const Icon=item.icon



return (

<div

key={index}

className="
flex
gap-4
"

>


{/* ICON */}


<div

className={`
w-10
h-10
rounded-full
flex
items-center
justify-center

${
item.status==="completed"
?
"bg-green-500/10 text-green-500"

:

item.status==="active"

?

"bg-primary/10 text-primary"

:

"bg-muted text-muted-foreground"

}
`}

>


<Icon size={18}/>


</div>







{/* CONTENT */}


<div>


<h3

className="
font-medium
"

>

{item.title}

</h3>


<p

className="
text-sm
text-muted-foreground
mt-1
"

>

{item.description}

</p>


<p

className="
text-xs
text-muted-foreground
mt-2
"

>

{item.date}

</p>


</div>



</div>


)


})


}



</div>






</div>


)


}