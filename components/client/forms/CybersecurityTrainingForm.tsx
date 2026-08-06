"use client"

import {
  Loader2,
} from "lucide-react"

import {
  useCallback,
  useState,
} from "react"

import TrainingObjectiveStep from "./cybersecurity-training/steps/TrainingServiceStep"

import TrainingDetailStep from "./cybersecurity-training/steps/TrainingDetailStep"

import CommunicationStep from "./cybersecurity-training/steps/CommunicationStep"

import ReviewAuthorizationStep from "./cybersecurity-training/steps/ReviewAuthorizationStep"

/* ============================================================
   TYPES
============================================================ */


export type CybersecurityTrainingFormData = {

category: string

service_type: string


training_organization_name: string
training_client_type: string
training_participant_count: string
training_skill_level: string


training_audience: string
training_industry: string


training_goal: string
training_objective: string

training_topics_selected: string[]
training_objectives: string[]

training_custom_topic: string


training_format: string
training_duration: string


training_materials: string[]
training_compliance: string[]


training_certificate: string


training_expected_outcome: string


training_assessment_required: boolean
training_labs_required: boolean


training_preferred_start_date: string
training_preferred_completion_date: string


training_timeline_flexible: boolean


training_additional_requirements: string



client_country: string
preferred_currency: string


communication_method: string


communication_email: string

communication_country_code: string
communication_phone: string
communication_whatsapp: string

communication_signal: string


authorization_confirmed: boolean
custom_description:string
custom_training_objective:string
custom_training_audience:string
custom_expected_outcome:string

}



/* ============================================================
   COUNTRY CURRENCY
============================================================ */


const COUNTRY_CURRENCY_MAP: Record<string,string> = {

Nigeria:"NGN",
"United States":"USD",
Canada:"CAD",
India:"INR",
Ghana:"GHS",
Kenya:"KES",
Germany:"EUR",
France:"EUR",
Italy:"EUR",
Spain:"EUR",
Australia:"AUD",
Japan:"JPY",
China:"CNY",
Singapore:"SGD",

}



function getCurrency(country:string){

return COUNTRY_CURRENCY_MAP[country] || "USD"

}



/* ============================================================
   INITIAL FORM
============================================================ */


const EMPTY_FORM:CybersecurityTrainingFormData={


category:"cybersecurity",

service_type:"",


training_organization_name:"",
training_client_type:"organization",
training_participant_count:"",
training_skill_level:"beginner",


training_audience:"",
training_industry:"",


training_goal:"",
training_objective:"",


training_topics_selected:[],
training_objectives:[],


training_custom_topic:"",


training_format:"",
training_duration:"",


training_materials:[],
training_compliance:[],


training_certificate:"",


training_expected_outcome:"",


training_assessment_required:false,
training_labs_required:false,


training_preferred_start_date:"",
training_preferred_completion_date:"",


training_timeline_flexible:false,


training_additional_requirements:"",



client_country:"",
preferred_currency:"",



communication_method:"portal_notification",


communication_email:"",

communication_country_code:"",
communication_phone:"",
communication_whatsapp:"",

communication_signal:"",



authorization_confirmed:false,

custom_description:"",

custom_training_objective:"",

custom_training_audience:"",

custom_expected_outcome:"",
}



/* ============================================================
   STEPS
============================================================ */


const STEPS=[

{
id:1,
label:"Training Service",
},

{
id:2,
label:"Training Details",
},

{
id:3,
label:"Communication",
},

{
id:4,
label:"Review & Authorization",
},

]




/* ============================================================
   PROPS
============================================================ */


type Props={

submitting:boolean

onSubmit:(data:CybersecurityTrainingFormData)=>Promise<void>

}



/* ============================================================
   COMPONENT
============================================================ */


export default function CybersecurityTrainingForm({

submitting,

onSubmit,

}:Props){



const [form,setForm]=useState<CybersecurityTrainingFormData>(
EMPTY_FORM
)



const [step,setStep]=useState(1)




const updateForm=useCallback(

(patch:Partial<CybersecurityTrainingFormData>)=>{


setForm(prev=>({

...prev,

...patch

}))


},

[]


)





function handleCountry(country:string){

updateForm({

client_country:country,

preferred_currency:getCurrency(country)

})

}






function nextStep(){

if(step < STEPS.length){

setStep(step+1)

}

}




function prevStep(){

if(step>1){

setStep(step-1)

}

}






function canProceed(){


switch(step){


case 1:

return Boolean(
form.service_type
)



case 2:

return (

form.training_goal.trim().length >= 5 &&

form.training_topics_selected.length > 0 &&

Boolean(
form.training_preferred_start_date
)

)



case 3:


if(
!form.client_country ||
!form.communication_method
){

return false

}



if(form.communication_method==="email"){

return Boolean(
form.communication_email
)

}



if(form.communication_method==="whatsapp"){

return Boolean(

form.communication_country_code &&

form.communication_whatsapp

)

}



if(form.communication_method==="signal"){

return Boolean(
form.communication_signal
)

}



return true



case 4:

return form.authorization_confirmed



default:

return false

}


}







async function handleSubmit(){

await onSubmit(form)

}







function renderStep(){


switch(step){


case 1:

return (
  <TrainingObjectiveStep

    objectives={
      form.training_objectives
    }

    customObjective={
      form.custom_training_objective
    }


    onChange={(value: any)=>
      updateForm({
        training_objectives:value,
      })
    }


    onCustomChange={(value)=>
      updateForm({
        custom_training_objective:value,
      })
    }

  />
)



case 2:

return (

<TrainingDetailStep
form={form}
set={updateForm}
/>

)



case 3:

return (

<CommunicationStep

form={form}

set={updateForm}

handleCountry={handleCountry}

/>

)



case 4:

return (

<ReviewAuthorizationStep

form={form}

set={updateForm}

/>

)



default:

return null


}


}







return (

<div className="space-y-8">



{/* STEP INDICATOR */}

<div className="flex items-center justify-between">


{STEPS.map(item=>(


<div
key={item.id}
className="flex flex-1 items-center"
>


<div

className={`
flex h-8 w-8 items-center justify-center rounded-full border text-xs

${step>=item.id

?

"border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"

:

"border-[#143b28] text-white/40"

}

`}

>

{item.id}

</div>




<span

className={`
ml-2 hidden text-xs sm:block

${step>=item.id
?
"text-white"
:
"text-white/40"
}

`}

>

{item.label}

</span>




{item.id!==STEPS.length && (

<div className="mx-3 h-px flex-1 bg-[#143b28]" />

)}



</div>


))}


</div>





{/* STEP CONTENT */}


<div>

{renderStep()}

</div>






{/* BUTTONS */}


<div className="flex justify-between border-t border-[#143b28] pt-6">


<button

type="button"

onClick={prevStep}

disabled={step===1}

className="rounded-md border border-[#143b28] px-5 py-2 text-sm text-white/70 disabled:opacity-40"

>

Previous

</button>





{step < STEPS.length ? (


<button

type="button"

onClick={nextStep}

disabled={!canProceed()}

className="rounded-md bg-[#20dc73] px-6 py-2 text-sm font-semibold text-black disabled:opacity-40"

>

Next

</button>


)

:


(


<button

type="button"

onClick={handleSubmit}

disabled={
submitting ||
!canProceed()
}

className="flex items-center gap-2 rounded-md bg-[#20dc73] px-6 py-2 text-sm font-semibold text-black disabled:opacity-40"

>


{submitting && (

<Loader2 className="h-4 w-4 animate-spin"/>

)}


Submit Request


</button>


)

}



</div>




</div>

)

}