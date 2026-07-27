import { NextResponse } from "next/server"
import { query } from "@/lib/db"


function isUuid(value:string){

return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

}



async function resolveCaseId(caseId:string){

if(isUuid(caseId)){
return caseId
}


const result = await query(
`
SELECT id
FROM cases
WHERE case_number=$1
LIMIT 1
`,
[caseId]
)


return result.rows[0]?.id ?? null

}




export async function GET(
request:Request,
context:{
params:Promise<{
id:string
}>
}
){

try{


const {id}=await context.params


const caseId = await resolveCaseId(id)



if(!caseId){

return NextResponse.json(
{
error:"Case not found"
},
{
status:404
}
)

}





const [
entities,
relationships,
files,
updates,
notes,
assignments
] = await Promise.all([


query(
`
SELECT COUNT(*)::int AS count
FROM investigation_entities
WHERE case_id=$1
`,
[caseId]
),



query(
`
SELECT COUNT(*)::int AS count
FROM entity_relationships
WHERE case_id=$1
`,
[caseId]
),



query(
`
SELECT COUNT(*)::int AS count
FROM forensic_files
WHERE case_id=$1
`,
[caseId]
),



query(
`
SELECT COUNT(*)::int AS count
FROM case_updates
WHERE case_id=$1
`,
[caseId]
),



query(
`
SELECT COUNT(*)::int AS count
FROM case_notes
WHERE case_id=$1
`,
[caseId]
),



query(
`
SELECT 
COUNT(*)::int AS count
FROM case_assignments
WHERE case_id=$1
AND removed_at IS NULL
`,
[caseId]
)


])







return NextResponse.json({

case_id:caseId,


statistics:{


entities:
entities.rows[0].count,


relationships:
relationships.rows[0].count,


evidence:
files.rows[0].count,


updates:
updates.rows[0].count,


notes:
notes.rows[0].count,


assigned_investigators:
assignments.rows[0].count


}


})



}catch(error){


console.error(
"DASHBOARD ERROR:",
error
)



return NextResponse.json(
{
error:"Failed to load dashboard"
},
{
status:500
}
)


}


}