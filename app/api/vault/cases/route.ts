import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"



export async function GET(
request: NextRequest
) {


try{


const supabase = supabaseAdmin



// Get logged in user

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






// Fetch only user's cases


const {
data,
error
}
=
await supabase

.from("requests")

.select(
`
id,
case_number,
service_type,
status,
progress,
created_at,
final_price
`
)

.eq(
"user_id",
user.id
)

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
error:"Failed to fetch cases"
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
"API error:",
error
)


return NextResponse.json(

{
error:"Failed to process request"
},

{
status:500
}

)

}



}
