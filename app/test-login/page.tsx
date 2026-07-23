"use client"

import { createClient } from "@/lib/supabase/client"
import { useState } from "react"


export default function TestLogin(){


const supabase = createClient()


const [username,setUsername] = useState("")
const [password,setPassword] = useState("")

const [error,setError] = useState("")
const [loading,setLoading] = useState(false)



async function login(){


setError("")
setLoading(true)



try{


// STEP 1: FIND USER EMAIL FROM PROFILE


console.log(
"Searching username:",
username
)



const {
data:profile,
error:profileError

}=await supabase

.from("profiles")

.select(
"email, full_name, id"
)

.eq(
"full_name",
username.trim()
)

.single()



console.log(
"Profile result:",
profile
)



console.log(
"Profile error:",
profileError
)



if(profileError || !profile){


setError(
"Username not found"
)

return

}





// STEP 2: LOGIN WITH AUTH EMAIL


console.log(
"Logging in:",
profile.email
)



const {
data,
error:loginError

}=await supabase.auth.signInWithPassword({

email:profile.email,

password

})




console.log(
"Auth result:",
data
)



console.log(
"Auth error:",
loginError
)




if(loginError){


setError(
loginError.message
)

return

}





// STEP 3: VERIFY SESSION


const {
data:userData

}=await supabase.auth.getUser()



console.log(
"Current user:",
userData.user
)



console.log(
"LOGIN SUCCESS"
)



window.location.href="/dashboard"



}

catch(err){


console.error(
"Login crashed:",
err
)


setError(
"Something went wrong"
)


}

finally{


setLoading(false)


}



}





return (

<div
className="
min-h-screen
flex
items-center
justify-center
bg-gray-100
"
>


<div
className="
bg-white
p-10
rounded-xl
space-y-5
w-full
max-w-md
shadow
"
>


<h1
className="
text-2xl
font-bold
"
>

ShadowNode Test Login

</h1>



<input

className="
border
p-3
w-full
rounded
"

placeholder="Username"

value={username}

onChange={
e=>setUsername(e.target.value)
}

/>




<input

className="
border
p-3
w-full
rounded
"

placeholder="Password"

type="password"

value={password}

onChange={
e=>setPassword(e.target.value)
}

/>




<button

disabled={loading}

className="
bg-black
text-white
p-3
rounded
w-full
disabled:opacity-50
"

onClick={login}

>


{
loading
?
"Logging in..."
:
"Login"
}


</button>




{
error &&

<p
className="
text-red-500
"
>

{error}

</p>

}



</div>



</div>


)

}