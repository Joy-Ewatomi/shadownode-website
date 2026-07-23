import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'


const supabaseUrl =
process.env.NEXT_PUBLIC_SUPABASE_URL!


const supabaseKey =
process.env.SUPABASE_SERVICE_ROLE_KEY!



const supabase = createClient(
  supabaseUrl,
  supabaseKey
)





export async function GET(
request: NextRequest
) {


try {


const userId =
request.headers.get(
"x-user-id"
)





if(!userId){


return NextResponse.json(
{
error:"Unauthorized"
},
{
status:401
}
)


}







const {
data,
error
}
=
await supabase


.from("requests")


.select("*")


.eq(
"user_id",
userId
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