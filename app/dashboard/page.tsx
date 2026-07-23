'use client'

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

import Sidebar from "../../components/dashboard/Sidebar"
import TopBar from "../../components/dashboard/TopBar"
import StatsCard from "../../components/dashboard/StatsCard"
import CaseCard from "../../components/dashboard/CaseCard"
import Timeline from "../../components/dashboard/TimeLine"
import QuickActions from "../../components/dashboard/QuickActions"
import { AnimatedGradient } from "../../components/animations/AnimatedGradient"



export interface CaseData {

  id: string

  case_number: string

  title: string

  description?: string

  service_type: string

  status:
    | "submitted"
    | "active"
    | "completed"
    | "cancelled"

  priority: string

  progress: number

  payment_status: string

  created_at: string

  estimated_completion?: string | null

}





export default function Dashboard(){


const supabase = useMemo(
  ()=>createClient(),
  []
)



const [cases,setCases] = useState<CaseData[]>([])

const [loading,setLoading] = useState(true)






// ===============================
// LOAD CLIENT CASES
// ===============================


useEffect(()=>{


async function loadCases(){


try{


const {
data:{
user
}
}
=
await supabase.auth.getUser()



// USER NOT LOGGED IN

if(!user){

window.location.href="/login"

return

}





// FETCH CASES

const {
data,
error
}
=
await supabase

.from("cases")

.select("*")

.eq(
"user_id",
user.id
)

.order(
"created_at",
{
ascending:false
}
)





if(error){

console.error(
"Supabase error:",
error
)

return

}





setCases(
(data || []) as CaseData[]
)



}


catch(error){

console.error(
"Dashboard error:",
error
)

}



finally{

setLoading(false)

}



}



loadCases()



},[supabase])









return (

<div
className="
relative
min-h-screen
overflow-hidden
bg-[#050505]
text-foreground
"
>

<div className="pointer-events-none fixed inset-0 z-0">
  <AnimatedGradient />
  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.2)_92%)]" />
</div>

<div className="relative z-10 flex min-h-screen">

{/* SIDEBAR */}

<Sidebar/>






{/* MAIN CONTENT */}

<div
className="
flex-1
lg:ml-64
"
>



<TopBar/>






<main
className="
p-6
space-y-8
"
>






{/* HEADER */}


<div>


<h1
className="
text-3xl
font-bold
tracking-tight
"
>

Client Portal

</h1>



<p
className="
text-muted-foreground
mt-2
"
>

Secure intelligence operations dashboard

</p>



</div>









{/* STATS */}



<div
className="
grid
grid-cols-2
lg:grid-cols-4
gap-4
"
>



<StatsCard

title="Total Cases"

value={
cases.length.toString()
}

/>





<StatsCard

title="Active"

value={
cases.filter(
item=>item.status==="active"
)
.length.toString()
}

/>





<StatsCard

title="Completed"

value={
cases.filter(
item=>item.status==="completed"
)
.length.toString()
}

/>





<StatsCard

title="Messages"

value="0"

/>



</div>









{/* INVESTIGATIONS */}



<section>



<div
className="
flex
justify-between
items-center
mb-4
"
>



<h2
className="
text-xl
font-semibold
"
>

Active Investigations

</h2>





<button
className="
bg-primary
text-primary-foreground
px-4
py-2
rounded-lg
text-sm
"
>

New Request

</button>



</div>









{
loading ?

<p>
Loading investigations...
</p>


:

cases.length === 0 ?

<p
className="
text-muted-foreground
"
>

No investigations submitted yet.

</p>


:


<div
className="
space-y-4
"
>

{

cases.map(
(item)=>(

<CaseCard

key={item.id}

caseData={item}

/>

)

)

}


</div>



}




</section>









{/* LOWER SECTION */}



<div
className="
grid
lg:grid-cols-2
gap-6
"
>


<Timeline/>


<QuickActions/>


</div>






</main>





</div>






</div>


</div>

)

}