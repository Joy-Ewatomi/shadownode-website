import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import Link from "next/link"


export default async function CasesPage(){

  const user = await getCurrentUser()

  if(!user){
    redirect("/login")
  }


  return (

    <div className="space-y-6">


      <header className="border-b border-[#143b28] pb-6">

        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
          Investigation Management
        </p>


        <h1 className="mt-3 text-3xl font-bold text-white">
          Cases
        </h1>


        <p className="mt-2 text-white/50">
          Manage active investigations, evidence, intelligence and reports.
        </p>

      </header>



      <div className="grid gap-5 md:grid-cols-3">


        <Link
          href="/dashboard/cases/active"
          className="rounded-md border border-[#143b28] bg-[#06110f] p-6 hover:border-[#20dc73]/50"
        >

          <h2 className="text-white font-semibold">
            Active Cases
          </h2>

          <p className="mt-2 text-sm text-white/50">
            Currently running investigations.
          </p>

        </Link>




        <Link
          href="/dashboard/cases/waiting-client"
          className="rounded-md border border-[#143b28] bg-[#06110f] p-6 hover:border-[#20dc73]/50"
        >

          <h2 className="text-white font-semibold">
            Waiting Client
          </h2>

          <p className="mt-2 text-sm text-white/50">
            Cases waiting for client action.
          </p>

        </Link>





        <Link
          href="/dashboard/cases/completed"
          className="rounded-md border border-[#143b28] bg-[#06110f] p-6 hover:border-[#20dc73]/50"
        >

          <h2 className="text-white font-semibold">
            Completed
          </h2>

          <p className="mt-2 text-sm text-white/50">
            Finished investigations.
          </p>

        </Link>


      </div>



      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6">

        <h2 className="font-semibold text-white">
          Investigation Workspace
        </h2>


        <p className="mt-3 text-sm text-white/50">
          Select a case to access timeline, evidence vault, intelligence graph, messages and reports.
        </p>

      </div>


    </div>

  )

}