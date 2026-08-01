"use client"

export type Update = {
 id:string
 title:string
 content:string | null
 update_type:string
 created_at:string
}


export default function TimelinePanel({
updates
}:{
updates:Update[]
}){


return (

<div className="rounded-md border border-[#143b28] bg-[#06110f]">


<div className="border-b border-[#143b28] p-5">

<h2 className="font-semibold text-white">
Investigation Timeline
</h2>

</div>



<div className="space-y-6 p-5">


{
updates.map((item)=>(


<div
key={item.id}
className="relative border-l border-[#20dc73]/40 pl-5"
>


<div className="absolute -left-[6px] top-1 h-3 w-3 rounded-full bg-[#20dc73]"/>


<h3 className="font-semibold text-white">
{item.title}
</h3>


<p className="mt-1 text-sm text-white/50">
{item.content}
</p>


<p className="mt-2 text-xs text-white/30">

{
new Date(
item.created_at
)
.toLocaleString()
}

</p>


</div>


))

}



</div>


</div>

)

}