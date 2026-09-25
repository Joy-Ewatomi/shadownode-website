"use client"

import { useMemo } from "react"
import useCountryList from "react-select-country-list"

import WhatsAppPreferenceFields from "@/components/communications/WhatsAppPreferenceFields"

import {
  MessageSquareText,
  Phone,
  Shield,
} from "lucide-react"


type Props = {
  country: string
  customCountry: string

  communicationMethod: string

  email: string
  whatsapp: string
  whatsappConsent: boolean
  signal: string

  onCountryChange: (value: string) => void
  onCustomCountryChange: (value: string) => void

  onMethodChange: (value: string) => void

  onEmailChange: (value: string) => void
  onWhatsappChange: (value: string) => void
  onWhatsappConsentChange: (value: boolean) => void
  onSignalChange: (value: string) => void
  allowPortal?: boolean
}



export default function CommunicationSection({
  country,
  customCountry,

  communicationMethod,

  email,
  whatsapp,
  whatsappConsent,
  signal: _signal,

  onCountryChange,
  onCustomCountryChange,

  onMethodChange,

  onEmailChange,
  onWhatsappChange,
  onWhatsappConsentChange,
  onSignalChange: _onSignalChange,
  allowPortal = true,

}: Props) {


const countryList = useCountryList()

const countries = useMemo(
  () => countryList.getData(),
  [countryList]
)



return (

<div className="space-y-6">


{/* COUNTRY */}

<div>

<label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
Country
</label>


<select

value={country}

onChange={(e)=>
onCountryChange(e.target.value)
}

className="
h-10 w-full rounded
border border-[#143b28]
bg-black
px-3
text-sm
text-white
outline-none
focus:border-[#20dc73]/50
"

>


<option value="">
Select country
</option>


{
countries.map((item)=>(
<option
key={item.value}
value={item.label}
>
{item.label}
</option>
))
}


<option value="custom">
Other Country
</option>


</select>


{
country==="custom" && (

<input

value={customCountry}

onChange={(e)=>
onCustomCountryChange(e.target.value)
}

placeholder="Enter your country"

className="
h-10 w-full rounded
border border-[#143b28]
bg-black
px-3
text-sm
text-white
outline-none
focus:border-[#20dc73]/50
"

/>

)
}


</div>



{/* COMMUNICATION METHOD */}


<div>

<label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
Preferred Communication
</label>


<div className="grid gap-3 sm:grid-cols-2">


{[
{
value:"email",
label:"Email",
description: allowPortal
? "Detailed updates by email and in your portal."
: "The bureau will contact you by email.",
icon:MessageSquareText
},

{
value:"whatsapp",
label:"WhatsApp",
description: allowPortal
? "Updates through WhatsApp and in your portal."
: "The bureau will contact you through WhatsApp.",
icon:Phone
},

...(allowPortal ? [{
value:"portal",
label:"Portal",
description:"Full updates in your portal, with brief email alerts.",
icon:Shield
}] : [])

].map((item)=>{

const Icon=item.icon


return (

<button

key={item.value}

type="button"

onClick={()=>
onMethodChange(item.value)
}

className={`
flex
items-start
gap-2
rounded
border
p-3
text-sm
transition

${
communicationMethod===item.value

?

"border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"

:

"border-[#143b28] text-white/70 hover:border-[#20dc73]/40"

}

`}

>


<Icon className="h-4 w-4"/>

<span className="text-left">
  <span className="block font-semibold">
    {item.label}
  </span>
  <span className="mt-1 block text-xs leading-4 text-white/45">
    {item.description}
  </span>
</span>


</button>


)

})}


</div>

<p className="mt-3 text-xs leading-5 text-white/45">
Sensitive case information is only available after signing into the secure portal.
</p>


</div>




{/* EMAIL */}

{
communicationMethod==="email" && (

<div>

<label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
Email Address
</label>


<input

value={email}

onChange={(e)=>
onEmailChange(e.target.value)
}

placeholder="client@example.com"

className="
h-10
w-full
rounded
border border-[#143b28]
bg-black
px-3
text-sm
text-white
outline-none
focus:border-[#20dc73]/50
"

/>


</div>

)
}




{/* WHATSAPP */}
{communicationMethod === "whatsapp" && (
  <WhatsAppPreferenceFields
    value={whatsapp}
    consent={whatsappConsent}
    onValueChange={onWhatsappChange}
    onConsentChange={onWhatsappConsentChange}
  />
)}
</div>

)

}
