"use client"

import type { AppUser } from "@/lib/auth"
import { hasPermission } from "@/lib/permission"
import { getNavigation } from "@/components/dashboard/navigation"
import { useClientNotifications } from "@/components/notifications/ClientNotificationProvider"
import { BarChart3, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"


const roleLabels: Record<string, string> = {
  client: "Client",
  staff: "Staff",
  investigator: "Investigator",
  analyst: "Analyst",
  administrator: "Administrator",
  super_administrator: "Super Administrator",
}


export default function Sidebar({
  user,
  open,
  onClose,
}: {
  user: AppUser
  open: boolean
  onClose: () => void
}) {

  const pathname = usePathname()
  const { unreadByCategory } = useClientNotifications()


 const navItems = getNavigation(user.role).filter(
  (item) => hasPermission(user, item.permission)
)


  function isActive(href:string){

    if(href === "/dashboard"){
      return pathname === href
    }

    return pathname.startsWith(href)

  }


  return (
    <>

      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition lg:hidden ${
          open
          ? "opacity-100"
          : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />


      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#143b28] bg-[#04100b] transition-transform lg:translate-x-0 ${
          open
          ? "translate-x-0"
          : "-translate-x-full"
        }`}
      >


        {/* BRAND */}

        <div className="flex h-20 items-center justify-between border-b border-[#143b28] px-5">

          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#20dc73]/40 bg-[#20dc73]/10 font-mono font-bold text-[#20dc73]">
              SN
            </div>


            <div>

              <p className="font-mono text-sm font-bold tracking-[0.12em] text-white">
                SHADOWNODE
              </p>

              <p className="text-[11px] uppercase tracking-[0.18em] text-[#20dc73]">
                Operations Bureau
              </p>

            </div>


          </Link>


          <button
            onClick={onClose}
            className="rounded-md p-2 text-white/55 hover:bg-white/5 hover:text-white lg:hidden"
          >

            <X className="h-5 w-5"/>

          </button>


        </div>



        {/* USER INFO */}

        <div className="border-b border-[#143b28] px-5 py-4">

          <p className="truncate text-sm font-semibold text-white">
            {user.username}
          </p>

          <p className="truncate text-xs text-white/45">
            {user.email}
          </p>


          <span className="mt-3 inline-flex rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[#20dc73]">

            {roleLabels[user.role] || user.role}

          </span>


        </div>




        {/* NAVIGATION */}

        <nav className="flex-1 space-y-1 px-3 py-4">

          {navItems.map((item)=>{

            const active = isActive(item.href)

            const Icon = item.icon
            const categoryKey =
              item.label === "Requests"
                ? "requests"
                : item.label === "Cases"
                  ? "cases"
                  : item.label === "Messages"
                    ? "messages"
                    : item.label === "Reports"
                      ? "reports"
                      : item.label === "Training"
                        ? "training"
                        : item.label === "Certificates"
                          ? "certificates"
                          : item.label === "Billing"
                            ? "payments"
                            : ""
            const badge =
              categoryKey
                ? unreadByCategory[categoryKey] || 0
                : 0


            return (

              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm transition ${
                  active
                  ? "border border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"
                  : "text-white/68 hover:bg-white/5 hover:text-white"
                }`}
              >

                <Icon className="h-4 w-4"/>

                <span className="min-w-0 flex-1">
                  {item.label}
                </span>

                {badge > 0 && (
                  <span className="inline-flex min-w-5 justify-center rounded-full border border-[#20dc73]/40 bg-[#20dc73]/10 px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-[#20dc73]">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}


              </Link>

            )

          })}

        </nav>




        {/* STATUS */}

        <div className="border-t border-[#143b28] p-4">

          <div className="rounded-md border border-[#143b28] bg-black/30 p-3">

            <div className="flex items-center gap-2 text-xs text-white/55">

              <BarChart3 className="h-4 w-4 text-[#20dc73]" />

              Bureau network secure

            </div>

          </div>

        </div>


      </aside>

    </>
  )
}
