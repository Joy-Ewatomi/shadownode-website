"use client"

import Link from "next/link"
import {usePathname} from "next/navigation"


const tabs = [

{
label:"Overview",
path:""
},

{
label:"Messages",
path:"messages"
},

{
label:"Evidence",
path:"evidence"
},

{
label:"Timeline",
path:"timeline"
},

{
label:"Reports",
path:"reports"
},

{
label:"Team",
path:"team"
}

]



export default function CaseTabs({
caseId
}:{
caseId:string
}){


const pathname =
usePathname()


return (

<div className="flex gap-2 overflow-x-auto border-b border-[#143b28] pb-3">


{
tabs.map(tab=>{


const href =
`/dashboard/cases/${caseId}/${tab.path}`


const active =
pathname === href



return (

<Link

key={tab.label}

href={href}

className={`
rounded-md
px-4
py-2
text-sm
transition
${
active
?
"bg-[#20dc73]/10 text-[#20dc73] border border-[#20dc73]/30"
:
"text-white/50 hover:text-white"
}
`}

>

{tab.label}

</Link>


)


})

}


</div>

)

}