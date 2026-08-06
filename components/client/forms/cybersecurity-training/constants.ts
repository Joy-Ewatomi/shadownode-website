import {
  CybersecurityService,
  CybersecurityTrainingFormData,
} from "./types"

export const CYBERSECURITY_SERVICES: CybersecurityService[] = [
  {
    id: "professional_training",
    title: "Professional Cybersecurity Training",
    description:
      "Hands-on technical cybersecurity training for IT professionals, SOC analysts, DFIR teams, OSINT analysts, penetration testers and security engineers.",
  },
  {
    id: "security_awareness",
    title: "Security Awareness Training",
    description:
      "Security awareness programmes designed for employees to recognize phishing, malware, password attacks, insider threats and social engineering.",
  },
  {
    id: "digital_safety",
    title: "Digital Safety Education",
    description:
      "Digital safety education for individuals, students and families covering privacy, safe internet usage, identity protection and online scams.",
  },
  {
    id: "security_assessment",
    title: "Security Assessment & Advisory",
    description:
      "Assessment of an organization's security maturity with recommendations, improvement roadmaps and cybersecurity guidance.",
  },
]

export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  Nigeria: "NGN",
  "United States": "USD",
  Canada: "CAD",
  India: "INR",
  Ghana: "GHS",
  Kenya: "KES",
  Germany: "EUR",
  France: "EUR",
  Italy: "EUR",
  Spain: "EUR",
  Australia: "AUD",
  Japan: "JPY",
  China: "CNY",
  Singapore: "SGD",
}

export const COUNTRY_OPTIONS = Object.keys(
  COUNTRY_CURRENCY_MAP
).sort()

export const TRAINING_FORMATS = [
  "Live Online",
  "Self-Paced",
  "Hybrid",
]

export const TRAINING_DURATION_OPTIONS = [
  "2 Hours",
  "Half Day",
  "Full Day",
  "2 Days",
  "1 Week",
  "Custom",
]

export const TRAINING_AUDIENCE_OPTIONS = [
  "Employees",
  "Executives",
  "IT Team",
  "Security Team",
  "Students",
  "Government",
  "General Public",
  "Mixed Audience",
  "Custom",
]

export const INDUSTRIES = [
  "Education",
  "Healthcare",
  "Finance",
  "Government",
  "Technology",
  "Manufacturing",
  "Retail",
  "Energy",
  "Legal",
  "NGO",
  "Other",
]

export const TRAINING_OBJECTIVES = [
  "Improve Security Awareness",
  "Reduce Phishing Risk",
  "Executive Awareness",
  "Incident Response Readiness",
  "OSINT Skills",
  "Digital Forensics",
  "Threat Intelligence",
  "Compliance",
  "Cloud Security",
  "Network Security",
  "Custom",
]

export const TRAINING_TOPICS = [
  "Passwords",
  "Phishing",
  "Social Engineering",
  "Email Security",
  "Mobile Security",
  "Cloud Security",
  "OSINT",
  "Digital Forensics",
  "Incident Response",
  "Threat Hunting",
  "AI Security",
  "Dark Web",
  "Custom",
]

export const TRAINING_MATERIALS = [
  "Slides",
  "Labs",
  "Videos",
  "Exercises",
  "Assessments",
  "Printed Manuals",
  "Certificates",
]

export const COMPLIANCE_STANDARDS = [
  "No Specific Requirement",
  "ISO 27001",
  "NIST",
  "PCI DSS",
  "GDPR",
  "NDPR",
  "HIPAA",
  "CIS Controls",
]

export const TRAINING_CERTIFICATE_OPTIONS = [
  "Completion Certificate",
  "Assessment Certificate",
  "No Certificate",
]

export const TRAINING_OUTCOME_OPTIONS = [
  "Improve Security Awareness",
  "Reduce Phishing Risk",
  "Meet Organizational Policy",
  "Upskill Security Team",
  "Prepare for Certification",
  "Improve Incident Readiness",
  "Custom",
]

export const TRAINING_BUDGET_OPTIONS = [
  "Under ₦500,000",
  "₦500,000 - ₦2,000,000",
  "₦2,000,000 - ₦5,000,000",
  "Above ₦5,000,000",
  "Custom",
]

export const STEPS = [
  {
    id: 1,
    label: "Training Service",
  },
  {
    id: 2,
    label: "Training Details",
  },
  {
    id: 3,
    label: "Communication",
  },
  {
    id: 4,
    label: "Review & Authorization",
  },
]

export const EMPTY_FORM: CybersecurityTrainingFormData = {
  category: "cybersecurity",

  service_type: "",

  training_organization_name: "",
  training_client_type: "organization",
  training_participant_count: "",
  training_skill_level: "beginner",

  training_audience: "",
  training_industry: "",

  training_goal: "",

  training_topics_selected: [],
  training_objectives: [],

  training_custom_topic: "",

  training_format: "",
  training_duration: "",

  training_materials: [],
  training_compliance: [],

  training_certificate: "",

  training_expected_outcome: "",

  training_assessment_required: false,
  training_labs_required: false,

  training_preferred_start_date: "",
  training_preferred_completion_date: "",

  training_timeline_flexible: false,

  training_additional_requirements: "",

  client_country: "",
  preferred_currency: "",

  communication_method: "portal_notification",

  communication_email: "",
  communication_country_code: "",
  communication_phone: "",
  communication_whatsapp: "",
  communication_signal: "",

  authorization_confirmed: false,
}