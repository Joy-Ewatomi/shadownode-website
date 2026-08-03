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
  ClipboardList,
} from "lucide-react"

import type { Permission } from "@/lib/permission"


export type NavigationItem = {
  label: string
  href: string
  icon: React.ElementType
  permission: Permission
}


export function getNavigation(role: string): NavigationItem[] {
  return [
    {
      label: "Dashboard",
      href: role === "client"
        ? "/dashboard/client"
        : "/dashboard",
      icon: LayoutDashboard,
      permission: "dashboard:view",
    },

    {
      label: "Cases",
      href: role === "client"
        ? "/dashboard/client/cases"
        : "/dashboard/cases",
      icon: Shield,
      permission: "cases:view",
    },

    {
      label: "Requests",
      href: role === "client"
        ? "/dashboard/client/requests"
        : "/dashboard/requests",
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
      href: role === "client"
        ? "/dashboard/client/reports"
        : "/dashboard/reports",
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
      href: role === "client"
        ? "/dashboard/client/notifications"
        : "/dashboard/notifications",
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
      label: "Intelligence",
      href: "/dashboard/intelligence",
      icon: Search,
      permission: "intelligence:access",
    },

    {
      label: "Evidence Vault",
      href: "/dashboard/evidence",
      icon: Database,
      permission: "evidence:view",
    },

    {
      label: "Investigation",
      href: "/dashboard/investigator",
      icon: Shield,
      permission: "investigation:view",
    },

    {
      label: "Mission Control",
      href: "/dashboard/administrator",
      icon: Activity,
      permission: "mission:view",
    },

    {
      label: "Audit Logs",
      href: "/dashboard/audit-logs",
      icon: ClipboardList,
      permission: "audit:view",
    },
  ]
}