"use client"

import {useEffect,useState} from "react"


type Message={

id:string

username:string

sender_type:string

message:string

created_at:string

private:boolean

}



export default function MessagePanel({

caseId

}:{

caseId:string

}){


const [messages,setMessages]=useState<Message[]>([])

const [text,setText]=useState("")

const [loading,setLoading]=useState(false)



async function loadMessages(){

const res =
await fetch(
`/api/cases/${caseId}/messages`
)

const data =
await res.json()

setMessages(data)

}



useEffect(()=>{

loadMessages()

},[])




async function sendMessage(){


if(!text.trim())
return


setLoading(true)


await fetch(
`/api/cases/${caseId}/messages`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({

message:text,

private:false

})

}
)


setText("")

await loadMessages()

setLoading(false)


}




return (

<div className="rounded-md border border-[#143b28] bg-[#06110f]">


<div className="border-b border-[#143b28] p-4">

<h2 className="font-semibold text-white">

Case Communication

</h2>

</div>




<div className="h-[400px] space-y-3 overflow-y-auto p-5">


{
messages.map((msg)=>(


<div
key={msg.id}
className="rounded-md border border-[#143b28] bg-black/20 p-3"
>


<div className="flex justify-between">

<span className="text-sm font-semibold text-[#20dc73]">

{msg.username || msg.sender_type}

</span>


<span className="text-xs text-white/40">

{
new Date(
msg.created_at
)
.toLocaleString()
}

</span>


</div>


<p className="mt-2 text-sm text-white/70">

{msg.message}

</p>


</div>


))
}


</div>





<div className="border-t border-[#143b28] p-4 flex gap-3">


<input

value={text}

onChange={
e=>setText(e.target.value)
}

placeholder="Send message..."

className="
flex-1
rounded-md
border
border-[#143b28]
bg-black/30
px-3
py-2
text-white
"

/>


<button

onClick={sendMessage}

disabled={loading}

className="
rounded-md
bg-[#20dc73]
px-5
text-black
font-semibold
"

>

Send

</button>


</div>



</div>

)

}