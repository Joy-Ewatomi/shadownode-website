import { NextResponse } from "next/server";
import { query } from "@/lib/db";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function resolveCaseId(caseId: string) {
  if (!caseId) {
    return null
  }

  if (isUuid(caseId)) {
    return caseId
  }

  const result = await query<{ id: string }>(
    `SELECT id FROM cases WHERE case_number = $1 OR id::text = $1 LIMIT 1`,
    [caseId]
  )

  return result.rows[0]?.id ?? null
}

export async function GET(
req:Request,
context:{
params:{id:string}
}
){

try {


const caseId=context.params.id;
const resolvedCaseId = await resolveCaseId(caseId);

if (!resolvedCaseId) {
  return NextResponse.json({ entities: [], relationships: [] }, { status: 200 });
}

const entities = await query(
`
SELECT
id,
name,
entity_type,
verification_status,
confidence_score

FROM investigation_entities

WHERE case_id=$1

`,
[resolvedCaseId]
);



const relationships = await query(

`
SELECT

id,
source_entity_id,
target_entity_id,
relationship_type,
confidence_score

FROM entity_relationships

WHERE case_id=$1

`,
[resolvedCaseId]

);



return NextResponse.json({

entities:entities.rows,

relationships:relationships.rows

});



}catch(error){

console.error(error);


return NextResponse.json(
{
error:"Failed loading graph"
},
{
status:500
}
)


}


}