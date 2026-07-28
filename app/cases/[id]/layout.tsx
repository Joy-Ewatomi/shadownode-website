import Link from "next/link";


export default async function CaseLayout({
children,
params
}:{
children:React.ReactNode,
params:Promise<{id:string}>
}){


const {id}=await params



return (

<div className="
min-h-screen
bg-[#020604]
text-white
p-6
">


<div className="
border
border-[#143b28]
bg-[#06100c]
rounded-lg
p-5
">



<div className="
flex
justify-between
items-center
">



<div>


<h1 className="
text-xl
font-bold
text-[#20dc73]
">

Case Workspace

</h1>



<p className="
text-sm
text-white/50
">

Case ID: {id}

</p>



</div>





<div className="
text-sm
text-green-400
">

ACTIVE

</div>



</div>






<nav className="
flex
gap-5
mt-6
text-sm
text-white/60
">


<Link href={`/cases/${id}`}>
Overview
</Link>

<Link href={`/cases/${id}/workspace`}>
Workspace
</Link>


<Link href={`/cases/${id}/graph`}>
Graph
</Link>


<Link href={`/cases/${id}/timeline`}>
Timeline
</Link>


<Link href={`/cases/${id}/evidence`}>
Evidence
</Link>


<Link href={`/cases/${id}/reports`}>
Reports
</Link>

<Link href={`/cases/${id}/updates`}>
Updates
</Link>

</nav>



</div>





<div className="mt-6">

{children}

</div>



</div>

)

}
