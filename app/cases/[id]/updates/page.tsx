"use client"


import {
useEffect,
useState
} from "react"

import {useParams} from "next/navigation"





export default function CaseUpdates(){


const params=useParams()

const caseId=params.id as string



const [updates,setUpdates]=useState<any[]>([])

const [title,setTitle]=useState("")

const [content,setContent]=useState("")





async function load(){


const res=
await fetch(
`/api/cases/${caseId}/updates`
)


const data=
await res.json()


setUpdates(data)


}





useEffect(()=>{

load()

},[])







async function createUpdate(){


await fetch(
`/api/cases/${caseId}/updates`,
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

title,

content,

update_type:"progress"

})

}

)



setTitle("")

setContent("")

load()


}







return (

<div className="
bg-[#020604]
min-h-screen
text-white
p-6
">



<h1 className="
text-2xl
font-bold
text-[#20dc73]
">

Investigation Updates

</h1>





<div className="
mt-6
bg-[#06110f]
border
border-[#143b28]
rounded-xl
p-5
">


<input

className="
w-full
bg-black
border
border-[#143b28]
p-3
rounded
mb-3
"

placeholder="Update title"

value={title}

onChange={
e=>setTitle(e.target.value)
}

/>





<textarea

className="
w-full
bg-black
border
border-[#143b28]
p-3
rounded
h-32
"

placeholder="Describe investigation progress..."

value={content}

onChange={
e=>setContent(e.target.value)
}

/>






<button

onClick={createUpdate}

className="
mt-4
bg-[#20dc73]
text-black
font-bold
px-5
py-2
rounded
"

>

Add Update

</button>



</div>







<div className="
mt-8
space-y-4
">


{
updates.map(
(update)=>(


<div

key={update.id}

className="
bg-[#06110f]
border
border-[#143b28]
rounded-xl
p-5
"


>


<h2 className="
text-[#20dc73]
font-bold
">

{update.title}

</h2>


<p className="
mt-2
text-white/80
">

{update.content}

</p>


<p className="
text-sm
text-white/40
mt-3
">

{update.created_at}

</p>


</div>


)

)

}


</div>






</div>

)

}