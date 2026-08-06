import { query } from "@/lib/db"
import { notifyUser } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"


export async function convertAcceptedRequestToCase(
  requestId: string,
  actorUserId: string
) {

  try {


    // START TRANSACTION

    await query("BEGIN")




    // GET REQUEST

    const current = await query<{
      id:string
      case_number:string | null
      user_id:string | null
      title:string | null
      description:string | null
      service_type:string | null
      category:string | null
      ai_suggested_priority:string | null
      urgency:string | null
      approved_quote_amount:number | null
      approved_estimated_completion:string | null
      preferred_deadline:string | null
      converted_case_id:string | null
      status:string
    }>(
      `
   SELECT *
FROM requests
WHERE id=$1
AND user_id=$2
FOR UPDATE
LIMIT 1
      `,
      [
        requestId,
        actorUserId
      ]
    )


    const item = current.rows[0]



    if(!item){

      throw new Error(
        "Request not found"
      )

    }





    // PREVENT DUPLICATE CASE CREATION

  if(item.converted_case_id){

  await query("ROLLBACK")

  return item.converted_case_id

}


if (
  item.status === "active" ||
  item.status === "awaiting_payment"
) {
  throw new Error(
    "Request already converted or awaiting payment"
  )
}




    // CLIENT PROFILE

    const profile = await query<{
      id:string
      organization_id:string | null
    }>(
      `
      SELECT 
      id,
      organization_id

      FROM user_profiles

      WHERE user_id=$1

      LIMIT 1
      `,
      [
        item.user_id
      ]
    )



  const clientProfile = profile.rows[0]

if (!clientProfile) {
  throw new Error("Client profile not found")
}




    // GENERATE CASE NUMBER


    const caseNumber =
  `SN-CASE-${new Date().getFullYear()}-${Date.now()}`



const existingCase = await query<{id:string}>(
`
SELECT id
FROM cases
WHERE case_number=$1
LIMIT 1
`,
[
caseNumber
]
)


if(existingCase.rows[0]){

await query("ROLLBACK")

return existingCase.rows[0].id

}


    // CREATE CASE


    const created = await query<{
      id:string
    }>(
      `
      INSERT INTO cases
      (
        organization_id,
        case_number,
        client_profile_id,
        case_user_id,
        title,
        description,
        service_type,
        status,
        priority,
        assigned_to,
        budget,
        estimated_completion,
        progress,
        payment_status,
        started_at,
        created_at,
        updated_at
      )


      VALUES

      (

        COALESCE(
          $1,
          (
            SELECT id
            FROM organizations
            ORDER BY created_at ASC
            LIMIT 1
          )
        ),

        $2,

        $3,

        $3,

        $4,

        $5,

        $6,

        'awaiting_payment',

        $7,

        $8,

        $9,

        $10,

        0,

       'pending',

        NULL,

        NOW(),

        NOW()

      )


      RETURNING id

      `,
      [

        clientProfile?.organization_id || null,

        caseNumber,

        clientProfile?.id || null,

        item.title ||
        "Investigation Request",

        item.description,

        item.service_type ||
        item.category ||
        "osint",

        item.ai_suggested_priority ||
        item.urgency ||
        "normal",

       null,

        item.approved_quote_amount,

        item.approved_estimated_completion ||
        item.preferred_deadline ||
        null

      ]
    )



    const caseId =
      created.rows[0].id







    // UPDATE REQUEST


    await query(
      `
      UPDATE requests

      SET

      status='awaiting_payment',

      converted_case_id=$2,

      client_decision_at=NULL,

      updated_at=NOW()


      WHERE id=$1

      `,
      [
        requestId,
        caseId
      ]
    )








   // CREATE CASE TIMELINE EVENT

await query(
  `
  INSERT INTO case_updates
  (
    case_id,
    updated_by,
    update_type,
    title,
    content
  )
  VALUES
  (
    $1,
    $2,
    'status_change',
    'Case Created',
    'Client accepted the quote. Payment is pending before the investigation begins.'
  )
  `,
  [
    caseId,
    clientProfile.id
  ]
)



// AUDIT

await recordRequestAudit(
  requestId,
  actorUserId,
  "client_accepted_quote_awaiting_payment",
  {
    case_id: caseId
  }
)



// COMMIT ONCE

await query(
  "COMMIT"
)



// NOTIFY CLIENT AFTER SUCCESS

if(item.user_id){

  await notifyUser(
    item.user_id,
    {
      caseId,

      type: "payment_required",

      title: "Payment Required",

      message:
      "Your quote has been accepted. Complete payment to begin your investigation.",
      metadata: {
        request_id: requestId,
        case_id: caseId,
        target_page: "payment",
        action: "pay_now",
      },
    }
  )

}



return caseId

  }

  catch(error){


    await query(
      "ROLLBACK"
    )


    console.error(
      "CASE CONVERSION ERROR",
      error
    )


    throw error

  }

}