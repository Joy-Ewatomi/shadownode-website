"use client"


import {
ReactFlow,
Background,
Controls,
MiniMap,
addEdge,
useNodesState,
useEdgesState,
type NodeTypes
} from "reactflow"


import "reactflow/dist/style.css"


import {useCallback} from "react"

import EntityNode from "./EntityNode"
import GraphToolbar from "./GraphToolbar"



const NODE_TYPES: NodeTypes = {
entity:EntityNode
}



export default function InvestigationGraph(){


const [nodes,setNodes,onNodesChange]=useNodesState([

{
id:"1",
type:"entity",

position:{
x:300,
y:200
},

data:{
label:"Carlos Rendon",
type:"Person",
status:"Confirmed",
confidence:95
}

}

])


const [edges,setEdges,onEdgesChange]=useEdgesState([])



const onConnect=useCallback(
(params:any)=>
setEdges((eds)=>addEdge(params,eds)),
[]
)



function addEntity(){


const id=String(nodes.length+1)


setNodes([
...nodes,

{
id,
type:"entity",

position:{
x:100 + nodes.length*80,
y:350
},

data:{
label:"New Entity",
type:"Unknown",
status:"Unverified",
confidence:0
}

}

])


}



return (

<div className="
relative
h-full
w-full
">


<GraphToolbar
onAdd={addEntity}
/>



<ReactFlow

nodes={nodes}
edges={edges}

nodeTypes={NODE_TYPES}

onNodesChange={onNodesChange}

onEdgesChange={onEdgesChange}

onConnect={onConnect}

fitView

>

<Background />

<Controls />

<MiniMap />

</ReactFlow>



</div>


)

}
