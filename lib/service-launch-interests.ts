export const SERVICE_LAUNCH_NAMES = {
  digital_forensics: "Digital Forensics",
  ethical_hacking: "Ethical Hacking",
  government_consulting: "Government Consulting",
  correctional_intelligence: "Correctional Intelligence",
  legal_advisory: "Legal Advisory",
  research_threat_intelligence: "Research & Threat Intelligence",
  opsec_consulting: "OPSEC Consulting",
} as const

export const SERVICE_LAUNCH_STATUSES = ["active", "notified", "unsubscribed"] as const

export type ServiceLaunchKey = keyof typeof SERVICE_LAUNCH_NAMES
export type ServiceLaunchStatus = (typeof SERVICE_LAUNCH_STATUSES)[number]

export function isServiceLaunchKey(value: unknown): value is ServiceLaunchKey {
  return typeof value === "string" && value in SERVICE_LAUNCH_NAMES
}

export function isServiceLaunchStatus(value: unknown): value is ServiceLaunchStatus {
  return typeof value === "string" && SERVICE_LAUNCH_STATUSES.includes(value as ServiceLaunchStatus)
}
