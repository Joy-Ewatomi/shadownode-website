"use client"

import Link from "next/link";


export default function Sidebar(){


return (

<aside className="
w-64
border-r
border-[#143b28]
bg-[#06100c]
p-5
">


<h1 className="
text-xl
font-bold
text-[#20dc73]
mb-8
">

ShadowNode

</h1>



<nav className="
space-y-3
">


<Link href="/dashboard">
Dashboard
</Link>


<Link href="/dashboard/cases">
Cases
</Link>


<Link href="/dashboard/analyst">
Investigation Graph
</Link>


<Link href="/dashboard/users">
Users
</Link>


<Link href="/dashboard/settings">
Settings
</Link>


</nav>


</aside>


)

}