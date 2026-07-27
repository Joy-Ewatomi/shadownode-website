"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"


export default function CaseDashboard(){


const params = useParams()

const caseId = params.id as string



const [loading,setLoading] = useState(true)


const [data,setData] = useState<any>(null)



useEffect(()=>{


async function loadDashboard(){


try{


const res = await fetch(
`/api/cases/${caseId}/dashboard`
)


const result = await res.json()


setData(result)


}
catch(error){

console.error(
"Dashboard error",
error
)

}
finally{

setLoading(false)

}


}



if(caseId){

loadDashboard()

}


},[caseId])





if(loading){

return (

<div className="
min-h-screen
flex
items-center
justify-center
bg-[#020604]
text-[#20dc73]
">

Loading Case Dashboard...

</div>

)

}





if(!data){

return (

<div className="
min-h-screen
bg-[#020604]
text-white
p-10
">

No case data found

</div>

)

}





return (

<div className="
min-h-screen
bg-[#020604]
text-white
p-6
">



{/* HEADER */}

<div className="
rounded-xl
border
border-[#123a2d]
bg-[#06110f]
p-6
">


<div className="
flex
justify-between
items-center
">


<div>


<h1 className="
text-2xl
font-bold
text-[#20dc73]
">

{data.case?.title || "Investigation Case"}

</h1>


<p className="
text-white/50
mt-2
">

Case ID:
{caseId}

</p>


</div>



<div className="
px-4
py-2
rounded
bg-green-900/40
text-green-400
">

{data.case?.status || "ACTIVE"}

</div>



</div>


</div>






{/* STATISTICS */}


<div className="
grid
grid-cols-1
md:grid-cols-4
gap-5
mt-6
">



<StatCard
title="Entities"
value={data.stats?.entities ?? 0}
/>


<StatCard
title="Relationships"
value={data.stats?.relationships ?? 0}
/>



<StatCard
title="Evidence"
value={data.stats?.evidence ?? 0}
/>



<StatCard
title="Reports"
value={data.stats?.reports ?? 0}
/>



</div>







{/* QUICK ACTIONS */}


<div className="
mt-8
grid
grid-cols-2
md:grid-cols-4
gap-4
">



<ActionButton
href={`/cases/${caseId}/graph`}
text="Investigation Graph"
/>



<ActionButton
href={`/cases/${caseId}/evidence`}
text="Evidence"
/>



<ActionButton
href={`/cases/${caseId}/timeline`}
text="Timeline"
/>



<ActionButton
href={`/cases/${caseId}/reports`}
text="Reports"
/>



</div>







{/* TEAM */}


<div className="
mt-8
rounded-xl
border
border-[#123a2d]
bg-[#06110f]
p-6
">


<h2 className="
text-lg
font-bold
text-[#20dc73]
mb-5
">

Investigation Team

</h2>



<div className="
space-y-3
">


{

data.team?.length ?

data.team.map(
(member:any)=>(

<div

key={member.id}

className="
flex
justify-between
border-b
border-white/10
pb-3
"

>


<div>

<p className="
font-semibold
">

{member.name}

</p>


<p className="
text-sm
text-white/50
">

{member.role}

</p>


</div>


</div>

)

)


:

<p className="text-white/50">

No team assigned

</p>


}



</div>



</div>






{/* SUMMARY */}


<div className="
mt-8
rounded-xl
border
border-[#123a2d]
bg-[#06110f]
p-6
">


<h2 className="
text-lg
font-bold
text-[#20dc73]
mb-3
">

Investigation Summary

</h2>



<p className="
text-white/70
">

{data.case?.description ||
"No investigation summary available yet."}

</p>



</div>






</div>

)

}







function StatCard(
{
title,
value
}:{
title:string,
value:number
}

){


return (

<div className="
rounded-xl
border
border-[#123a2d]
bg-[#06110f]
p-5
">


<p className="
text-white/50
text-sm
">

{title}

</p>


<p className="
text-3xl
font-bold
text-[#20dc73]
mt-2
">

{value}

</p>


</div>


)

}







function ActionButton(
{
href,
text
}:{
href:string,
text:string
}

){


return (

<Link

href={href}

className="
rounded-lg
border
border-[#20dc73]
bg-[#06110f]
p-4
text-center
text-[#20dc73]
hover:bg-[#20dc73]
hover:text-black
transition
"

>

{text}

</Link>

)

}