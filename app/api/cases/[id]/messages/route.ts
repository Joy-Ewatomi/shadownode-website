import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"


export async function GET(
 request:NextRequest,
 {
 params
 }:{
 params:Promise<{id:string}>
 }
){

 try{

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


 const {id}=await params


 const result = await query(
 `
 SELECT
 m.id,
 m.case_id,
 m.sender_id,
 m.sender_type,
 m.message,
 m.encrypted_content,
 m.payload,
 m.created_at,
 m.read_at,

 u.username

 FROM messages m

 LEFT JOIN app_users u
 ON u.id=m.sender_id

 WHERE m.case_id=$1

 ORDER BY m.created_at ASC
 `,
 [
  id
 ]
 )


 return NextResponse.json(
  result.rows
 )


 }

 catch(error){

 console.error(
  "MESSAGES GET ERROR",
  error
 )

 return NextResponse.json(
 {
  error:"Failed loading messages"
 },
 {
  status:500
 }
 )

 }

}







export async function POST(
 request:NextRequest,
 {
 params
 }:{
 params:Promise<{id:string}>
 }
){

try{


const user =
await getCurrentUser()


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


const {id}=await params


const body =
await request.json()


const content =
String(body.message || "").trim()



if(!content){

return NextResponse.json(
{
error:"Message required"
},
{
status:400
}
)

}





await query(
`
INSERT INTO messages

(
case_id,
sender_id,
sender_type,
message,
encrypted_content,
payload,
event,
private,
created_at
)

VALUES

(
$1,
$2,
$3,
$4,
$5,
$6,
'message_created',
false,
NOW()
)

`,
[
id,
user.id,
user.role,
content,
null,
JSON.stringify({
source:"case_workspace"
})
]
)




return NextResponse.json(
{
success:true
},
{
status:201
}
)



}
catch(error){

console.error(
"MESSAGE POST ERROR",
error
)


return NextResponse.json(
{
error:"Failed sending message"
},
{
status:500
}
)


}

}