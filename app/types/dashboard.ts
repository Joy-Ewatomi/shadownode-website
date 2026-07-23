export interface Case {
  id: string
  case_number: string
  title: string
  service_type: string

  status:
    | "submitted"
    | "active"
    | "completed"
    | "archived"

  progress: number

  assigned_to?: string

  created_at: string
}


export interface TimelineEvent {
  id: string

  title: string

  description: string

  date: string

  status:
    | "completed"
    | "current"
    | "pending"
}