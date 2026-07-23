import {
  FolderSearch,
  Activity,
  CheckCircle,
  MessageSquare
} from "lucide-react"



interface StatsCardProps {

title:string

value:string

}



const icons:any = {

"Total Cases": FolderSearch,

"Active": Activity,

"Completed": CheckCircle,

"Messages": MessageSquare

}





export default function StatsCard({
title,
value
}:StatsCardProps){


const Icon = icons[title] || FolderSearch



return (

<div

className="
bg-card
border
border-border/30
rounded-xl
p-5
hover:border-primary/40
transition
group
"

>


<div

className="
flex
items-center
justify-between
mb-4
"

>


<div

className="
w-10
h-10
rounded-lg
bg-primary/10
flex
items-center
justify-center
text-primary
group-hover:scale-110
transition
"

>


<Icon size={20}/>


</div>



</div>





<p

className="
text-sm
text-muted-foreground
"

>

{title}

</p>




<h3

className="
text-3xl
font-bold
mt-2
"

>

{value}

</h3>



</div>


)

}