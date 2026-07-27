"use client"


type Props={
onAdd:()=>void
}


export default function GraphToolbar({
onAdd
}:Props){


return (

<div className="
absolute
top-5
left-5
z-10
flex
gap-3
">


<button
onClick={onAdd}
className="
rounded
bg-[#20dc73]
px-4
py-2
text-black
font-bold
">

+ Add Entity

</button>



<button

className="
rounded
border
border-[#20dc73]/40
bg-[#06100c]
px-4
py-2
text-white
">

AI Scan

</button>


</div>

)

}