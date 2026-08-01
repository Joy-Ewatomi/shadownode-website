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

      await query("COMMIT")

      return item.converted_case_id

    }





    if(
      item.status === "active"
    ){

      throw new Error(
        "Request already converted"
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



    const clientProfile =
      profile.rows[0]





    // FIND AVAILABLE INVESTIGATOR

    const investigator = await query<{
      id:string
      user_id:string | null
    }>(
      `
      SELECT
      up.id,
      up.user_id

      FROM user_profiles up

      JOIN app_users au
      ON au.id = up.user_id

      WHERE au.role='investigator'
      AND au.status='active'

      ORDER BY up.created_at ASC

      LIMIT 1

      `
    )



    const assignedInvestigator =
      investigator.rows[0]







    // GENERATE CASE NUMBER


    const caseNumber =
      item.case_number
      ||
      `SN-CASE-${new Date().getFullYear()}-${Date.now()}`








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

        'active',

        $7,

        $8,

        $9,

        $10,

        0,

        'pending',

        NOW(),

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

        assignedInvestigator?.id || null,

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

      status='active',

      converted_case_id=$2,

      client_decision_at=NOW(),

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

        'Client accepted quote and investigation case was opened.'

      )

      `,
      [
        caseId,
        clientProfile?.id || null
      ]
    )








    // ASSIGN INVESTIGATOR


    if(
      assignedInvestigator?.id
    ){


      await query(
        `
        INSERT INTO case_assignments

        (
          case_id,
          assigned_to,
          assignment_role,
          status,
          assigned_by
        )

        VALUES

        (

          $1,

          $2,

          'investigator',

          'assigned',

          $3

        )

        `,
        [

          caseId,

          assignedInvestigator.id,

          actorUserId

        ]
      )



    }








    // COMMIT DATABASE CHANGES


    await query(
      "COMMIT"
    )








    // NOTIFICATIONS AFTER SUCCESS


    if(
      assignedInvestigator?.user_id
    ){

      await notifyUser(
        assignedInvestigator.user_id,
        {

          caseId,

          type:
          "assignment_completed",

          title:
          "New Investigation Assignment",

          message:
          item.title ||
          "A new case has been assigned.",

          metadata:{
            request_id:requestId
          }

        }
      )

    }




    if(item.user_id){

      await notifyUser(
        item.user_id,
        {

          caseId,

          type:
          "case_created",

          title:
          "Investigation Started",

          message:
          "Your accepted quote has been converted into an active investigation.",

          metadata:{
            request_id:requestId
          }

        }
      )

    }






    await recordRequestAudit(
      requestId,
      actorUserId,
      "client_accepted_quote_case_created",
      {
        case_id:caseId
      }
    )




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