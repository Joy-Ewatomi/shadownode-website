"use client"

import { Bell, Volume2, VolumeX } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"

type Notification = {
  id: string
  title: string
  message: string | null
  type: string
  read: boolean
  created_at: string
  case_id: string | null
}

type User = {
  role: string
}

export default function NotificationBell() {

  const [user, setUser] = useState<User | null>(null)

  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [soundEnabled, setSoundEnabled] = useState(false)

  const notificationsRef = useRef<Notification[]>([])
  const soundEnabledRef = useRef(false)


  // Load current user
  useEffect(() => {

    async function loadUser(){

      try {

        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        })


        if(!res.ok){
          return
        }


        const data = await res.json()

        setUser(data.user)


      } catch(error){

        console.error(
          "USER LOAD ERROR",
          error
        )

      }

    }


    loadUser()

  },[])



  async function loadNotifications(){

    try {

      const res = await fetch("/api/notifications", {
        credentials: "include",
        cache: "no-store",
      })


      if(!res.ok){
        return
      }


      const next: Notification[] = await res.json()


      const previousUnread =
        notificationsRef.current.filter(
          item => !item.read
        ).length


      const nextUnread =
        next.filter(
          item => !item.read
        ).length



      if(
        soundEnabledRef.current &&
        nextUnread > previousUnread
      ){

        new Audio(
          "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="
        )
        .play()
        .catch(()=>undefined)

      }



      notificationsRef.current = next

      setNotifications(next)


    } catch(error){

      console.error(
        "NOTIFICATION LOAD ERROR",
        error
      )

    }

  }



  async function markRead(id:string){

    await fetch(
      "/api/notifications",
      {
        method:"PATCH",
        credentials:"include",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          id
        })
      }
    )


    setNotifications(
      items =>
        items.map(
          item =>
            item.id === id
            ?
            {
              ...item,
              read:true
            }
            :
            item
        )
    )

  }




  useEffect(()=>{

    loadNotifications()

    const timer =
      window.setInterval(
        loadNotifications,
        15000
      )


    return ()=>window.clearInterval(timer)

  },[])




  const unread =
    useMemo(
      ()=>notifications.filter(
        item=>!item.read
      ).length,
      [notifications]
    )




  const typeClass:Record<string,string> = {

    assignment:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",

    case_assignment:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",

    message:
      "border-sky-400/40 bg-sky-400/10 text-sky-200",

    case_update:
      "border-amber-300/40 bg-amber-300/10 text-amber-200",

    security:
      "border-red-400/40 bg-red-400/10 text-red-200",

    quote_ready:
      "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]",

    request_created:
      "border-blue-400/40 bg-blue-400/10 text-blue-200",

    quote_review:
      "border-yellow-400/40 bg-yellow-400/10 text-yellow-200",

    system:
      "border-white/25 bg-white/10 text-white/75",

  }





return (

<div className="relative">


<button

onClick={() => setOpen(value=>!value)}

className="
relative flex h-10 w-10 items-center justify-center
rounded-md border border-[#143b28]
bg-[#06110f]
text-white/75
hover:border-[#20dc73]/50
hover:text-[#20dc73]
"

aria-label="Notifications"

>


<Bell className="h-5 w-5"/>


{
unread ?
<span
className="
absolute -right-1 -top-1
min-w-5 rounded-full
bg-[#20dc73]
px-1.5 py-0.5
text-[10px]
font-bold
text-black
"
>
{unread}
</span>
:
null
}


</button>




{
open ?

<div
className="
absolute right-0 mt-2 w-80
overflow-hidden rounded-md
border border-[#143b28]
bg-[#06110f]
shadow-2xl
"
>


<div
className="
flex items-center justify-between
border-b border-[#143b28]
px-4 py-3
"
>

<p className="font-semibold text-white">
Notifications
</p>


<div className="flex items-center gap-2">


<button

onClick={()=>{

setSoundEnabled(value=>{

const next=!value

soundEnabledRef.current=next

return next

})

}}

className="
rounded p-1 text-white/45
hover:bg-white/5 hover:text-white
"

>

{
soundEnabled
?
<Volume2 className="h-4 w-4"/>
:
<VolumeX className="h-4 w-4"/>
}

</button>


<span className="text-xs text-white/45">
{unread} unread
</span>


</div>


</div>




<div className="max-h-96 overflow-y-auto">


{
notifications.length ?

notifications.map(item=>{


const content = (

<div
className={`
border-b border-[#143b28]
px-4 py-3
transition
hover:bg-white/5
${item.read ? "opacity-65":""}
`}
>


<div className="flex items-start justify-between gap-3">

<p className="text-sm font-medium text-white">
{item.title}
</p>


{
!item.read &&
<span className="
mt-1 h-2 w-2 rounded-full
bg-[#20dc73]
"/>
}


</div>



<span
className={`
mt-2 inline-flex rounded border
px-2 py-0.5 text-[10px]
uppercase tracking-[0.12em]
${typeClass[item.type] || typeClass.system}
`}
>

{item.type}

</span>



{
item.message &&
<p className="mt-1 text-xs text-white/55">
{item.message}
</p>
}



<p className="
mt-2 text-[11px]
uppercase tracking-[0.12em]
text-white/35
">

{new Date(item.created_at).toLocaleString()}

</p>


</div>

)



return item.case_id || item.type === "quote_ready" ?

<Link

key={item.id}

href={

user?.role === "client" && item.type === "quote_ready"

?

`/dashboard/client/notifications/${item.id}`

:

item.case_id

?

user?.role === "client"

?

`/dashboard/client/cases/${item.case_id}`

:

`/cases/${item.case_id}`

:

`/dashboard/client/notifications/${item.id}`

}

onClick={()=>markRead(item.id)}

>

{content}

</Link>


:

<button

key={item.id}

onClick={()=>markRead(item.id)}

className="block w-full text-left"

>

{content}

</button>



})


:

<div className="
px-4 py-8 text-center
text-sm text-white/45
">

No notifications yet.

</div>

}



</div>


</div>

:

null

}


</div>

)

}