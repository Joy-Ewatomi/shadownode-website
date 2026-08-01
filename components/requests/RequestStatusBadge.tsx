type Props = {
  status: string
}

const statusStyles: Record<string,string> = {
  pending_review:
    "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",

  quote_sent:
    "border-blue-400/30 bg-blue-400/10 text-blue-300",

  revised_quote_sent:
    "border-purple-400/30 bg-purple-400/10 text-purple-300",

  accepted:
    "border-green-400/30 bg-green-400/10 text-green-300",

  declined:
    "border-red-400/30 bg-red-400/10 text-red-300",

  case_created:
    "border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]",
}


export default function RequestStatusBadge({
  status
}:Props){

return (

<span
className={`rounded border px-3 py-1 text-xs uppercase ${
statusStyles[status] ||
"border-white/20 bg-white/5 text-white/60"
}`}
>

{status.replaceAll("_"," ")}

</span>

)

}