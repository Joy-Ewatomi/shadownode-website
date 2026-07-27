"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Github,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  Chrome,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
  type FormEvent
} from "react";


type AuthMode = "login" | "signup";


type AuthModalProps = {

  isOpen:boolean;

  onClose:()=>void;

  initialMode?:AuthMode;

 };



 export default function AuthModal({

 isOpen,

 onClose,

 initialMode="login"

 }:AuthModalProps){



const [mode,setMode]=useState<AuthMode>(initialMode);


const [showPassword,setShowPassword]=useState(false);

const [showConfirmPassword,setShowConfirmPassword]=useState(false);



const [loading,setLoading]=useState(false);


const [message,setMessage]=useState("");



const [form,setForm]=useState({

username:"",

email:"",

password:"",

confirmPassword:""

});





useEffect(()=>{


setMode(initialMode);


setMessage("");


setForm({

username:"",

email:"",

password:"",

confirmPassword:""

});


},[initialMode,isOpen]);






function updateField(

field:keyof typeof form,

value:string

){


setForm(prev=>({

...prev,

[field]:value

}));

}





async function submit(

e:FormEvent

){


e.preventDefault();



setMessage("");




if(

mode==="signup"

&&

form.password !== form.confirmPassword

){

setMessage(
"Passwords do not match"
);

return;

}



setLoading(true);



try{


const endpoint =

mode==="login"

?

"/api/auth/login"

:

"/api/auth/signup";





const body =

mode==="login"

?

{

username:form.username,

password:form.password

}

:

{

username:form.username,

email:form.email,

password:form.password

};






const response = await fetch(

endpoint,

{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify(body)

}

);





const data = await response.json();






if(!response.ok){


setMessage(

data.error || "Authentication failed"

);


return;

}

if(data.requiresTwoFactor){

window.location.href="/login?twoFactorRequired=1";

return;

}







setMessage(

mode==="login"

?

"ACCESS GRANTED"

:

"ACCOUNT CREATED"

);





setTimeout(()=>{


window.location.href="/dashboard";


},1000);





}

catch(error){


console.error(error);


setMessage(
"Network error"
);


}

finally{


setLoading(false);


}


}






return(



<AnimatePresence>


{

isOpen &&



<motion.div

className="
fixed
inset-0
z-50
flex
items-center
justify-center
bg-black/70
px-4
backdrop-blur-xl
"


initial={{opacity:0}}

animate={{opacity:1}}

exit={{opacity:0}}


onClick={onClose}


>
<div className="pointer-events-none absolute inset-0">
  <div className="absolute inset-0 bg-[linear-gradient(rgba(12,255,104,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(12,255,104,0.055)_1px,transparent_1px)] bg-[size:50px_50px]" />
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(74,255,122,0.18),transparent_20%),radial-gradient(circle_at_82%_28%,rgba(74,255,122,0.14),transparent_24%),radial-gradient(circle_at_72%_74%,rgba(74,255,122,0.14),transparent_21%)]" />
  <div className="absolute left-[8%] top-[13%] h-56 w-72 rounded-full border border-[#32ff78]/15 opacity-60 blur-[1px]" />
  <div className="absolute right-[7%] top-[18%] h-64 w-80 rounded-full border border-[#32ff78]/15 opacity-60 blur-[1px]" />
  <div className="absolute bottom-[18%] left-[18%] h-52 w-72 rounded-full border border-[#32ff78]/10 opacity-60 blur-[1px]" />
</div>








<motion.div


onClick={(e)=>e.stopPropagation()}


initial={{

opacity:0,

scale:.95,

y:20

}}


animate={{

opacity:1,

scale:1,

y:0

}}


className="
relative
w-full
max-w-[min(100%,_28rem)]
rounded-3xl
border
border-emerald-400/20
bg-[#071010]
p-4
sm:p-6
shadow-[0_0_80px_rgba(34,197,94,.15)]
max-h-[calc(100vh-3rem)]
overflow-hidden
"


>

<div className="flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-7rem)] pr-1">




<button

onClick={onClose}

className="
absolute
right-5
top-5
text-gray-400
hover:text-white
"

>

<X/>

</button>








<div className="mb-8 flex gap-3 items-center">


<div className="
rounded-xl
bg-emerald-400/10
p-3
text-emerald-400
">


<ShieldCheck/>


</div>




<div>


<p className="
text-xs
tracking-[.3em]
text-emerald-400
">

SHADOWNODE

</p>


<h1 className="
text-xl
font-bold
text-white
">

CLIENT PORTAL

</h1>


</div>


</div>










<div className="
grid
grid-cols-2
bg-black/40
rounded-xl
p-1
mb-6
">


<button

onClick={()=>setMode("login")}

className={`
py-2 rounded-lg
${

mode==="login"

?

"bg-emerald-400 text-black"

:

"text-gray-400"

}

`}

>

LOGIN

</button>





<button

onClick={()=>setMode("signup")}

className={`
py-2 rounded-lg
${

mode==="signup"

?

"bg-emerald-400 text-black"

:

"text-gray-400"

}

`}

>

REGISTER

</button>


</div>









<form

onSubmit={submit}

className="space-y-4"

>





<div>

<label className="text-sm text-gray-300">

Username

</label>


<div className="
flex
items-center
gap-3
bg-black/40
border
border-white/10
rounded-xl
px-4
py-3
mt-2
">


<UserRound className="text-emerald-400" size={18}/>


<input

required

value={form.username}

onChange={e=>
updateField(
"username",
e.target.value
)
}

className="
bg-transparent
outline-none
text-white
w-full
"

placeholder="username"

/>


</div>


</div>








{

mode==="signup"

&&


<div>


<label className="text-sm text-gray-300">

Email

</label>


<div className="
flex
items-center
gap-3
bg-black/40
border
border-white/10
rounded-xl
px-4
py-3
mt-2
">


<Mail
size={18}
className="text-emerald-400"
/>


<input

required

type="email"

value={form.email}

onChange={e=>
updateField(
"email",
e.target.value
)
}

className="
bg-transparent
outline-none
text-white
w-full
"

placeholder="email@example.com"

/>



</div>



</div>


}









<div>


<label className="text-sm text-gray-300">

Password

</label>



<div className="
flex
items-center
gap-3
bg-black/40
border
border-white/10
rounded-xl
px-4
py-3
mt-2
">


<Lock
size={18}
className="text-emerald-400"
/>



<input

required

type={
showPassword
?
"text"
:
"password"
}

value={form.password}

onChange={e=>
updateField(
"password",
e.target.value
)
}

className="
bg-transparent
outline-none
text-white
w-full
"

placeholder="password"

/>


<button

type="button"

onClick={()=>
setShowPassword(!showPassword)
}

>

{

showPassword

?

<EyeOff size={18}/>

:

<Eye size={18}/>

}


</button>


</div>



</div>









{

mode==="signup"

&&


<div>


<label className="text-sm text-gray-300">

Confirm Password

</label>


<div className="
flex
items-center
gap-3
bg-black/40
border
border-white/10
rounded-xl
px-4
py-3
mt-2
">


<Lock
size={18}
className="text-emerald-400"
/>


<input

required

type="password"

value={form.confirmPassword}

onChange={e=>
updateField(
"confirmPassword",
e.target.value
)
}

className="
bg-transparent
outline-none
text-white
w-full
"

placeholder="confirm password"

/>



</div>


</div>


}







{

message &&


<p className="
rounded-xl
bg-emerald-400/10
border
border-emerald-400/30
p-3
text-sm
text-emerald-300
">

{message}

</p>


}









<button

disabled={loading}

className="
flex
justify-center
items-center
gap-2
w-full
bg-emerald-400
text-black
font-semibold
rounded-xl
py-3
"

>


{

loading

?

"PROCESSING..."

:

mode==="login"

?

"AUTHENTICATE"

:

"CREATE ACCOUNT"

}


<ArrowRight size={18}/>


</button>



</form>









<div className="
my-6
flex
items-center
gap-3
">


<div className="h-px bg-white/10 flex-1"/>


<span className="text-xs text-gray-500">

OR CONTINUE

</span>


<div className="h-px bg-white/10 flex-1"/>


</div>








<button className="
w-full
border
border-white/10
rounded-xl
py-3
text-white
flex
justify-center
gap-3
bg-white/5
">


<Chrome size={18}/>

Continue with Google


</button>




<button className="
w-full
border
border-white/10
rounded-xl
py-3
text-white
flex
justify-center
gap-3
bg-white/5
mt-2
">


<Github size={18}/>

Continue with GitHub


</button>







<div className="
mt-6
text-center
text-xs
text-gray-500
font-mono
">


TLS 1.3 • ZERO TRUST • MFA READY


</div>
  </div>




</motion.div>




</motion.div>


}


</AnimatePresence>


)


}
