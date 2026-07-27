"use client"

import {
  useCallback,
  useEffect,
  useState
} from "react"

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node
} from "reactflow"

import { X } from "lucide-react"

import "reactflow/dist/style.css"

import { useParams } from "next/navigation"



const nodeStyle = {
  background:"#06110f",
  color:"#20dc73",
  border:"1px solid #20dc73",
  padding:"15px",
  borderRadius:"8px",
  whiteSpace:"pre-line"
}



export default function InvestigationGraphPage(){


const params = useParams()

const caseId = params.id as string



const [nodes,setNodes] = useState<Node[]>([])

const [edges,setEdges] = useState<Edge[]>([])

const [loading,setLoading] = useState(true)



const [showEntityPanel,setShowEntityPanel] = useState(false)

const [showRelationshipPanel,setShowRelationshipPanel] = useState(false)



// ENTITY

const [
entityName,
setEntityName
]=useState("")


const [
entityType,
setEntityType
]=useState("PERSON")


const [
description,
setDescription
]=useState("")


const [
confidence,
setConfidence
]=useState(50)



// RELATIONSHIP

const [
source,
setSource
]=useState("")


const [
target,
setTarget
]=useState("")


const [
relationshipType,
setRelationshipType
]=useState("")


const [
relationshipDescription,
setRelationshipDescription
]=useState("")







async function loadGraph(){


try{


const [
entityRes,
relationRes
]=await Promise.all([

fetch(
`/api/cases/${caseId}/graph/entities`
),

fetch(
`/api/cases/${caseId}/graph/relationships`
)

])



const entityPayload =
await entityRes.json()


const relationPayload =
await relationRes.json()



const entities = Array.isArray(entityPayload)
? entityPayload
: []



const relationships = Array.isArray(relationPayload)
? relationPayload
: []





const graphNodes:Node[] = entities.map(
(entity:any,index:number)=>(

{

id:String(entity.id),

position:{
x:150+(index*200),
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





const graphEdges:Edge[] =
relationships.map(
(rel:any,index:number)=>(

{

id:String(
rel.id ?? `edge-${index}`
),

source:String(
rel.source_entity_id
),

target:String(
rel.target_entity_id
),

label:
rel.relationship_type

}

)

)




setNodes(graphNodes)

setEdges(graphEdges)



}

catch(error){

console.error(
"GRAPH ERROR",
error
)

setNodes([])

setEdges([])

}


finally{

setLoading(false)

}


}






useEffect(()=>{


if(caseId){

loadGraph()

}


},[caseId])








const onConnect = useCallback(

(connection:Connection)=>{


setEdges(current=>

addEdge(
{
...connection,
id:`edge-${Date.now()}`
},
current
)

)


},

[]


)









async function createEntity(){


if(!entityName){

alert(
"Entity name required"
)

return

}



const response =
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

verification_status:
"unverified"

})

}

)



if(!response.ok){

alert(
"Entity creation failed"
)

return

}



await loadGraph()



setEntityName("")

setDescription("")

setConfidence(50)

setShowEntityPanel(false)


}









async function createRelationship(){



if(
!source ||
!target ||
!relationshipType
){

alert(
"Complete relationship information"
)

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

relationship_type:relationshipType,

description:relationshipDescription,

confidence_score:50,

verification_status:
"unverified"

})

}

)




if(!response.ok){

alert(
"Relationship creation failed"
)

return

}




await loadGraph()



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





<header className="
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
text-white/50
text-sm
">

Entity Relationship Intelligence

</p>


</div>



<div className="
flex
gap-3
">


<button

onClick={()=>setShowEntityPanel(true)}

className="
bg-[#20dc73]
text-black
px-4
py-2
rounded
font-bold
"

>

+ Entity

</button>




<button

onClick={()=>setShowRelationshipPanel(true)}

className="
border
border-[#20dc73]
text-[#20dc73]
px-4
py-2
rounded
"

>

+ Relationship

</button>


</div>


</header>







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









{showEntityPanel && (

<div className="
absolute
right-5
top-20
w-96
bg-[#06110f]
border
border-[#123a2d]
rounded-lg
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

className="
w-full
mb-3
bg-black
border
border-[#123a2d]
p-2
rounded
"

placeholder="Entity name"

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

className="
w-full
mb-3
bg-black
border
border-[#123a2d]
p-2
rounded
"

placeholder="Description"

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
py-2
rounded
font-bold
"

>

Save Entity

</button>


</div>

)}









{showRelationshipPanel && (

<div className="
absolute
right-5
top-20
w-96
bg-[#06110f]
border
border-[#123a2d]
rounded-lg
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

className="w-full mb-3 bg-black p-2"

value={source}

onChange={
e=>setSource(e.target.value)
}

>


<option value="">
Source Entity
</option>


{

nodes.map(node=>(

<option
key={node.id}
value={node.id}
>

{String(node.data.label)}

</option>

))

}


</select>







<select

className="w-full mb-3 bg-black p-2"

value={target}

onChange={
e=>setTarget(e.target.value)
}

>


<option value="">
Target Entity
</option>


{

nodes.map(node=>(

<option
key={node.id}
value={node.id}
>

{String(node.data.label)}

</option>

))

}


</select>








<select

className="w-full mb-3 bg-black p-2"

value={relationshipType}

onChange={
e=>setRelationshipType(e.target.value)
}

>


<option value="">
Relationship
</option>

<option>
works_for
</option>

<option>
owns
</option>

<option>
associated_with
</option>

<option>
communicated_with
</option>

<option>
financial_connection
</option>

<option>
located_at
</option>

<option>
alias_of
</option>


</select>





<textarea

className="w-full mb-3 bg-black p-2"

placeholder="Analyst notes"

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
py-2
rounded
font-bold
"

>

Save Relationship

</button>


</div>

)}





</div>

)

}