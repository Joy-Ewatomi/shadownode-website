import { supabaseAdmin } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"


export async function POST(request:Request){

try{


const {
username,
password
}=await request.json()



if(!username || !password){

return NextResponse.json(
{
error:"Username and password required"
},
{
status:400
}
)

}




// FIND EMAIL USING USERNAME


const {
data:profile,
error:profileError
}
=
await supabaseAdmin
.from("profiles")
.select("email")
.eq("username",username)
.single()



if(profileError || !profile){

return NextResponse.json(
{
error:"Invalid username or password"
},
{
status:401
}
)

}




// LOGIN WITH SUPABASE AUTH


const supabase = await createClient()


const {
data,
error
}
=
await supabase.auth.signInWithPassword({

email:profile.email,

password

})





if(error){

return NextResponse.json(
{
error:"Invalid username or password"
},
{
status:401
}
)

}




return NextResponse.json({

success:true,

user:data.user

})


}

catch(error){

console.log(error)

return NextResponse.json(
{
error:"Login failed"
},
{
status:500
}
)

}


}