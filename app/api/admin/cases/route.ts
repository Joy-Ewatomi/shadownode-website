import {NextRequest, NextResponse} from "next/server"
import {query} from "@/lib/db"



// GET CASES + STAFF

export async function GET(){


try{


const cases = await query(
`
SELECT

c.id,
c.case_number,
c.title,
c.service_type,
c.status,
c.priority,
c.created_at,


json_agg(
json_build_object(
'id',u.id,
'username',u.username,
'role',u.role
)
)
FILTER(
WHERE u.id IS NOT NULL
)
AS assigned_users


FROM cases c


LEFT JOIN case_assignments ca
ON ca.case_id=c.id
AND ca.removed_at IS NULL


LEFT JOIN user_profiles up
ON up.id=ca.assigned_to


LEFT JOIN app_users u
ON u.id=up.user_id



GROUP BY c.id

ORDER BY c.created_at DESC

`
)



const staff = await query(
`
SELECT

u.id,
u.username,
u.email,
u.role

FROM app_users u

WHERE u.role IN
(
'investigator',
'analyst'
)

AND u.status='active'

ORDER BY u.username

`
)



return NextResponse.json({

cases:cases.rows,

staff:staff.rows

})



}catch(error){


console.error(
"ADMIN CASE ERROR",
error
)


return NextResponse.json(
{
error:"Failed loading cases"
},
{
status:500
}
)


}



}








// ASSIGN STAFF

export async function POST(
req:NextRequest
){


try{


const body =
await req.json()



const {
case_id,
user_id
}=body




if(
!case_id ||
!user_id
){

return NextResponse.json(
{
error:"Missing data"
},
{
status:400
}
)

}




// get profile id

const profile =
await query(
`
SELECT id

FROM user_profiles

WHERE user_id=$1

LIMIT 1

`,
[
user_id
]
)



if(!profile.rows.length){

return NextResponse.json(
{
error:"User profile missing"
},
{
status:404
}
)

}





await query(
`
INSERT INTO case_assignments
(
case_id,
assigned_to
)

VALUES
(
$1,
$2
)

`,
[
case_id,
profile.rows[0].id
]

)





return NextResponse.json(
{
message:"Assigned successfully"
}
)



}catch(error){


console.error(
"ASSIGN ERROR",
error
)


return NextResponse.json(
{
error:"Assignment failed"
},
{
status:500
}
)



}

}