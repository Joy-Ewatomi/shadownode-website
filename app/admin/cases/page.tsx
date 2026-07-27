"use client"


import {
useEffect,
useState
} from "react"



export default function AdminCases(){


const [cases,setCases]=useState<any[]>([])

const [staff,setStaff]=useState<any[]>([])

const [loading,setLoading]=useState(true)





async function load(){


const res =
await fetch(
"/api/admin/cases"
)


const data =
await res.json()



setCases(data.cases)

setStaff(data.staff)

setLoading(false)


}




useEffect(()=>{

load()

},[])







async function assign(
caseId:string,
userId:string
){


await fetch(
"/api/admin/cases",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

case_id:caseId,

user_id:userId

})

}

)


alert(
"Assigned"
)


load()


}







if(loading){

return (

<div className="
bg-[#020604]
min-h-screen
text-[#20dc73]
flex
items-center
justify-center
">

Loading Cases...

</div>

)

}






return (

<div className="
min-h-screen
bg-[#020604]
text-white
p-8
">



<h1 className="
text-3xl
font-bold
text-[#20dc73]
">

Case Assignment Center

</h1>




<div className="
mt-8
space-y-5
">


{
cases.map(c=>(


<div

key={c.id}

className="
bg-[#06110f]
border
border-[#143b28]
rounded-xl
p-6
"


>


<div>

<h2 className="
text-xl
font-bold
text-[#20dc73]
">

{c.case_number}

</h2>


<p>

{c.title}

</p>


<p className="
text-white/50
">

Status: {c.status}

</p>


<p className="
text-white/50
">

Priority: {c.priority}

</p>


</div>





<div className="
mt-5
flex
gap-3
">


<select

className="
bg-black
border
border-[#143b28]
p-3
rounded
"

onChange={
e=>
assign(
c.id,
e.target.value
)
}

>


<option>
Assign employee
</option>


{
staff.map(s=>(


<option

key={s.id}

value={s.id}

>

{s.username} ({s.role})

</option>


))

}


</select>



</div>





</div>


))

}


</div>




</div>

)


}