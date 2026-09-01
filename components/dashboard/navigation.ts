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
  History,
  GraduationCap,
} from "lucide-react"
import type { ElementType } from "react"

import type { Permission } from "@/lib/permission"

export type NavigationItem = {
  label: string
  href: string
  icon: ElementType
  permission: Permission
}

export function getNavigation(role: string): NavigationItem[] {
  const isClient = role === "client"
  const isAdministrator = role === "administrator"
  const isSuperAdministrator =
    role === "super_administrator"

  return [
    // =====================================================
    // DASHBOARD
    // =====================================================

    {
      label: "Dashboard",
      href: isClient
        ? "/dashboard/client"
        : "/dashboard",
      icon: LayoutDashboard,
      permission: "dashboard:view",
    },

    // =====================================================
    // INVESTIGATION CASES
    // =====================================================

    {
      label: "Cases",
      href: isClient
        ? "/dashboard/client/cases"
        : "/dashboard/cases",
      icon: Shield,
      permission: "cases:view",
    },

    // =====================================================
    // TRAINING ENGAGEMENTS
    // =====================================================
    //
    // Training is intentionally separate from Cases.
    //
    // Investigation:
    // Request → Case
    //
    // Training:
    // Request → Training Engagement
    //
    // The individual engagement will have its own
    // workspace for:
    //
    // Overview
    // Training Plan
    // Materials
    // Schedule
    // Progress
    // Updates
    // Tasks
    // Feedback
    // Certificate
    //
    // =====================================================

    {
      label: "Training",
      href: isClient
        ? "/dashboard/client/training"
        : "/dashboard/training",
      icon: GraduationCap,
      permission: "training:view",
    },

    // =====================================================
    // ACTIVE REQUESTS
    // =====================================================

    {
      label: "Requests",
      href: isClient
        ? "/dashboard/client/requests"
        : "/dashboard/requests",
      icon: FileText,
      permission: "requests:view",
    },

    // =====================================================
    // REQUEST HISTORY
    // =====================================================

    ...(isAdministrator
      ? [
          {
            label: "Request History",
            href: "/dashboard/administrator/request-history",
            icon: History,
            permission:
              "requests:history:view" as Permission,
          },
        ]
      : []),

    ...(isSuperAdministrator
      ? [
          {
            label: "Request History",
            href: "/dashboard/super-administrator/request-history",
            icon: History,
            permission:
              "requests:history:view" as Permission,
          },
        ]
      : []),

    // =====================================================
    // TEAM
    // =====================================================

    {
      label: "Team",
      href: "/dashboard/team",
      icon: Users,
      permission: "team:view",
    },

    // =====================================================
    // REPORTS
    // =====================================================

    {
      label: "Reports",
      href: isClient
        ? "/dashboard/client/reports"
        : "/dashboard/reports",
      icon: FileText,
      permission: "reports:view",
    },

    // =====================================================
    // MESSAGES
    // =====================================================

    {
      label: "Messages",
      href: "/dashboard/messages",
      icon: MessageSquare,
      permission: "messages:view",
    },

    // =====================================================
    // NOTIFICATIONS
    // =====================================================

    {
      label: "Notifications",
      href: isClient
        ? "/dashboard/client/notifications"
        : "/dashboard/notifications",
      icon: Bell,
      permission: "notifications:view",
    },

    // =====================================================
    // SETTINGS
    // =====================================================

    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      permission: "settings:view",
    },

    // =====================================================
    // INTELLIGENCE
    // =====================================================

    {
      label: "Intelligence",
      href: "/dashboard/intelligence",
      icon: Search,
      permission: "intelligence:access",
    },

    // =====================================================
    // EVIDENCE VAULT
    // =====================================================

    {
      label: "Evidence Vault",
      href: "/dashboard/evidence",
      icon: Database,
      permission: "evidence:view",
    },

    // =====================================================
    // INVESTIGATION
    // =====================================================

    {
      label: "Investigation",
      href: "/dashboard/investigator",
      icon: Shield,
      permission: "investigation:view",
    },

    // =====================================================
    // MISSION CONTROL
    // =====================================================

    {
      label: "Mission Control",
      href: "/dashboard/administrator",
      icon: Activity,
      permission: "mission:view",
    },

    // =====================================================
    // AUDIT LOGS
    // =====================================================

    {
      label: "Audit Logs",
      href: "/dashboard/audit-logs",
      icon: ClipboardList,
      permission: "audit:view",
    },
  ]
}