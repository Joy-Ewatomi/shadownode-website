'use client'

import Link from "next/link"

import {
  Plus,
  MessageSquare,
  ShieldCheck,
  UploadCloud,
  ArrowRight
} from "lucide-react"



const actions = [

{
title:"New Investigation",
description:"Submit a new intelligence request",
href:"/request",
icon:Plus
},


{
title:"Secure Messages",
description:"Communicate with your assigned analyst",
href:"/dashboard/messages",
icon:MessageSquare
},


{
title:"Secure Vault",
description:"Access reports and encrypted files",
href:"/dashboard/vault",
icon:ShieldCheck
},


{
title:"Upload Evidence",
description:"Send files related to your case",
href:"/dashboard/upload",
icon:UploadCloud
}


]





export default function QuickActions(){



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

Quick Actions

</h2>





<div

className="
space-y-3
"

>


{

actions.map((action)=>{


const Icon = action.icon



return (

<Link

key={action.title}

href={action.href}

className="
flex
items-center
justify-between
p-4
rounded-lg
border
border-border/30
hover:border-primary/50
hover:bg-primary/5
transition
group
"

>



<div

className="
flex
items-center
gap-4
"

>


<div

className="
w-10
h-10
rounded-lg
bg-primary/10
text-primary
flex
items-center
justify-center
"

>


<Icon size={20}/>


</div>





<div>


<h3

className="
font-medium
text-sm
"

>

{action.title}

</h3>


<p

className="
text-xs
text-muted-foreground
mt-1
"

>

{action.description}

</p>



</div>



</div>





<ArrowRight

size={18}

className="
text-muted-foreground
group-hover:text-primary
group-hover:translate-x-1
transition
"

/>



</Link>


)


})


}



</div>





</div>


)


}