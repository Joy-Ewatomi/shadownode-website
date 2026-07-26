"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {

  const router = useRouter();


  async function handleLogout() {

    try {

      await fetch("/api/auth/logout", {
        method: "POST",
      });


      router.push("/login");

      router.refresh();


    } catch (error) {

      console.error("Logout failed:", error);

    }

  }


  return (

    <button

      onClick={handleLogout}

      className="
      flex
      items-center
      gap-2
      rounded-lg
      border
      border-red-500/30
      bg-red-500/10
      px-4
      py-2
      text-red-400
      transition
      hover:bg-red-500/20
      "

    >

      <LogOut size={16}/>

      Logout

    </button>

  );

}