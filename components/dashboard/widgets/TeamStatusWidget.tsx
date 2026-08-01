"use client"

import { Users } from "lucide-react"


type TeamMember = {
  id: string
  username: string
  role: string
  status: "online" | "offline" | "busy"
}



export default function TeamStatusWidget({
  members = []
}:{
  members?: TeamMember[]
}){


return (

<div className="rounded-md border border-[#143b28] bg-[#06110f]">


<div className="flex items-center gap-2 border-b border-[#143b28] px-5 py-4">


<Users className="h-5 w-5 text-[#20dc73]" />


<h2 className="font-semibold text-white">
Team Status
</h2>


</div>




<div className="divide-y divide-[#143b28]">


{
members.length === 0 ?

<div className="px-5 py-6 text-sm text-white/40">
No team activity
</div>


:


members.map((member)=>(

<div
key={member.id}
className="flex items-center justify-between px-5 py-4"
>


<div>

<p className="font-medium text-white">
{member.username}
</p>


<p className="text-xs text-white/45">
{member.role}
</p>


</div>



<span
className={`
rounded px-2 py-1 text-xs
${
member.status === "online"
?
"bg-[#20dc73]/10 text-[#20dc73]"
:
member.status === "busy"
?
"bg-yellow-500/10 text-yellow-300"
:
"bg-white/10 text-white/40"
}
`}
>

{member.status}

</span>


</div>


))


}


</div>


</div>

)

}