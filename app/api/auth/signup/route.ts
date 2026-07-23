import { supabaseAdmin } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"


export async function POST(
request: NextRequest
){

try{


const {
email,
username,
password
}
=
await request.json()



if(
!email ||
!username ||
!password ||
password.length < 8
){

return NextResponse.json(
{
error:"Username, email and password required"
},
{
status:400
}
)

}




// CREATE SUPABASE AUTH USER

const {
data:authData,
error:authError
}
=
await supabaseAdmin.auth.admin.createUser({

email,

password,

email_confirm:true

})




if(authError){

return NextResponse.json(
{
error:authError.message
},
{
status:400
}
)

}



if(!authData.user){

return NextResponse.json(
{
error:"User creation failed"
},
{
status:500
}
)

}




// CREATE PROFILE


const {
error:profileError
}
=
await supabaseAdmin
.from("profiles")
.insert({

id:authData.user.id,

email,

username,

full_name:username,

role:"client"

})




if(profileError){


console.error(
profileError
)


return NextResponse.json(
{
error:profileError.message
},
{
status:500
}
)

}





return NextResponse.json(
{
success:true,
user:authData.user
},
{
status:201
}
)



}

catch(error){

console.error(error)


return NextResponse.json(
{
error:"Signup failed"
},
{
status:500
}
)

}


}