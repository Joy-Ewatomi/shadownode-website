export default function InvestigatorDashboard(){


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

Manage assigned investigations, evidence and intelligence.

</p>



<div className="
grid
grid-cols-4
gap-5
mt-8
">


<Card
title="Assigned Cases"
value="12"
/>


<Card
title="Pending Tasks"
value="8"
/>


<Card
title="Evidence Files"
value="43"
/>


<Card
title="Reports"
value="6"
/>


</div>



</div>

)

}




function Card({
title,
value
}:{
title:string,
value:string
}){


return (

<div className="
border
border-[#143b28]
bg-[#06110f]
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
mt-2
">

{value}

</h2>


</div>


)


}