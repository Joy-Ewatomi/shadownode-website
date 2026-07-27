export type UserRole =
  | "admin"
  | "manager"
  | "analyst"
  | "investigator"
  | "researcher"
  | "client";


export const rolePermissions = {

  admin: [
    "view_all_cases",
    "assign_cases",
    "manage_users",
    "view_audit_logs",
    "create_graph"
  ],

  manager: [
    "view_cases",
    "assign_cases",
    "review_reports"
  ],


  analyst: [
    "view_assigned_cases",
    "create_graph",
    "add_sources",
    "add_entities",
    "create_reports"
  ],


  investigator: [
    "view_assigned_cases",
    "collect_information",
    "add_notes"
  ],


  researcher: [
    "search_sources",
    "add_sources"
  ],


  client: [
    "view_own_case",
    "send_messages"
  ]

};