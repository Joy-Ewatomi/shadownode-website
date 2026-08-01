import {
 LayoutDashboard,
 Shield,
 FileText,
 Users,
 Settings,
 Bell,
 MessageSquare,
 Search,
 Database,
 Activity,
 ClipboardList
} from "lucide-react"

import type { Permission } from "@/lib/permission"


export type NavigationItem = {
  label: string
  href: string
  icon: React.ElementType
  permission: Permission
}


export const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard:view",
  },

  {
    label: "Cases",
    href: "/dashboard/cases",
    icon: Shield,
    permission: "cases:view",
  },

  {
    label: "Requests",
    href: "/dashboard/requests",
    icon: FileText,
    permission: "requests:view",
  },

  {
    label: "Team",
    href: "/dashboard/team",
    icon: Users,
    permission: "team:view",
  },

  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
    permission: "reports:view",
  },

  {
    label: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
    permission: "messages:view",
  },

  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    permission: "notifications:view",
  },

  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    permission: "settings:view",
  },

{
 label:"Intelligence",
 href:"/dashboard/intelligence",
 icon:Search,
 permission:"intelligence:access",
},


{
 label:"Evidence Vault",
 href:"/dashboard/evidence",
 icon:Database,
 permission:"evidence:view",
},


{
 label:"Investigation",
 href:"/dashboard/investigator",
 icon:Shield,
 permission:"investigation:view",
},


{
 label:"Mission Control",
 href:"/dashboard/administrator",
 icon:Activity,
 permission:"mission:view",
},


{
 label:"Audit Logs",
 href:"/dashboard/audit-logs",
 icon:ClipboardList,
 permission:"audit:view",
}
]