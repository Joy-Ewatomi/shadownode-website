import { createClient } from "@supabase/supabase-js"
import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"
import { estimatePrice } from "@/lib/pricing"
import { analyzeRequest } from "@/lib/services/request-analysis-service"


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!


const supabase = createClient(
  supabaseUrl,
  supabaseKey
)



export async function POST(
  request: NextRequest
) {


  try {


    const body = await request.json()


    const {
      serviceType,
      description,
      timeline,
      contact,
      email
    } = body






    // VALIDATION

    if(
      !serviceType ||
      !description ||
      !timeline ||
      !email
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





    if(description.trim().length < 20){

      return NextResponse.json(
        {
          error:
          "Description must be at least 20 characters"
        },
        {
          status:400
        }
      )

    }







    // GENERATE ANONYMOUS TRACKING TOKEN + CLIENT-FACING TRACKING NUMBER

    const token = nanoid(32)
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${year}-01-01T00:00:00.000Z`)
      .lt("created_at", `${year + 1}-01-01T00:00:00.000Z`)
    const trackingNumber = `SN-${year}-${String((count || 0) + 1).padStart(6, "0")}`







    // PRICE ESTIMATION
    // Later replace with AI case analyzer

    const priceEstimate = estimatePrice({

      serviceType,

      description,

      timeline

    })
    const analysis = analyzeRequest({ serviceType, description, timeline })








    // CREATE ANONYMOUS REQUEST


    const {
      data,
      error
    } = await supabase

    .from("requests")

    .insert([

      {


        token,


        title:
        `${serviceType} Request`,

        case_number:
        trackingNumber,



        service_type:
        serviceType,



        description,



        timeline,



        contact_method:
        contact || null,



        client_email:
        email,



        estimated_price:
        priceEstimate.estimatedPrice,



        ai_price_estimate:
        analysis.suggestedPrice,
        ai_complexity:
        analysis.complexity,
        ai_estimated_hours:
        analysis.estimatedHours,
        ai_suggested_service:
        analysis.suggestedService,
        ai_suggested_priority:
        analysis.suggestedPriority,
        ai_confidence:
        analysis.confidence,
        ai_reasoning:
        analysis.reasoning,



        currency:
        "NGN",



        status:
        "submitted",



        is_anonymous:
        true,



        priority:
        analysis.suggestedPriority,



        created_at:
        new Date().toISOString()


      }

    ])

    .select()

    .single()







    if(error){


      console.error(
        "Database error:",
        error
      )


      return NextResponse.json(

        {
          error:
          "Failed to submit request"
        },

        {
          status:500
        }

      )

    }








    // RETURN TRACKING INFORMATION ONLY

    return NextResponse.json(

      {

        success:true,


        token,


        request_id:
        data.id,

        tracking_number:
        data.case_number || trackingNumber,


        message:
        "Request submitted successfully. Your case is under review."

      },

      {
        status:201
      }

    )







  }


  catch(error){


    console.error(
      "Request error:",
      error
    )



    return NextResponse.json(

      {
        error:
        "Invalid request"
      },

      {
        status:400
      }

    )


  }


}
