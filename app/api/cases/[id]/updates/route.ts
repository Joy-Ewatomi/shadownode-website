import {NextRequest, NextResponse} from "next/server"
import {query} from "@/lib/db"



export async function GET(
req:Request,
context:{
params:Promise<{
id:string
}>
}
){


try{


const {id}=await context.params



const result =
await query(
`

SELECT

cu.id,
cu.update_type,
cu.title,
cu.content,
cu.created_at,

u.username


FROM case_updates cu


LEFT JOIN user_profiles up
ON up.id=cu.updated_by


LEFT JOIN app_users u
ON u.id=up.user_id


WHERE cu.case_id=$1


ORDER BY cu.created_at DESC


`,
[
id
]

)



return NextResponse.json(
result.rows
)



}catch(error){


console.error(
"CASE UPDATES ERROR",
error
)


return NextResponse.json(
{
error:"Failed loading updates"
},
{
status:500
}
)


}


}









export async function POST(
req:NextRequest,
context:{
params:Promise<{
id:string
}>
}
){


try{


const {id}=await context.params


const body =
await req.json()



const {
title,
content,
update_type
}=body





const result =
await query(
`

INSERT INTO case_updates

(
case_id,
update_type,
title,
content
)


VALUES

(
$1,
$2,
$3,
$4
)


RETURNING *

`,
[
id,
update_type ?? "progress",
title,
content
]

)




return NextResponse.json(
result.rows[0],
{
status:201
}
)



}catch(error){


console.error(
"CREATE UPDATE ERROR",
error
)


return NextResponse.json(
{
error:"Failed creating update"
},
{
status:500
}
)


}


}