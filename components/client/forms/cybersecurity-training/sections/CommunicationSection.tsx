"use client"

import {
  MapPin,
  MessageSquareText,
  Phone,
  Shield,
} from "lucide-react"


type Props = {
  country: string
  currency: string
  communicationMethod: string

  email: string
  countryCode: string
  whatsapp: string
  signal: string

  onCountryChange: (value:string)=>void
  onMethodChange: (value:string)=>void

  onEmailChange: (value:string)=>void
  onCountryCodeChange: (value:string)=>void
  onWhatsappChange: (value:string)=>void
  onSignalChange: (value:string)=>void
}


const COUNTRY_OPTIONS = [
  "Nigeria",
  "United States",
  "Canada",
  "India",
  "Ghana",
  "Kenya",
]


function FormInput({
label,
value,
onChange,
placeholder,
}:{
label:string
value:string
onChange:(value:string)=>void
placeholder?:string
}){

return (
<div>

<label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
{label}
</label>


<input
value={value}
onChange={(e)=>onChange(e.target.value)}
placeholder={placeholder}
className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/50"
/>


</div>
)

}


export default function CommunicationSection({
country,
currency,
communicationMethod,

email,
countryCode,
whatsapp,
signal,

onCountryChange,
onMethodChange,

onEmailChange,
onCountryCodeChange,
onWhatsappChange,
onSignalChange,

}:Props){


return (

<div className="space-y-6">


<div>

<label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
Country
</label>


<select
value={country}
onChange={(e)=>onCountryChange(e.target.value)}
className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white"
>

<option value="">
Select country
</option>


{COUNTRY_OPTIONS.map(item=>(
<option key={item}>
{item}
</option>
))}


</select>

</div>



<div>

<label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
Currency
</label>


<div className="flex items-center gap-3 rounded border border-[#143b28] p-3 text-white/70">

<MapPin className="h-4 w-4 text-[#20dc73]" />

{currency || "Select country"}

</div>


</div>




<div>

<label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
Communication Method
</label>


<div className="grid gap-3 sm:grid-cols-4">


{[
{
value:"email",
label:"Email",
icon:MessageSquareText
},
{
value:"whatsapp",
label:"WhatsApp",
icon:Phone
},
{
value:"signal",
label:"Signal",
icon:MessageSquareText
},
{
value:"portal_notification",
label:"Portal",
icon:Shield
}

].map(item=>(

<button
key={item.value}
type="button"
onClick={()=>onMethodChange(item.value)}
className={`rounded border p-3 flex items-center justify-center gap-2 ${
communicationMethod===item.value
?
"border-[#20dc73] text-[#20dc73]"
:
"border-[#143b28] text-white/70"
}`}
>

<item.icon className="h-4 w-4"/>

{item.label}

</button>

))}


</div>


</div>




{communicationMethod==="email" && (

<FormInput
label="Email Address"
value={email}
onChange={onEmailChange}
placeholder="name@example.com"
/>

)}




{communicationMethod==="whatsapp" && (

<div className="grid gap-4 sm:grid-cols-2">

<FormInput
label="Country Code"
value={countryCode}
onChange={onCountryCodeChange}
placeholder="+234"
/>


<FormInput
label="WhatsApp Number"
value={whatsapp}
onChange={onWhatsappChange}
/>


</div>

)}





{communicationMethod==="signal" && (

<FormInput
label="Signal Username"
value={signal}
onChange={onSignalChange}
/>

)}


</div>

)

}