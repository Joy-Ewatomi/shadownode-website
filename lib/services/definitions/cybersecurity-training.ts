import { ServiceDefinition } from "../types"


export const cybersecurityTrainingService: ServiceDefinition = {

id: "cybersecurity_training",

title: "Cybersecurity Training",

description:
"Professional cybersecurity education and awareness programmes.",


steps: [

{
id:1,

title:"Training Details",

fields:[

{
name:"organization",
label:"Organization Name",
type:"text",
required:true
},


{
name:"audience",
label:"Training Audience",
type:"select",

options:[
"Students",
"Employees",
"Executives",
"IT Team",
"Security Team"
],

required:true
},


{
name:"skill_level",
label:"Current Skill Level",
type:"select",

options:[
"Beginner",
"Intermediate",
"Advanced"
]

}

]

},


{
id:2,

title:"Training Requirements",

fields:[

{
name:"goal",
label:"Training Goal",
type:"textarea",
required:true
},


{
name:"topics",
label:"Training Topics",
type:"textarea"
}

]

},


{
id:3,

title:"Schedule",

fields:[

{
name:"start_date",
label:"Preferred Start Date",
type:"date",
required:true
},


{
name:"completion_date",
label:"Preferred Completion Date",
type:"date",
required:true
}


]

},


{
id:4,

title:"Communication",

fields:[

{
name:"email",
label:"Email Address",
type:"text",
required:true
},


{
name:"phone",
label:"Phone Number",
type:"text"

}

]

}


],


}