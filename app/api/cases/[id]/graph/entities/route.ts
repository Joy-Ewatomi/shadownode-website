import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"


export async function GET(
req: NextRequest,
context:{
params:{
id:string
}
}
){

const {id}=context.params


const result = await query(
`
SELECT
id,
name,
entity_type,
description,
verification_status,
confidence_score

FROM investigation_entities

WHERE case_id=$1

ORDER BY created_at DESC
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


const body = await req.json()


const result = await query(
`
INSERT INTO investigation_entities
(
case_id,
entity_type,
name,
description,
verification_status,
confidence_score
)

VALUES
($1,$2,$3,$4,$5,$6)

RETURNING *
`,
[
id,
body.entity_type,
body.name,
body.description,
body.verification_status ?? "unverified",
body.confidence_score ?? 0
]
)



return NextResponse.json(result.rows[0])

}