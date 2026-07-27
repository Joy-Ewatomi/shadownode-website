import { NextResponse } from "next/server";
import { query } from "@/lib/db";


export async function GET(
req:Request,
context:{
params:{id:string}
}
){

try {


const caseId=context.params.id;



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
[caseId]
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
[caseId]

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