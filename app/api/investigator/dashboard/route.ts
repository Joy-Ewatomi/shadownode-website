import {NextResponse} from "next/server"
import {query} from "@/lib/db"



export async function GET(){


try{


// temporary logged in user
// replace with session later

const userId =
"110a2365-4d00-4ab6-b48c-c1491b40a67c"





const profile =
await query(
`
SELECT id

FROM user_profiles

WHERE user_id=$1

LIMIT 1

`,
[
userId
]

)



if(!profile.rows.length){

return NextResponse.json(
{
error:"Profile not found"
},
{
status:404
}
)

}



const profileId =
profile.rows[0].id






const cases =
await query(
`

SELECT

c.id,
c.case_number,
c.title,
c.description,
c.service_type,
c.status,
c.priority,
c.progress,
c.created_at


FROM cases c


JOIN case_assignments ca

ON ca.case_id=c.id


WHERE ca.assigned_to=$1

AND ca.removed_at IS NULL


ORDER BY c.created_at DESC


`,
[
profileId
]

)






const evidence =
await query(
`

SELECT

COUNT(*)::int AS total


FROM forensic_files f


JOIN cases c

ON c.id=f.case_id


JOIN case_assignments ca

ON ca.case_id=c.id


WHERE ca.assigned_to=$1


`,
[
profileId
]

)






const reports =
await query(
`

SELECT

COUNT(*)::int AS total


FROM case_reports r


JOIN cases c

ON c.id=r.case_id


JOIN case_assignments ca

ON ca.case_id=c.id


WHERE ca.assigned_to=$1


`,
[
profileId
]

)






return NextResponse.json({

cases:cases.rows,


stats:{

evidence:evidence.rows[0].total,

reports:reports.rows[0].total

}


})





}catch(error){


console.error(
"INVESTIGATOR DASHBOARD ERROR",
error
)



return NextResponse.json(
{
error:"Dashboard failed"
},
{
status:500
}
)


}


}