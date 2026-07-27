import {NextRequest,NextResponse} from "next/server"
import {query} from "@/lib/db"



export async function GET(
req:NextRequest,
context:{
params:{
id:string
}
}
){

const {id}=context.params


const result=await query(
`
SELECT

id,
source_entity_id,
target_entity_id,
relationship_type,
description,
verification_status,
confidence_score

FROM entity_relationships

WHERE case_id=$1

`,
[id]
)


return NextResponse.json(result.rows)

}





export async function POST(
req:NextRequest,
context:{
params:{
id:string
}
}
){

const {id}=context.params


const body=await req.json()



const result=await query(
`
INSERT INTO entity_relationships
(
case_id,
source_entity_id,
target_entity_id,
relationship_type,
description,
verification_status,
confidence_score
)


VALUES
($1,$2,$3,$4,$5,$6,$7)

RETURNING *

`,
[
id,
body.source_entity_id,
body.target_entity_id,
body.relationship_type,
body.description,
body.verification_status ?? "unverified",
body.confidence_score ?? 0
]
)


return NextResponse.json(result.rows[0])

}