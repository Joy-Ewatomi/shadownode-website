"use client"

import {useEffect,useState} from "react"
import Link from "next/link"


export default function ClientQuotes(){

const [quotes,setQuotes]=useState<any[]>([])

useEffect(() => {
  async function loadQuotes() {
    try {
      const res = await fetch("/api/client/quotes", {
        credentials: "include",
        cache: "no-store",
      })

      const data = await res.json()

      console.log("CLIENT QUOTES:", data)

      if (!res.ok) {
        throw new Error(data.error || "Failed loading quotes")
      }

      setQuotes(data)

    } catch (error) {
      console.error("CLIENT QUOTES ERROR:", error)
    }
  }

  loadQuotes()
}, [])


return (

<section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">

<h2 className="text-white font-semibold">
Investigation Quotes
</h2>


{quotes.length===0 && (
<p className="mt-3 text-white/50">
No quotes available
</p>
)}


{quotes.map(q=>(

<div
key={q.id}
className="mt-4 rounded border border-[#143b28] p-4"
>

<h3 className="text-white font-medium">
{q.title}
</h3>


<p className="text-sm text-white/50">
{q.case_number}
</p>


<p className="mt-3 text-[#20dc73] text-xl font-bold">
{q.approved_quote_currency}
{" "}
{q.approved_quote_amount}
</p>


<p className="text-sm text-white/50">
Final quotation ready for your review.
</p>

<Link
  href={`/dashboard/requests/${q.id}`}
  className="mt-4 inline-flex rounded border border-[#20dc73]/40 px-4 py-2 text-[#20dc73]"
>
  Review Quote
</Link>


</div>

))}


</section>

)

}