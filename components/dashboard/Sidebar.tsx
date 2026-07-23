'use client'

import Link from "next/link"
import {
  LayoutDashboard,
  FolderSearch,
  MessageSquare,
  ShieldCheck,
  Settings,
  LogOut
} from "lucide-react"



const menu = [

{
name:"Dashboard",
href:"/dashboard",
icon:LayoutDashboard
},


{
name:"Investigations",
href:"/dashboard/cases",
icon:FolderSearch
},


{
name:"Messages",
href:"/dashboard/messages",
icon:MessageSquare
},


{
name:"Secure Vault",
href:"/dashboard/vault",
icon:ShieldCheck
},


{
name:"Settings",
href:"/dashboard/settings",
icon:Settings
}


]




export default function Sidebar(){


return (

<aside
className="
hidden
lg:flex
fixed
left-0
top-0
h-screen
w-64
border-r
border-border/30
bg-card/40
backdrop-blur-xl
flex-col
z-30
"
>


{/* LOGO */}


<div
className="
p-6
border-b
border-border/30
"
>


<div
className="
flex
items-center
gap-3
"
>


<div
className="
w-10
h-10
rounded-lg
bg-primary
flex
items-center
justify-center
"
>

<span
className="
font-bold
text-primary-foreground
"
>
SN
</span>

</div>




<div>

<h2
className="
font-bold
text-sm
"
>

SHADOWNODE

</h2>


<p
className="
text-xs
text-muted-foreground
"
>

Operations Bureau

</p>


</div>


</div>


</div>







{/* NAVIGATION */}



<nav
className="
flex-1
p-4
space-y-2
"
>


{
menu.map((item)=>{


const Icon=item.icon


return (

<Link

key={item.name}

href={item.href}

className="
flex
items-center
gap-3
px-4
py-3
rounded-lg
text-sm
text-muted-foreground
hover:text-primary
hover:bg-primary/10
transition
"

>


<Icon
size={18}
/>


<span>
{item.name}
</span>


</Link>


)


})

}



</nav>







{/* BOTTOM */}



<div
className="
p-4
border-t
border-border/30
"
>



<button

className="
flex
items-center
gap-3
w-full
px-4
py-3
rounded-lg
text-sm
text-muted-foreground
hover:text-red-500
hover:bg-red-500/10
transition
"

>


<LogOut size={18}/>


Logout


</button>



</div>



</aside>


)


}