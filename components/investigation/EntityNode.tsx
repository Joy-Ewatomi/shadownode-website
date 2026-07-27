"use client"

import { Handle, Position } from "reactflow"


type EntityNodeProps = {
 data:{
   label:string
   type:string
   status:string
   confidence:number
 }
}


export default function EntityNode({
data
}:EntityNodeProps){


return (

<div className="
w-52
rounded-lg
border
border-[#20dc73]/40
bg-[#06100c]
p-4
shadow-[0_0_30px_rgba(32,220,115,0.15)]
">


<Handle
type="target"
position={Position.Top}
/>



<h3 className="
font-bold
text-[#20dc73]
">

{data.label}

</h3>


<p className="
mt-2
text-xs
text-white/50
">

Type:
{data.type}

</p>


<div className="
mt-3
text-xs
">

Verification:

<span className="
ml-2
text-green-400
">

{data.status}

</span>


</div>


<div className="
mt-2
text-xs
text-white/60
">

Confidence:

{data.confidence}%

</div>



<Handle
type="source"
position={Position.Bottom}
/>


</div>

)

}