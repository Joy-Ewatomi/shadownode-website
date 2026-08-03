import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export default async function ClientRequestDetailsPage({
  params,
}: {
  params: Promise<{ id:string }>
}) {

  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }


  const { id } = await params


  return (
    <div className="space-y-6">

      <header className="border-b border-[#143b28] pb-6">

        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
          Request Details
        </p>


        <h1 className="mt-2 text-3xl font-bold text-white">
          Investigation Request
        </h1>


        <p className="mt-2 text-sm text-white/50">
          Request ID: {id}
        </p>

      </header>


      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6">

        <p className="text-white/50">
          Request details, quote status, negotiation and conversion status will appear here.
        </p>

      </div>

    </div>
  )
}