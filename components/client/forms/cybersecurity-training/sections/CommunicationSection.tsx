"use client"

import { useMemo } from "react"
import useCountryList from "react-select-country-list"

import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"

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
  signal: string

  onCountryChange: (value: string) => void
  onCustomCountryChange: (value: string) => void

  onMethodChange: (value: string) => void

  onEmailChange: (value: string) => void
  onWhatsappChange: (value: string) => void
  onSignalChange: (value: string) => void
}



export default function CommunicationSection({
  country,
  customCountry,

  communicationMethod,

  email,
  whatsapp,
  signal,

  onCountryChange,
  onCustomCountryChange,

  onMethodChange,

  onEmailChange,
  onWhatsappChange,
  onSignalChange,

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
items-center
justify-center
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

{item.label}


</button>


)

})}


</div>


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

{
communicationMethod==="whatsapp" && (

<div>

<label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
WhatsApp Number
</label>


<PhoneInput

international

defaultCountry="GB"

value={whatsapp}

onChange={(value)=>
onWhatsappChange(value || "")
}

/>


</div>

)
}




{/* SIGNAL */}

{
communicationMethod==="signal" && (

<div>

<label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
Signal Number
</label>


<PhoneInput

international

defaultCountry="GB"

value={signal}

onChange={(value)=>
onSignalChange(value || "")
}

/>


</div>

)
}



</div>

)

}