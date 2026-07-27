"use client"

import { useState } from "react"
import { X } from "lucide-react"


interface Props {

caseId:string

nodes:any[]

onCreated:(relationship:any)=>void

onClose:()=>void

}



export default function RelationshipPanel({
caseId,
nodes,
onCreated,
onClose
}:Props){



const [source,setSource]=useState("")
const [target,setTarget]=useState("")
const [type,setType]=useState("")

const [description,setDescription]=useState("")



async function createRelationship(){


if(!source || !target || !type){

alert("Fill all fields")

return

}



const response =
await fetch(
`/api/cases/${caseId}/graph/relationships`,
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

source_entity_id:source,

target_entity_id:target,

relationship_type:type,

description,

confidence_score:50,

verification_status:"unverified"


})

}

)



if(!response.ok){

alert("Failed")

return

}



const data =
await response.json()



onCreated(data)

onClose()


}





return (

<div className="
absolute
right-5
top-20
w-96
rounded-lg
border
border-[#123a2d]
bg-[#06110f]
p-5
shadow-xl
">


<div className="
flex
justify-between
mb-5
">


<h2 className="
font-bold
text-[#20dc73]
">

Create Relationship

</h2>


<button onClick={onClose}>

<X/>

</button>


</div>





<select

className="
w-full
mb-3
bg-black
border
border-[#123a2d]
rounded
p-2
"

value={source}

onChange={
e=>setSource(e.target.value)
}

>

<option>

Source Entity

</option>


{
nodes.map(node=>(

<option
key={node.id}
value={node.id}
>

{node.data.label}

</option>

))

}


</select>






<select

className="
w-full
mb-3
bg-black
border
border-[#123a2d]
rounded
p-2
"

value={target}

onChange={
e=>setTarget(e.target.value)
}

>

<option>

Target Entity

</option>


{
nodes.map(node=>(

<option
key={node.id}
value={node.id}
>

{node.data.label}

</option>

))

}


</select>







<select

className="
w-full
mb-3
bg-black
border
border-[#123a2d]
rounded
p-2
"

value={type}

onChange={
e=>setType(e.target.value)
}

>


<option value="">

Relationship Type

</option>


<option>

associated_with

</option>


<option>

owns

</option>


<option>

works_for

</option>


<option>

communicated_with

</option>


<option>

located_at

</option>


<option>

used_by

</option>


<option>

linked_to

</option>


<option>

alias_of

</option>


<option>

financial_connection

</option>


</select>







<textarea

className="
w-full
mb-3
bg-black
border
border-[#123a2d]
rounded
p-2
"

placeholder="Analyst notes"

value={description}

onChange={
e=>setDescription(e.target.value)
}


/>





<button

onClick={createRelationship}

className="
w-full
bg-[#20dc73]
text-black
font-bold
rounded
py-2
"

>

Save Relationship

</button>



</div>


)


}