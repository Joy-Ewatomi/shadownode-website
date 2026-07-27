import Link from "next/link";


export default function CaseLayout({
children,
params
}:{
children:React.ReactNode,
params:{id:string}
}){


return (

<div className="min-h-screen bg-[#020604] text-white p-6">


<div className="
border
border-[#143b28]
bg-[#06100c]
rounded-lg
p-5
">


<div className="flex justify-between items-center">


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

Case ID: {params.id}

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


<Link href={`/cases/${params.id}`}>
Overview
</Link>


<Link href={`/cases/${params.id}/graph`}>
Graph
</Link>


<Link href={`/cases/${params.id}/timeline`}>
Timeline
</Link>


<Link href={`/cases/${params.id}/evidence`}>
Evidence
</Link>


<Link href={`/cases/${params.id}/reports`}>
Reports
</Link>


</nav>


</div>



<div className="mt-6">

{children}

</div>


</div>


)

}