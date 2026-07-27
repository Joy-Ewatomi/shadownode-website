"use client"

import {useEffect, useState} from "react"


type User = {

id:string
username:string
email:string
role:string
status:string
display_name?:string
created_at:string

}



export default function UsersAdminPage(){


const [users,setUsers]=useState<User[]>([])

const [loading,setLoading]=useState(true)


const [form,setForm]=useState({

username:"",
email:"",
password:"",
role:"investigator"

})





async function loadUsers(){


try{


const res =
await fetch(
"/api/admin/users"
)


const data =
await res.json()


setUsers(data)



}catch(error){

console.error(error)

}

finally{

setLoading(false)

}


}





useEffect(()=>{

loadUsers()

},[])







async function createUser(){



const res =
await fetch(
"/api/admin/users",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(form)

}

)




const data =
await res.json()



if(!res.ok){

alert(data.error)

return

}



alert(
"Employee created"
)



setForm({

username:"",
email:"",
password:"",
role:"investigator"

})



loadUsers()


}








async function updateUser(
id:string,
role:string,
status:string
){


await fetch(
"/api/admin/users",
{

method:"PATCH",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

user_id:id,
role,
status

})

}

)


loadUsers()


}







if(loading){

return (

<div className="
min-h-screen
bg-[#020604]
text-[#20dc73]
flex
items-center
justify-center
">

Loading Users...

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

Employee Management

</h1>


<p className="
text-white/50
mt-2
">

Create and manage ShadowNode personnel

</p>






<div className="
mt-8
border
border-[#143b28]
bg-[#06110f]
rounded-xl
p-6
">


<h2 className="
text-xl
font-bold
mb-5
">

Create Employee

</h2>



<div className="
grid
grid-cols-4
gap-4
">



<input

placeholder="Username"

className="
bg-black
border
border-[#143b28]
p-3
rounded
"

value={form.username}

onChange={
e=>setForm({
...form,
username:e.target.value
})
}

/>




<input

placeholder="Email"

className="
bg-black
border
border-[#143b28]
p-3
rounded
"

value={form.email}

onChange={
e=>setForm({
...form,
email:e.target.value
})
}

/>






<input

placeholder="Password"

type="password"

className="
bg-black
border
border-[#143b28]
p-3
rounded
"

value={form.password}

onChange={
e=>setForm({
...form,
password:e.target.value
})
}

/>






<select

className="
bg-black
border
border-[#143b28]
p-3
rounded
"

value={form.role}

onChange={
e=>setForm({
...form,
role:e.target.value
})
}

>


<option value="investigator">
Investigator
</option>


<option value="analyst">
Analyst
</option>


<option value="administrator">
Administrator
</option>


<option value="super_administrator">
Super Administrator
</option>


</select>



</div>





<button

onClick={createUser}

className="
mt-5
bg-[#20dc73]
text-black
font-bold
px-6
py-3
rounded
"

>

Create Employee

</button>




</div>









<div className="
mt-8
space-y-4
">


{

users.map(user=>(


<div

key={user.id}

className="
border
border-[#143b28]
bg-[#06110f]
rounded-xl
p-5
flex
justify-between
items-center
"


>



<div>


<h3 className="
font-bold
text-[#20dc73]
">

{user.username}

</h3>


<p className="
text-white/50
">

{user.email}

</p>


<p className="
text-sm
mt-2
">

Role: {user.role}

</p>


<p className="
text-sm
">

Status: {user.status}

</p>


</div>







<div className="
flex
gap-3
">


<select

className="
bg-black
border
border-[#143b28]
p-2
rounded
"

defaultValue={user.role}

onChange={
e=>
updateUser(
user.id,
e.target.value,
user.status
)
}

>

<option value="client">
Client
</option>


<option value="investigator">
Investigator
</option>


<option value="analyst">
Analyst
</option>


<option value="administrator">
Administrator
</option>


<option value="super_administrator">
Super Admin
</option>


</select>





<select

className="
bg-black
border
border-[#143b28]
p-2
rounded
"

defaultValue={user.status}

onChange={
e=>
updateUser(
user.id,
user.role,
e.target.value
)
}

>


<option>
active
</option>


<option>
suspended
</option>


<option>
deleted
</option>


</select>



</div>






</div>


))


}


</div>






</div>

)

}