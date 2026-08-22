"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"


export default function AnonymousRequestPage(){

const router = useRouter()


const [loading,setLoading]=useState(false)
const [message,setMessage]=useState("")


const [form,setForm]=useState({

serviceType:"",
description:"",
timeline:"",
contact:"",
email:""

})




function update(
e:React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
){

setForm({

...form,

[e.target.name]:e.target.value

})

}







async function submit(){


setLoading(true)

setMessage("")



const res = await fetch(
"/api/requests",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(form)

}

)



const data = await res.json()



setLoading(false)




if(!res.ok){

setMessage(data.error)

return

}




// move to tracking page

router.push(
`/status/${data.token}`
)



}






return (

<main className="min-h-screen bg-transparent text-white p-8">


<div className="max-w-xl mx-auto space-y-6">


<h1 className="text-3xl font-mono text-primary">
Anonymous Intelligence Request
</h1>


<p className="text-white/50">
Submit your request securely without creating an account.
</p>





<select

name="serviceType"

className="w-full bg-black border p-3"

onChange={update}

>

<option value="">
Select Service
</option>


<option>
OSINT Investigation
</option>


<option>
Digital Forensics
</option>


<option>
Background Investigation
</option>


<option>
Cybersecurity Assessment
</option>


</select>







<textarea

name="description"

placeholder="Describe your case..."

className="w-full bg-black border p-3 h-40"

onChange={update}

/>







<input

name="timeline"

placeholder="Expected timeline"

className="w-full bg-black border p-3"

onChange={update}

/>







<input

name="email"

placeholder="Email for communication"

className="w-full bg-black border p-3"

onChange={update}

/>







<input

name="contact"

placeholder="Preferred contact method"

className="w-full bg-black border p-3"

onChange={update}

/>







<button

onClick={submit}

disabled={loading}

className="bg-primary text-black px-6 py-3 rounded"

>

{
loading
?
"Submitting..."
:
"Submit Request"
}

</button>




{
message &&

<p className="text-red-500">

{message}

</p>

}



</div>


</main>

)

}
