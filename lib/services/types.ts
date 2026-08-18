export type ServiceFieldType =
  | "text"
  | "textarea"
  | "select"
  | "date"
  | "number"
  | "email"
  | "tel"
  | "url"
  | "checkbox"

export type ServiceField = {
  name: string
  label: string
  type: ServiceFieldType
  required?: boolean
  options?: string[]
  placeholder?: string
  description?: string
}

export type ServiceStep = {
  id: number
  title: string
  description?: string
  fields: ServiceField[]
}

export type ServiceDefinition = {
  id: string
  title: string
  description: string
  steps: ServiceStep[]
}
