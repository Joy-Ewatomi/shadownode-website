"use client"

import CommunicationSection from "../sections/CommunicationSection"

type Props = {
 form:any
 set:(value:any)=>void
 handleCountry:(country:string)=>void
}


export default function CommunicationStep({
form,
set,
handleCountry,
}:Props){

return (

<div className="space-y-6">

<p className="text-sm text-white/60">
Provide your preferred communication details so our team can contact you.
</p>


<CommunicationSection

country={form.client_country}

currency={form.preferred_currency}

communicationMethod={form.communication_method}

email={form.communication_email}

countryCode={form.communication_country_code}

whatsapp={form.communication_whatsapp}

signal={form.communication_signal}


onCountryChange={handleCountry}

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

onCountryCodeChange={(value)=>
set({
communication_country_code:value
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