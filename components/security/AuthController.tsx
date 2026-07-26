"use client";

import { useState } from "react";
import AuthModal from "./AuthModal";


type Mode = "login" | "signup";


export default function AuthController(){

const [open,setOpen]=useState(false);

const [mode,setMode]=useState<Mode>("login");



function openLogin(){

setMode("login");
setOpen(true);

}



function openSignup(){

setMode("signup");
setOpen(true);

}



return (

<>

<button
onClick={openLogin}
>
Login
</button>


<button
onClick={openSignup}
>
Signup
</button>



<AuthModal

isOpen={open}

onClose={()=>setOpen(false)}

initialMode={mode}

/>


</>


)

}