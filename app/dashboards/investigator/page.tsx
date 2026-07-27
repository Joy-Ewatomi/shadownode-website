"use client"


import {
useEffect,
useState
} from "react"

import Link from "next/link"




export default function InvestigatorDashboard(){


const [data,setData]=useState<any>(null)





useEffect(()=>{


fetch(
"/api/investigator/dashboard"
)
.then(r=>r.json())
.then(setData)


},[])





if(!data){


return (

<div className="
min-h-screen
bg-[#020604]
flex
items-center
justify-center
text-[#20dc73]
">

Loading Command Center...

</div>

)


}






return (

<div className="
min-h-screen
bg-[#020604]
text-white
p-8
">



<h1 className="
text-3xl
font-bold
text-[#20dc73]
">

Investigator Command Center

</h1>


<p className="
text-white/50
mt-2
">

Assigned investigations and intelligence operations

</p>






<div className="
grid
grid-cols-3
gap-5
mt-8
">


<Card

title="Assigned Cases"

value={data.cases.length}

/>


<Card

title="Evidence Files"

value={data.stats.evidence}

/>


<Card

title="Reports"

value={data.stats.reports}

/>


</div>







<h2 className="
text-xl
font-bold
mt-10
">

My Investigations

</h2>







<div className="
mt-5
space-y-4
">


{
data.cases.map(
(c:any)=>(


<div

key={c.id}

className="
border
border-[#143b28]
bg-[#06110f]
rounded-xl
p-5
"


>


<h3 className="
text-[#20dc73]
font-bold
text-xl
">

{c.case_number}

</h3>


<p>

{c.title}

</p>


<p className="
text-white/50
">

Status: {c.status}

</p>


<p className="
text-white/50
">

Progress: {c.progress}%

</p>





<div className="
flex
gap-4
mt-4
">


<Link

href={`/cases/${c.id}`}

className="
bg-[#20dc73]
text-black
px-4
py-2
rounded
font-bold
"

>

Open Case

</Link>


<Link

href={`/cases/${c.id}/graph`}

className="
border
border-[#20dc73]
text-[#20dc73]
px-4
py-2
rounded
"

>

Graph

</Link>


</div>




</div>


)

)

}


</div>






</div>

)

}







function Card(
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
bg-[#06110f]
border
border-[#143b28]
rounded-xl
p-5
">


<p className="
text-white/50
">

{title}

</p>


<h2 className="
text-3xl
text-[#20dc73]
font-bold
">

{value}

</h2>


</div>

)

}