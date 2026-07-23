'use client'

import {
  Bell,
  ShieldCheck,
  Menu
} from "lucide-react"



export default function TopBar(){


return (

<header
className="
h-20
border-b
border-border/30
bg-background/60
backdrop-blur-xl
flex
items-center
justify-between
px-6
sticky
top-0
z-20
"
>





{/* MOBILE MENU */}

<button
className="
lg:hidden
p-2
rounded-lg
hover:bg-primary/10
"
>

<Menu size={22}/>

</button>






{/* SECURITY STATUS */}

<div
className="
hidden
md:flex
items-center
gap-3
"
>


<div
className="
flex
items-center
gap-2
px-3
py-2
rounded-lg
bg-green-500/10
text-green-500
text-sm
"
>


<ShieldCheck
size={17}
/>


Secure Connection


</div>


</div>








{/* RIGHT SIDE */}



<div
className="
flex
items-center
gap-5
"
>





{/* NOTIFICATION */}


<button

className="
relative
p-2
rounded-lg
hover:bg-primary/10
transition
"

>


<Bell size={20}/>


<span
className="
absolute
top-1
right-1
w-2
h-2
rounded-full
bg-primary
"
/>


</button>







{/* USER */}



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
rounded-full
bg-primary/20
flex
items-center
justify-center
"
>

<span
className="
font-semibold
text-primary
"
>

JD

</span>


</div>




<div
className="
hidden
sm:block
"
>


<p
className="
text-sm
font-medium
"
>

Client

</p>


<p
className="
text-xs
text-muted-foreground
"
>

SN-CLIENT-001

</p>


</div>



</div>



</div>





</header>


)

}