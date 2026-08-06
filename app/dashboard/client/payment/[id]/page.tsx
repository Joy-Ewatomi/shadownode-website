"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function ClientPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {

  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    async function load(){

      const { id } = await params

      try {

        const res = await fetch(
          `/api/client/requests/${id}`,
          {
            credentials:"include",
            cache:"no-store"
          }
        )

        if(res.ok){

          const data = await res.json()

          setRequest(data)

        }

      }
      catch(error){

        console.error(
          "PAYMENT PAGE ERROR",
          error
        )

      }
      finally{

        setLoading(false)

      }

    }


    load()

  },[params])



  if(loading){

    return (
      <div className="p-6 text-white/50">
        Loading payment details...
      </div>
    )

  }



  if(!request){

    return (
      <div className="p-6 text-red-300">
        Payment information unavailable
      </div>
    )

  }



  return (

    <div className="space-y-6 p-6 text-white">


      <header>

        <p className="
        text-xs uppercase tracking-[0.25em]
        text-[#20dc73]
        ">
          Secure Payment
        </p>


        <h1 className="
        mt-2 text-3xl font-bold
        ">
          Begin Investigation
        </h1>


        <p className="
        mt-2 text-white/50
        ">
          Complete payment to activate your investigation.
        </p>

      </header>




      <div className="
      rounded-lg
      border border-[#143b28]
      bg-[#06110f]
      p-6
      space-y-5
      ">


        <div>

          <p className="
          text-xs uppercase tracking-widest
          text-white/40
          ">
            Investigation
          </p>


          <p className="
          mt-2 text-xl font-semibold
          ">
            {request.title}
          </p>

        </div>





        <div className="
        grid gap-4 md:grid-cols-2
        ">


          <div className="
          rounded border border-[#143b28]
          bg-black/30 p-4
          ">

            <p className="
            text-xs text-white/40
            ">
              Amount Due
            </p>


            <p className="
            mt-2 text-2xl font-bold
            text-[#20dc73]
            ">

              {request.approved_quote_currency || "NGN"}{" "}
              {Number(
                request.approved_quote_amount || 0
              ).toLocaleString()}

            </p>


          </div>





          <div className="
          rounded border border-[#143b28]
          bg-black/30 p-4
          ">

            <p className="
            text-xs text-white/40
            ">
              Status
            </p>


            <p className="
            mt-2 text-lg
            text-yellow-300
            ">
              Awaiting Payment
            </p>


          </div>


        </div>





        <div className="
        rounded border border-[#143b28]
        bg-black/30 p-4
        ">

          <p className="
          text-xs uppercase tracking-widest
          text-white/40
          ">
            Next Step
          </p>


          <p className="
          mt-2 text-white/70
          leading-7
          ">
            Once payment is confirmed,
            ShadowNode will activate your
            investigation workflow.
          </p>


        </div>





        <button

        className="
        w-full rounded
        bg-[#20dc73]
        px-5 py-3
        font-semibold
        text-black
        hover:bg-[#1bc965]
        "

        onClick={()=>{

          alert(
            "Payment gateway integration coming soon"
          )

        }}

        >

        Make Payment

        </button>



      </div>




      <Link

      href="/dashboard/client/notifications"

      className="
      text-sm text-white/50
      hover:text-white
      "

      >

      ← Back to notifications

      </Link>


    </div>

  )

}