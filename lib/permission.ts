import type { AppUser } from "./auth"

// =========================================================
// PERMISSIONS
// =========================================================

export type Permission =

  // =======================================================
  // DASHBOARD
  // =======================================================

  | "dashboard:view"

  // =======================================================
  // INVESTIGATION CASES
  // =======================================================

  | "cases:view"
  | "cases:create"
  | "cases:assign"

  // =======================================================
  // TRAINING ENGAGEMENTS
  // =======================================================

  | "training:view"
  | "training:assign"
  | "training:manage"
  | "training:materials"
  | "training:progress"
  | "training:updates"
  | "training:feedback"
  | "training:certificate"

  // =======================================================
  // REQUESTS
  // =======================================================

  | "requests:view"
  | "requests:approve"
  | "requests:history:view"

  // =======================================================
  // TEAM
  // =======================================================

  | "team:view"
  | "team:manage"

  // =======================================================
  // REPORTS
  // =======================================================

  | "reports:view"

  // =======================================================
  // INTELLIGENCE
  // =======================================================

  | "intelligence:access"

  // =======================================================
  // EVIDENCE
  // =======================================================

  | "evidence:view"
  | "evidence:manage"

  // =======================================================
  // INVESTIGATION WORKSPACE
  // =======================================================

  | "investigation:view"

  // =======================================================
  // MISSION CONTROL
  // =======================================================

  | "mission:view"

  // =======================================================
  // MESSAGES
  // =======================================================

  | "messages:view"

  // =======================================================
  // NOTIFICATIONS
  // =======================================================

  | "notifications:view"

  // =======================================================
  // SETTINGS
  // =======================================================

  | "settings:view"
  | "settings:manage"

  // =======================================================
  // AUDIT
  // =======================================================

  | "audit:view"


// =========================================================
// ROLE PERMISSIONS
// =========================================================

type RolePermission = Permission | "*"


export const rolePermissions: Record<
  string,
  RolePermission[]
> = {

  // =======================================================
  // CLIENT
  // =======================================================
  //
  // Clients can view their own training engagements.
  //
  // They cannot:
  // - assign trainers
  // - upload/manage materials
  // - modify progress
  // - issue certificates
  //
  // Those actions are controlled by the training staff.
  // =======================================================

  client: [

    "dashboard:view",

    "cases:view",

    "training:view",

    "requests:view",

    "reports:view",

    "messages:view",

    "notifications:view",

  ],


  // =======================================================
  // INVESTIGATOR
  // =======================================================
  //
  // Investigation role.
  //
  // No training permissions by default.
  // =======================================================

  investigator: [

    "dashboard:view",

    "cases:view",

    "reports:view",

    "messages:view",

    "notifications:view",

    "evidence:view",

    "investigation:view",

  ],


  // =======================================================
  // ANALYST
  // =======================================================
  //
  // Intelligence / investigation role.
  //
  // No training permissions by default.
  // =======================================================

  analyst: [

    "dashboard:view",

    "cases:view",

    "reports:view",

    "messages:view",

    "notifications:view",

    "intelligence:access",

    "evidence:view",

    "investigation:view",

  ],


  // =======================================================
  // ADMINISTRATOR
  // =======================================================
  //
  // Administrators can manage operational training
  // engagements.
  //
  // This includes:
  //
  // - viewing training engagements
  // - assigning trainers
  // - managing training
  // - uploading materials
  // - managing progress
  // - posting updates
  // - reviewing feedback
  // - managing certificates
  //
  // =======================================================

  administrator: [

    "dashboard:view",

    "cases:view",

    "cases:assign",

    // -------------------------------------------------------
    // TRAINING
    // -------------------------------------------------------

    "training:view",

    "training:assign",

    "training:manage",

    "training:materials",

    "training:progress",

    "training:updates",

    "training:feedback",

    "training:certificate",

    // -------------------------------------------------------
    // REQUESTS
    // -------------------------------------------------------

    "requests:view",

    "requests:approve",

    "requests:history:view",

    // -------------------------------------------------------
    // TEAM
    // -------------------------------------------------------

    "team:view",

    "team:manage",

    // -------------------------------------------------------
    // REPORTS
    // -------------------------------------------------------

    "reports:view",

    // -------------------------------------------------------
    // AUDIT
    // -------------------------------------------------------

    "audit:view",

    // -------------------------------------------------------
    // MESSAGES
    // -------------------------------------------------------

    "messages:view",

    // -------------------------------------------------------
    // EVIDENCE
    // -------------------------------------------------------

    "evidence:view",

    // -------------------------------------------------------
    // NOTIFICATIONS
    // -------------------------------------------------------

    "notifications:view",

    // -------------------------------------------------------
    // MISSION CONTROL
    // -------------------------------------------------------

    "mission:view",

    // -------------------------------------------------------
    // SETTINGS
    // -------------------------------------------------------

    "settings:view",

  ],


  // =======================================================
  // SUPER ADMINISTRATOR
  // =======================================================
  //
  // Full system access.
  //
  // The wildcard means every Permission is allowed,
  // including all current and future permissions.
  //
  // =======================================================

  super_administrator: [

    "*"

  ],

}


// =========================================================
// PERMISSION CHECK
// =========================================================

export function hasPermission(
  user: AppUser,
  permission: Permission,
): boolean {

  const permissions =
    rolePermissions[user.role] ?? []


  // -------------------------------------------------------
  // SUPER ADMINISTRATOR
  // -------------------------------------------------------

  if (
    permissions.includes("*" as never)
  ) {

    return true

  }


  // -------------------------------------------------------
  // NORMAL ROLE PERMISSION
  // -------------------------------------------------------

  return permissions.includes(
    permission,
  )

}