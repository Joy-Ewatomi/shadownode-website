"use client"

import CommunicationSection from "../sections/CommunicationSection"


type Props = {
 form:any
 set:(value:any)=>void
}



export default function CommunicationStep({
  form,
  set,
}:Props){


return (

<div className="space-y-6">


<p className="text-sm text-white/60">
Provide your preferred communication details so our team can contact you.
</p>


<CommunicationSection

country={form.client_country}

customCountry={form.custom_country}


communicationMethod={
form.communication_method
}


email={
form.communication_email
}


whatsapp={
form.communication_whatsapp
}


signal={
form.communication_signal
}


onCountryChange={(value)=>{

set({
client_country:value,
preferred_currency:value === "custom"
? ""
: form.preferred_currency
})

}}



onCustomCountryChange={(value)=>
set({
custom_country:value
})
}



onMethodChange={(value)=>
set({
communication_method:value
})
}



onEmailChange={(value)=>
set({
communication_email:value
})
}



onWhatsappChange={(value)=>
set({
communication_whatsapp:value
})
}



onSignalChange={(value)=>
set({
communication_signal:value
})
}



/>


</div>

)

}