"use client"

import { useCallback, useEffect, useState } from "react"

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node,
} from "reactflow"

import { X } from "lucide-react"

import "reactflow/dist/style.css"

import { useParams } from "next/navigation"



export default function InvestigationGraphPage(){


const params = useParams()

const caseId = params.id as string



const [nodes,setNodes] = useState<Node[]>([])

const [edges,setEdges] = useState<Edge[]>([])


const [loading,setLoading] = useState(true)



const [showEntityPanel,setShowEntityPanel] = useState(false)

const [showRelationshipPanel,setShowRelationshipPanel] = useState(false)



// ENTITY FORM

const [entityName,setEntityName] = useState("")

const [entityType,setEntityType] = useState("PERSON")

const [description,setDescription] = useState("")

const [confidence,setConfidence] = useState(50)



// RELATIONSHIP FORM

const [source,setSource] = useState("")

const [target,setTarget] = useState("")

const [relationshipType,setRelationshipType] = useState("")

const [relationshipDescription,setRelationshipDescription] = useState("")





const nodeStyle = {

background:"#06110f",

color:"#20dc73",

border:"1px solid #20dc73",

padding:"15px",

borderRadius:"8px",

whiteSpace:"pre-line"

}





useEffect(()=>{


async function loadGraph(){


try{


const entityRes =
await fetch(
`/api/cases/${caseId}/graph/entities`
)


const relationRes =
await fetch(
`/api/cases/${caseId}/graph/relationships`
)



const entities =
await entityRes.json()


const relationships =
await relationRes.json()




setNodes(

entities.map(
(entity:any,index:number)=>(

{

id:entity.id,


position:{
x:150+(index*180),
y:150+(index%3)*150
},


data:{
label:
`${entity.name}\n${entity.entity_type}`
},


style:nodeStyle


}

)

)

)



setEdges(

relationships.map(
(rel:any)=>(

{

id:rel.id,

source:rel.source_entity_id,

target:rel.target_entity_id,

label:rel.relationship_type

}

)

)

)



}

catch(error){

console.log(error)

}

finally{

setLoading(false)

}


}


if(caseId){

loadGraph()

}


},[caseId])







const onConnect = useCallback(

(connection:Connection)=>{


setEdges(
(current)=>
addEdge(connection,current)
)

},

[]


)









async function createEntity(){



if(!entityName){

alert("Entity name required")

return

}



const res =
await fetch(
`/api/cases/${caseId}/graph/entities`,
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

entity_type:entityType,

name:entityName,

description,

confidence_score:Number(confidence),

verification_status:"unverified"

})

}

)




const entity =
await res.json()




setNodes(current=>[

...current,


{

id:entity.id,


position:{
x:Math.random()*600,
y:Math.random()*400
},


data:{
label:
`${entity.name}\n${entity.entity_type}`
},


style:nodeStyle


}


])



setEntityName("")

setDescription("")

setConfidence(50)

setShowEntityPanel(false)


}










async function createRelationship(){



if(!source || !target || !relationshipType){

alert("Complete relationship information")

return

}




const res =
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

relationship_type:relationshipType,

description:relationshipDescription,

confidence_score:50,

verification_status:"unverified"

})


}

)




const relationship =
await res.json()




setEdges(current=>[

...current,


{

id:relationship.id,

source:relationship.source_entity_id,

target:relationship.target_entity_id,

label:relationship.relationship_type

}


])



setSource("")

setTarget("")

setRelationshipType("")

setRelationshipDescription("")


setShowRelationshipPanel(false)


}







if(loading){


return (

<div className="
h-screen
flex
items-center
justify-center
bg-[#000604]
text-[#20dc73]
">

Loading Investigation Graph...

</div>

)


}






return (

<div className="
relative
h-screen
bg-[#000604]
text-white
">





<div className="
flex
justify-between
items-center
border-b
border-[#123a2d]
p-4
">



<div>

<h1 className="
text-xl
font-bold
text-[#20dc73]
">

Investigation Graph

</h1>


<p className="
text-sm
text-white/50
">

Entity Relationship Intelligence

</p>


</div>




<div className="flex gap-3">


<button

onClick={()=>setShowEntityPanel(true)}

className="
rounded
bg-[#20dc73]
px-4
py-2
font-bold
text-black
"

>

+ Entity

</button>




<button

onClick={()=>setShowRelationshipPanel(true)}

className="
rounded
border
border-[#20dc73]
px-4
py-2
text-[#20dc73]
"

>

+ Relationship

</button>



</div>



</div>






<div className="
h-[calc(100vh-80px)]
">


<ReactFlow

nodes={nodes}

edges={edges}

onConnect={onConnect}

fitView

>


<Background/>

<Controls/>

<MiniMap/>


</ReactFlow>


</div>









{
showEntityPanel &&


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
">


<div className="
flex
justify-between
mb-4
">


<h2 className="
text-[#20dc73]
font-bold
">

Create Entity

</h2>


<button
onClick={()=>setShowEntityPanel(false)}
>

<X/>

</button>


</div>






<input

placeholder="Entity name"

className="
w-full
mb-3
bg-black
border
border-[#123a2d]
p-2
rounded
"

value={entityName}

onChange={
e=>setEntityName(e.target.value)
}

/>






<select

className="
w-full
mb-3
bg-black
border
border-[#123a2d]
p-2
rounded
"

value={entityType}

onChange={
e=>setEntityType(e.target.value)
}

>


<option>PERSON</option>

<option>ORGANIZATION</option>

<option>LOCATION</option>

<option>EMAIL</option>

<option>PHONE</option>

<option>USERNAME</option>

<option>DOCUMENT</option>


</select>







<textarea

placeholder="Description"

className="
w-full
mb-3
bg-black
border
border-[#123a2d]
p-2
rounded
"

value={description}

onChange={
e=>setDescription(e.target.value)
}

/>






<button

onClick={createEntity}

className="
w-full
bg-[#20dc73]
text-black
font-bold
py-2
rounded
"

>

Save Entity

</button>


</div>


}









{
showRelationshipPanel &&


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
">



<div className="
flex
justify-between
mb-4
">


<h2 className="
text-[#20dc73]
font-bold
">

Create Relationship

</h2>


<button

onClick={()=>setShowRelationshipPanel(false)}

>

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
p-2
"

value={relationshipType}

onChange={
e=>setRelationshipType(e.target.value)
}

>


<option value="">

Relationship

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

financial_connection

</option>


<option>

alias_of

</option>


</select>








<textarea

placeholder="Analyst notes"

className="
w-full
mb-3
bg-black
border
border-[#123a2d]
p-2
"

value={relationshipDescription}

onChange={
e=>setRelationshipDescription(e.target.value)
}


/>






<button

onClick={createRelationship}

className="
w-full
bg-[#20dc73]
text-black
font-bold
py-2
rounded
"

>

Save Relationship

</button>




</div>


}





</div>


)


}