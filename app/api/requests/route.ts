import { createClient } from "@supabase/supabase-js"
import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"
import { estimatePrice } from "@/lib/pricing"


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
          error:"Description must be at least 20 characters"
        },
        {
          status:400
        }
      )

    }






    // CREATE ANONYMOUS TRACKING TOKEN

    const token = nanoid(32)






    // PRICE ESTIMATION
    // Later replaced/enhanced with AI analyzer

    const priceEstimate = estimatePrice({

      serviceType,

      description,

      timeline

    })








    // SAVE REQUEST


    const {
      data,
      error
    } = await supabase

    .from("requests")

    .insert([

      {

        token,


        service_type:
        serviceType,


        description,


        timeline,



        contact_method:
        contact,



        client_email:
        email,



        estimated_price:
        priceEstimate.estimatedPrice,



        status:
        "submitted",



        is_anonymous:
        true,



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
          error:"Failed to submit request"
        },

        {
          status:500
        }

      )

    }







    // RETURN ONLY TRACKING DATA
    // NO PRICE EXPOSED


    return NextResponse.json(

      {

        success:true,

        token,

        request_id:data.id,

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
        error:"Invalid request"
      },

      {
        status:400
      }

    )


  }


}