"use client"

import {
  Activity,
  AlertTriangle,
  Clock,
  FileText,
  MessageSquare,
  ShieldCheck,
  Users
} from "lucide-react"

import { useEffect, useState } from "react"


type Metric = {
  key: string
  label: string
  value: string
  helper: string
}

type QueueItem = {
  id: string
  type?: "case" | "request" | "report" | "activity"
  title: string
  detail: string
  status: string
}


const iconMap = [
  ShieldCheck,
  Clock,
  MessageSquare,
  FileText,
  Activity,
  Users,
  AlertTriangle
]


export default function RoleDashboard({
  role,
  eyebrow,
  title,
  description,
  metrics,
  queueTitle,
  queueItems,
}: {
  role: string
  eyebrow: string
  title: string
  description: string
  metrics: Metric[]
  queueTitle: string
  queueItems: QueueItem[]
}) {


  const [data, setData] = useState<Record<string, string | number> | null>(null)

  const [activity, setActivity] = useState<QueueItem[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState("")



  useEffect(() => {

    async function loadDashboard() {

      try {

        const endpoint =
          role === "client"
            ? "/api/client/dashboard"
            : "/api/dashboard/overview"


        const res = await fetch(endpoint, {
          credentials: "include",
        })


        if (!res.ok) {
          throw new Error("Dashboard unavailable")
        }


        const json = await res.json()


        if (role === "client") {

          setData(json.stats || {})


        } else {

          setData(json)

        }


      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Dashboard unavailable"
        )


      } finally {

        setLoading(false)

      }

    }


    loadDashboard()


  }, [role])




  useEffect(() => {


    async function loadActivity() {


      if (role !== "client") return


      try {

        const res = await fetch(
          "/api/client/activity",
          {
            credentials: "include",
          }
        )


        if (!res.ok) return


        const json = await res.json()


        setActivity(json)


      } catch {

        setActivity([])

      }

    }


    loadActivity()


  }, [role])



  const displayQueue =
    role === "client" && activity.length > 0
      ? activity
      : queueItems



return (
  <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 sm:px-6 lg:px-8">


      <header className="border-b border-[#143b28] pb-6">

        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
          {eyebrow}
        </p>


        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          {title}
        </h1>


        <p className="mt-2 max-w-3xl text-sm text-white/55">
          {description}
        </p>


      </header>




      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">


        {metrics.map((metric,index)=>{


          const Icon =
            iconMap[index % iconMap.length]


          return (

            <div
            key={`${metric.label}-${index}`}
              className="
rounded-md 
border 
border-[#143b28] 
bg-[#06110f] 
p-5
transition
hover:border-[#20dc73]/40
"
            >

              <Icon className="h-5 w-5 text-[#20dc73]" />


              <p className="mt-4 text-sm text-white/50">
                {metric.label}
              </p>

<div className="mt-1 text-3xl font-bold text-[#20dc73]">
{
  loading ? (
    <div className="h-9 w-16 animate-pulse rounded bg-[#143b28]" />
  ) : (
    data?.[metric.key] ?? metric.value
  )
}
</div>
              <p className="mt-2 text-xs text-white/38">
                {metric.helper}
              </p>


            </div>

          )

        })}


      </section>



      {
        error &&
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">

          {error}

        </div>
      }



     <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">



        <div className="rounded-md border border-[#143b28] bg-[#06110f]">


          <div className="border-b border-[#143b28] px-5 py-4">

            <h2 className="font-semibold text-white">
              {queueTitle}
            </h2>

          </div>



          <div className="divide-y divide-[#143b28]">


{
displayQueue.length === 0 ? (

<div className="px-5 py-10 text-center">

<p className="text-sm text-white/50">
No activity yet.
</p>

<p className="mt-2 text-xs text-white/30">
Your investigation requests and bureau updates will appear here.
</p>

</div>

) : (

displayQueue.map((item,index)=>(

  

    <div
      key={
        item.id
          ? `${item.type || "item"}-${item.id}`
          : `${item.title}-${item.status}-${index}`
      }
      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
                  <div>

                    <p className="font-medium text-white">
                      {item.title}
                    </p>


                    <p className="mt-1 text-sm text-white/45">
                      {item.detail}
                    </p>


                  </div>



                  <span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs text-[#20dc73]">

                    {item.status}

                  </span>


                </div>

            ))
)
}


          </div>



        </div>





        <aside className="rounded-md border border-[#143b28] bg-[#06110f] p-5 xl:sticky xl:top-6 xl:self-start">


          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">

            Security Notice

          </p>


          <p className="mt-3 text-sm leading-6 text-white/58">

            SHADOWNODE Operations Bureau maintains secure investigation workflows.
            Quotes, cases, reports and communication updates appear here as they are processed.

          </p>


        </aside>



      </section>


    </div>

  )

}