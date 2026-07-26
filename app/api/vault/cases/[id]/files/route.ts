import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"



export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id:string }> }
){


try{


const {
id
}
=
await params



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







// Verify case belongs to user


const {
data:caseData,
error:caseError
}
=
await supabase

.from("requests")

.select("id")

.eq(
"id",
id
)

.eq(
"user_id",
user.id
)

.single()






if(caseError || !caseData){


return NextResponse.json(
{
error:"Case not found"
},
{
status:404
}
)

}








// Fetch files


const {
data,
error
}
=
await supabase

.from("forensic_files")

.select(
`
id,
file_name,
file_type,
file_size,
uploaded_at
`
)

.eq(
"case_id",
id
)

.order(
"uploaded_at",
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
error:"Failed to fetch files"
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
