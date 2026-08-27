import type { AppUser } from "./auth"

export type Permission =
  | "dashboard:view"
  | "cases:view"
  | "cases:create"
  | "cases:assign"
  | "requests:view"
  | "requests:approve"
  | "team:view"
  | "team:manage"
  | "reports:view"
  | "audit:view"
  | "intelligence:access"
  | "evidence:view"
  | "evidence:manage"
  | "investigation:view"
  | "mission:view"
  | "settings:view"
  | "settings:manage"
  | "messages:view"
  | "notifications:view"
  | "requests:history:view"


type RolePermission = Permission | "*"


export const rolePermissions: Record<string, RolePermission[]> = {

client:[
 "dashboard:view",
 "cases:view",
 "requests:view",
 "reports:view",
 "messages:view",
 "notifications:view",
],


investigator:[
 "dashboard:view",
 "cases:view",
 "reports:view",
 "messages:view",
 "notifications:view",
 "evidence:view",
 "investigation:view",
],


analyst:[
 "dashboard:view",
 "cases:view",
 "reports:view",
 "messages:view",
 "notifications:view",
 "intelligence:access",
 "evidence:view",
 "investigation:view",
],


administrator:[
 "dashboard:view",
 "cases:view",
 "cases:assign",
 "requests:view",
 "requests:approve",
 "requests:history:view",
 "team:view",
 "team:manage",
 "reports:view",
 "audit:view",
 "messages:view",
 "evidence:view",
 "notifications:view",
 "mission:view",
 "settings:view",
],


super_administrator:[
 "*"
]

}


export function hasPermission(
 user:AppUser,
 permission:Permission
){

const permissions =
rolePermissions[user.role] ?? []


if(
permissions.includes("*" as never)
){
 return true
}


return permissions.includes(permission)

}