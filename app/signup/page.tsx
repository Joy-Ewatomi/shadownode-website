"use client"

import { useState } from "react"


export default function Signup(){

const [username,setUsername]=useState("")
const [email,setEmail]=useState("")
const [password,setPassword]=useState("")

const [message,setMessage]=useState("")


async function signup(){


const res = await fetch("/api/auth/signup",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

username,
email,
password

})

})


const data = await res.json()


if(!res.ok){

setMessage(data.error)

return

}


setMessage("Account created successfully")


}




return (

<div className="p-10 space-y-5 max-w-md">


<h1 className="text-3xl font-bold">
Create Account
</h1>



<input

className="border p-3 w-full"

placeholder="Username"

value={username}

onChange={
e=>setUsername(e.target.value)
}

/>




<input

className="border p-3 w-full"

placeholder="Email"

type="email"

value={email}

onChange={
e=>setEmail(e.target.value)
}

/>




<input

className="border p-3 w-full"

placeholder="Password"

type="password"

value={password}

onChange={
e=>setPassword(e.target.value)
}

/>




<button

className="
bg-black
text-white
p-3
rounded
w-full
"

onClick={signup}

>

Create Account

</button>




<p>
{message}
</p>


</div>

)

}