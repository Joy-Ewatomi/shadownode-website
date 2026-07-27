import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import bcrypt from "bcryptjs"


// GET ALL USERS
export async function GET(){

try{


const result = await query(
`
SELECT

u.id,
u.username,
u.email,
u.status,
u.role,
u.created_at,

r.display_name

FROM app_users u

LEFT JOIN roles r
ON r.name = u.role

ORDER BY u.created_at DESC

`
)


return NextResponse.json(
result.rows
)



}catch(error){


console.error(
"GET USERS ERROR:",
error
)


return NextResponse.json(
{
error:"Failed loading users"
},
{
status:500
}
)


}

}








// CREATE EMPLOYEE USER
export async function POST(
req:NextRequest
){


try{


const body = await req.json()



const {
username,
email,
password,
role
}=body




if(
!username ||
!email ||
!password ||
!role
){

return NextResponse.json(
{
error:"Missing required fields"
},
{
status:400
}
)

}




const allowedRoles = [
"investigator",
"analyst",
"administrator",
"super_administrator",
"client"
]



if(!allowedRoles.includes(role)){


return NextResponse.json(
{
error:"Invalid role"
},
{
status:400
}
)


}




const existing = await query(
`

SELECT id

FROM app_users

WHERE email=$1
OR username=$2

`,
[
email,
username
]

)



if(existing.rows.length){

return NextResponse.json(
{
error:"User already exists"
},
{
status:409
}
)


}




const passwordHash =
await bcrypt.hash(
password,
12
)





const userResult = await query(
`

INSERT INTO app_users
(
username,
email,
password_hash,
status,
role
)

VALUES
(
$1,
$2,
$3,
'active',
$4
)

RETURNING

id,
username,
email,
role,
status

`,
[
username,
email,
passwordHash,
role
]

)





const user =
userResult.rows[0]






// Attach role permission system
const roleResult = await query(
`

SELECT id

FROM roles

WHERE name=$1

LIMIT 1

`,
[
role
]

)





if(roleResult.rows.length){


await query(
`

INSERT INTO user_roles
(
user_id,
role_id
)

VALUES
(
$1,
$2
)

ON CONFLICT DO NOTHING

`,
[
user.id,
roleResult.rows[0].id
]

)


}






return NextResponse.json(
{
message:"User created successfully",
user
},
{
status:201
}
)





}catch(error){


console.error(
"CREATE USER ERROR:",
error
)


return NextResponse.json(
{
error:"Failed creating user"
},
{
status:500
}
)


}


}









// UPDATE USER ROLE / STATUS
export async function PATCH(
req:NextRequest
){


try{


const body =
await req.json()



const {
user_id,
role,
status
}=body




if(!user_id){

return NextResponse.json(
{
error:"User id required"
},
{
status:400
}
)

}





if(role){


await query(
`

UPDATE app_users

SET role=$1,
updated_at=now()

WHERE id=$2

`,
[
role,
user_id
]

)



const roleData =
await query(
`

SELECT id

FROM roles

WHERE name=$1

`,
[
role
]

)



if(roleData.rows.length){


await query(
`

DELETE FROM user_roles

WHERE user_id=$1

`,
[
user_id
]

)



await query(
`

INSERT INTO user_roles
(
user_id,
role_id
)

VALUES
(
$1,
$2
)

`,
[
user_id,
roleData.rows[0].id
]

)


}



}





if(status){


await query(
`

UPDATE app_users

SET status=$1,
updated_at=now()

WHERE id=$2

`,
[
status,
user_id
]

)


}





return NextResponse.json(
{
message:"User updated"
}
)



}catch(error){


console.error(
"UPDATE USER ERROR:",
error
)


return NextResponse.json(
{
error:"Update failed"
},
{
status:500
}
)


}

}