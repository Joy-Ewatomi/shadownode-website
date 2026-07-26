import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"



export async function GET(
_request:NextRequest
){


try{


const supabase = supabaseAdmin






// Get current user

const user = await getCurrentUser()





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








if (user.role !== "admin") {


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
