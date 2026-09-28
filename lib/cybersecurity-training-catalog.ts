export const CYBERSECURITY_TRAINING_SERVICES = [
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
  {
    id: "custom_training",
    title: "Custom Cybersecurity Training",
    description:
      "A tailored cybersecurity training programme defined by the client.",
  },
] as const;

export type CybersecurityTrainingServiceId =
  (typeof CYBERSECURITY_TRAINING_SERVICES)[number]["id"];

const SERVICE_IDS = new Set<string>(
  CYBERSECURITY_TRAINING_SERVICES.map((service) => service.id),
);

export function isCybersecurityTrainingServiceId(
  value: string,
): value is CybersecurityTrainingServiceId {
  return SERVICE_IDS.has(value.trim().toLowerCase());
}

export function normalizeCybersecurityTrainingServiceType(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "professional_training"
    ? "cybersecurity_training"
    : normalized;
}
