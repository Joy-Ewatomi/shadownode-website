import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"



export async function GET(
_request:NextRequest
){


try{


const supabase =
await createClient()






// Get current user

const {
data:{
user
}

}
=
await supabase.auth.getUser()





if(!user){


return NextResponse.json(
{
error:"Unauthorized"
},
{
status:401
}
)

}








// Check admin role


const {
data:profile,
error:profileError
}

=
await supabase

.from("profiles")

.select("role")

.eq(
"id",
user.id
)

.single()






if(
profileError ||
profile?.role !== "admin"
){


return NextResponse.json(

{
error:"Forbidden"
},

{
status:403
}

)

}









// Fetch requests


const {
data,
error
}

=
await supabase

.from("requests")

.select(`
id,
case_number,
service_type,
description,
status,
progress,
budget,
final_price,
client_email,
is_anonymous,
created_at
`)

.order(
"created_at",
{
ascending:false
}
)








if(error){


console.error(
"Database error:",
error
)


return NextResponse.json(

{
error:"Failed to fetch requests"
},

{
status:500
}

)

}







return NextResponse.json(
data || []
)





}

catch(error){


console.error(
"Admin API error:",
error
)


return NextResponse.json(

{
error:"Server error"
},

{
status:500
}

)

}


}