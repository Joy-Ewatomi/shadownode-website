"use client"

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  FileCheck2,
  FileText,
  Globe,
  Loader2,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react"
import {
  useCallback,
  useState,
} from "react"

import CommunicationSection from "./cybersecurity-training/sections/CommunicationSection"

/* ============================================================
   SERVICE DEFINITIONS
============================================================ */

const OSINT_SERVICES = [
  "Digital Identity Analysis",
  "Mobile & Digital Device OSINT Identification",
  "Target Communication History Reconstruction",
  "Browser Cache & Historical Target Discovery",
  "Global Geolocation Metadata Extraction",
  "Platform Cross-Correlation Analysis",
  "Documented Background Profile Verification",
  "Deep-Web Domain Infrastructure Audits",
  "Litigation Evidence Package Preparation",
]

const INVESTIGATION_DEPTHS = [
  {
    value: "basic",
    label: "Basic Review",
    desc: "High-level overview and initial assessment",
  },
  {
    value: "standard",
    label: "Standard Investigation",
    desc: "Thorough investigation following standard procedures",
  },
  {
    value: "deep",
    label: "Deep Investigation",
    desc: "In-depth analysis with expanded resource allocation",
  },
  {
    value: "comprehensive",
    label: "Comprehensive Intelligence Report",
    desc: "Full-scale intelligence operation with detailed reporting",
  },
]

const PRIORITY_LEVELS = [
  {
    value: "low",
    label: "Low",
    desc: "No time pressure – standard processing",
  },
  {
    value: "normal",
    label: "Normal",
    desc: "Standard turnaround expected",
  },
  {
    value: "high",
    label: "High",
    desc: "Expedited processing requested",
  },
  {
    value: "critical",
    label: "Critical",
    desc: "Immediate attention required",
  },
]

const SUBJECT_TYPES = [
  {
    value: "person",
    label: "Person",
    icon: User,
  },
  {
    value: "company",
    label: "Company",
    icon: Building2,
  },
  {
    value: "digital_asset",
    label: "Digital Asset",
    icon: Globe,
  },
]

const LINK_TYPES = [
  "Facebook",
  "X",
  "Instagram",
  "LinkedIn",
  "TikTok",
  "Website",
  "News Article",
  "Other",
]

const OBJECTIVE_EXAMPLES = [
  "Identity verification",
  "Background verification",
  "Fraud investigation",
  "Digital footprint analysis",
  "Evidence preparation",
  "Threat analysis",
  "Security training request",
]

/* ============================================================
   COUNTRY → CURRENCY
============================================================ */

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  Nigeria: "NGN",
  "United States": "USD",
  "United Kingdom": "GBP",
  Canada: "CAD",
  India: "INR",
  "South Africa": "ZAR",
  Ghana: "GHS",
  Kenya: "KES",
  Egypt: "EGP",
  Morocco: "MAD",
  Germany: "EUR",
  France: "EUR",
  Italy: "EUR",
  Spain: "EUR",
  Netherlands: "EUR",
  Australia: "AUD",
  Brazil: "BRL",
  Mexico: "MXN",
  Japan: "JPY",
  China: "CNY",
  UAE: "AED",
  "Saudi Arabia": "SAR",
  Singapore: "SGD",
  Switzerland: "CHF",
  Sweden: "SEK",
  Norway: "NOK",
  Poland: "PLN",
  Turkey: "TRY",
}

function getCurrencyForCountry(
  country: string,
): string {
  return (
    COUNTRY_CURRENCY_MAP[country] ||
    "USD"
  )
}

/* ============================================================
   TYPES
============================================================ */

type SupportingLink = {
  type: string
  url: string
}

export type EvidenceFile = {
  id: string
  name: string
  size: number
  type: string
  file?: File
}

export type InvestigationFormData = {
  title: string

  category: string
  service_type: string

  investigation_objective: string

  subject_type: string
  subject_full_name: string
  subject_known_usernames: string
  subject_emails: string
  subject_phone_numbers: string
  subject_location: string
  subject_organization: string
  subject_websites: string

  subject_company_name: string
  subject_company_website: string
  subject_company_country: string
  subject_company_industry: string

  subject_domain: string
  subject_url: string
  subject_ip_address: string
  subject_platform: string

  show_additional_info: boolean
  subject_approximate_age: string
  subject_height: string
  subject_weight: string
  subject_hair_color: string
  subject_eye_color: string
  subject_skin_tone: string
  subject_distinguishing_marks: string
  subject_nationality: string
  subject_languages_spoken: string
  subject_last_known_address: string
  subject_last_known_occupation: string
  subject_additional_usernames: string
  subject_gaming_ids: string
  subject_cryptocurrency_wallets: string
  subject_domain_names: string
  subject_ip_addresses: string
  subject_vehicle_registration: string

  existing_information: string
  supporting_links: SupportingLink[]
  additional_notes: string
  evidence_files: EvidenceFile[]

  investigation_depth: string

  urgency: string
  osint_completion_date: string

  communication_method: string
  communication_email: string
  communication_country_code: string
  communication_phone: string
  communication_whatsapp: string
  communication_signal: string
  client_country: string
  preferred_currency: string
  custom_country: string
  custom_description: string

  authorization_confirmed: boolean

  description: string
}

/* ============================================================
   EMPTY FORM
============================================================ */

function createEmptyForm(): InvestigationFormData {
  return {
    title: "",

    category: "osint",
    service_type: "",

    investigation_objective: "",

    subject_type: "person",
    subject_full_name: "",
    subject_known_usernames: "",
    subject_emails: "",
    subject_phone_numbers: "",
    subject_location: "",
    subject_organization: "",
    subject_websites: "",

    subject_company_name: "",
    subject_company_website: "",
    subject_company_country: "",
    subject_company_industry: "",

    subject_domain: "",
    subject_url: "",
    subject_ip_address: "",
    subject_platform: "",

    show_additional_info: false,

    subject_approximate_age: "",
    subject_height: "",
    subject_weight: "",
    subject_hair_color: "",
    subject_eye_color: "",
    subject_skin_tone: "",
    subject_distinguishing_marks: "",
    subject_nationality: "",
    subject_languages_spoken: "",
    subject_last_known_address: "",
    subject_last_known_occupation: "",

    subject_additional_usernames: "",
    subject_gaming_ids: "",
    subject_cryptocurrency_wallets: "",
    subject_domain_names: "",
    subject_ip_addresses: "",
    subject_vehicle_registration: "",

    existing_information: "",
    supporting_links: [],
    additional_notes: "",
    evidence_files: [],

    investigation_depth: "standard",

    urgency: "normal",
    osint_completion_date: "",

    communication_method: "portal",
    communication_email: "",
    communication_country_code: "",
    communication_phone: "",
    communication_whatsapp: "",
    communication_signal: "",

    client_country: "",
    preferred_currency: "",
    custom_country: "",
    custom_description: "",

    authorization_confirmed: false,

    description: "",
  }
}

/* ============================================================
   STEP DEFINITIONS
============================================================ */

type StepDefinition = {
  id: number
  label: string
  shortLabel: string
  description: string
  icon: typeof Sparkles
}

const STEPS: StepDefinition[] = [
  {
    id: 1,
    label: "Service Selection",
    shortLabel: "Service",
    description:
      "Choose the intelligence service required for your investigation.",
    icon: Sparkles,
  },
  {
    id: 2,
    label: "Investigation Objective",
    shortLabel: "Objective",
    description:
      "Tell us what you need the investigation to determine or establish.",
    icon: Target,
  },
  {
    id: 3,
    label: "Subject / Target",
    shortLabel: "Target",
    description:
      "Provide the identifying information available about the subject.",
    icon: User,
  },
  {
    id: 4,
    label: "Supporting Intelligence",
    shortLabel: "Evidence",
    description:
      "Provide existing intelligence, links, files, and useful context.",
    icon: FileText,
  },
  {
    id: 5,
    label: "Investigation Scope",
    shortLabel: "Scope",
    description:
      "Select the level of investigation and reporting required.",
    icon: ShieldCheck,
  },
  {
    id: 6,
    label: "Priority & Timeline",
    shortLabel: "Priority",
    description:
      "Tell us how urgently the investigation should be completed.",
    icon: Calendar,
  },
  {
    id: 7,
    label: "Communication",
    shortLabel: "Contact",
    description:
      "Choose how ShadowNode should communicate with you.",
    icon: MessageCircle,
  },
  {
    id: 8,
    label: "Review & Authorization",
    shortLabel: "Review",
    description:
      "Review your investigation brief and confirm lawful authorization.",
    icon: FileCheck2,
  },
]

/* ============================================================
   PROPS
============================================================ */

type Props = {
  onSubmit: (
    data: InvestigationFormData,
  ) => Promise<void>

  submitting: boolean
}

/* ============================================================
   REUSABLE INPUT
============================================================ */

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  className,
  note,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  note?: string
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[#143b28] bg-black/60 px-3.5 text-sm text-white outline-none placeholder:text-white/25 transition focus:border-[#20dc73]/50 focus:bg-black"
      />

      {note ? (
        <p className="mt-1.5 text-[10px] leading-4 text-white/25">
          {note}
        </p>
      ) : null}
    </div>
  )
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function InvestigationForm({
  onSubmit,
  submitting,
}: Props) {
  const [form, setForm] =
    useState<InvestigationFormData>(
      {
        ...createEmptyForm(),
        communication_method: "portal",
      },
    )

  const [step, setStep] = useState(1)

  const [supportingLinkInput, setSupportingLinkInput] =
    useState<SupportingLink>({
      type: "Website",
      url: "",
    })

  const [lastFileError, setLastFileError] =
    useState("")

  const [mobileStepsOpen, setMobileStepsOpen] =
    useState(false)

  /* ==========================================================
     FORM UPDATE
  ========================================================== */

  const set = useCallback(
    (
      patch: Partial<InvestigationFormData>,
    ) => {
      setForm((previous) => ({
        ...previous,
        ...patch,
      }))
    },
    [],
  )

  /* ==========================================================
     COUNTRY
  ========================================================== */

  const handleCountryChange =
    useCallback(
      (country: string) => {
        const currency =
          getCurrencyForCountry(country)

        set({
          client_country: country,
          preferred_currency:
            currency,
        })
      },
      [set],
    )

  /* ==========================================================
     FILE HANDLING
  ========================================================== */

  const handleFileAdd =
    useCallback(
      (files: FileList | null) => {
        if (!files) {
          return
        }

        setLastFileError("")

        const newFiles: EvidenceFile[] = []
        const currentCount = form.evidence_files.length
        const currentSize = form.evidence_files.reduce(
          (total, file) => total + file.size,
          0,
        )

        for (
          let index = 0;
          index < files.length;
          index++
        ) {
          const file = files[index]

          const MAX_SIZE =
            50 * 1024 * 1024

          if (currentCount + newFiles.length >= 10) {
            setLastFileError(
              "A maximum of 10 evidence files can be submitted with one request.",
            )
            break
          }

          if (file.size > MAX_SIZE) {
            setLastFileError(
              `"${file.name}" exceeds the 50MB limit and has been skipped.`,
            )
            continue
          }

          const pendingSize = newFiles.reduce(
            (total, pending) => total + pending.size,
            0,
          )
          if (currentSize + pendingSize + file.size > 100 * 1024 * 1024) {
            setLastFileError(
              "The combined evidence upload cannot exceed 100MB.",
            )
            continue
          }

          newFiles.push({
            id:
              typeof crypto !==
                "undefined" &&
              typeof crypto.randomUUID ===
                "function"
                ? crypto.randomUUID()
                : `${Date.now()}-${index}`,
            name: file.name,
            size: file.size,
            type: file.type,
            file,
          })
        }

        setForm((previous) => ({
          ...previous,
          evidence_files: [
            ...previous.evidence_files,
            ...newFiles,
          ],
        }))
      },
      [form.evidence_files],
    )

  const removeEvidenceFile =
    useCallback((id: string) => {
      setForm((previous) => ({
        ...previous,
        evidence_files:
          previous.evidence_files.filter(
            (file) =>
              file.id !== id,
          ),
      }))
    }, [])

  /* ==========================================================
     SUPPORTING LINKS
  ========================================================== */

  const addSupportingLink =
    useCallback(() => {
      const url =
        supportingLinkInput.url.trim()

      if (!url) {
        return
      }

      setForm((previous) => ({
        ...previous,
        supporting_links: [
          ...previous.supporting_links,
          {
            ...supportingLinkInput,
            url,
          },
        ],
      }))

      setSupportingLinkInput({
        type: "Website",
        url: "",
      })
    }, [supportingLinkInput])

  const removeSupportingLink =
    useCallback((index: number) => {
      setForm((previous) => ({
        ...previous,
        supporting_links:
          previous.supporting_links.filter(
            (_, itemIndex) =>
              itemIndex !== index,
          ),
      }))
    }, [])

  /* ==========================================================
     VALIDATION
  ========================================================== */

  function canProceed(): boolean {
    switch (step) {
      case 1:
        if (!form.service_type) {
          return false
        }

        if (
          form.service_type ===
          "custom"
        ) {
          return (
            form.custom_description.trim()
              .length >= 10
          )
        }

        return true

      case 2:
        return (
          form.investigation_objective.trim()
            .length >= 5
        )

      case 3:
        if (form.service_type === "custom") {
          return true
        }

        switch (
          form.subject_type
        ) {
          case "person":
            return Boolean(
              form.subject_full_name.trim() ||
                form.subject_known_usernames.trim() ||
                form.subject_emails.trim() ||
                form.subject_phone_numbers.trim(),
            )

          case "company":
            return Boolean(
              form.subject_company_name.trim(),
            )

          case "digital_asset":
            return Boolean(
              form.subject_domain.trim() ||
                form.subject_url.trim(),
            )

          default:
            return false
        }

      case 4:
        return true

      case 5:
        return Boolean(
          form.investigation_depth,
        )

      case 6:
        return Boolean(
          form.urgency,
        )

      case 7:
        if (
          !form.client_country ||
          (
            form.client_country ===
              "custom" &&
            !form.custom_country.trim()
          )
        ) {
          return false
        }

        if (
          !form.communication_method
        ) {
          return false
        }

        switch (
          form.communication_method
        ) {
          case "email":
            return Boolean(
              form.communication_email.trim(),
            )

          case "phone":
            return Boolean(
              form.communication_phone.trim(),
            )

          case "whatsapp":
            return Boolean(
              form.communication_whatsapp.trim(),
            )

          case "portal":
          case "portal_notification":
            return true

          default:
            return false
        }

      case 8:
        return (
          form.authorization_confirmed
        )

      default:
        return false
    }
  }

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  function nextStep() {
    if (
      !canProceed() ||
      submitting
    ) {
      return
    }

    if (
      step <
      STEPS.length
    ) {
      setStep(
        (current) =>
          current + 1,
      )
    }
  }

  function prevStep() {
    if (
      step > 1 &&
      !submitting
    ) {
      setStep(
        (current) =>
          current - 1,
      )
    }
  }

  function jumpToStep(
    targetStep: number,
  ) {
    if (
      submitting ||
      targetStep > step ||
      targetStep < 1
    ) {
      return
    }

    setStep(targetStep)
    setMobileStepsOpen(false)
  }

  /* ==========================================================
     SUBMIT
  ========================================================== */

  async function handleSubmit() {
    if (
      !canProceed() ||
      submitting
    ) {
      return
    }

    const isCustom =
      form.service_type ===
      "custom"

    const customText =
      form.custom_description.trim()

    const title = isCustom
      ? customText ||
        "OSINT Investigation"
      : form.title.trim() ||
        form.service_type.trim() ||
        "OSINT Investigation"

    const serviceDescription =
      isCustom
        ? customText
        : `Service: ${form.service_type}`

    const description = [
      serviceDescription,

      `Objective: ${form.investigation_objective}`,

      `Subject Type: ${form.subject_type}`,

      form.subject_full_name
        ? `Subject Name: ${form.subject_full_name}`
        : "",

      form.subject_known_usernames
        ? `Known Usernames: ${form.subject_known_usernames}`
        : "",

      form.subject_emails
        ? `Emails: ${form.subject_emails}`
        : "",

      form.subject_phone_numbers
        ? `Phone Numbers: ${form.subject_phone_numbers}`
        : "",

      form.subject_location
        ? `Location: ${form.subject_location}`
        : "",

      form.subject_organization
        ? `Organization: ${form.subject_organization}`
        : "",

      form.subject_websites
        ? `Known Websites: ${form.subject_websites}`
        : "",

      form.subject_company_name
        ? `Company: ${form.subject_company_name}`
        : "",

      form.subject_company_website
        ? `Company Website: ${form.subject_company_website}`
        : "",

      form.subject_company_country
        ? `Company Country: ${form.subject_company_country}`
        : "",

      form.subject_company_industry
        ? `Company Industry: ${form.subject_company_industry}`
        : "",

      form.subject_domain
        ? `Domain: ${form.subject_domain}`
        : "",

      form.subject_url
        ? `URL: ${form.subject_url}`
        : "",

      form.subject_ip_address
        ? `IP Address: ${form.subject_ip_address}`
        : "",

      form.subject_platform
        ? `Platform: ${form.subject_platform}`
        : "",

      form.existing_information
        ? `Supporting Intelligence: ${form.existing_information}`
        : "",

      form.additional_notes
        ? `Additional Notes: ${form.additional_notes}`
        : "",
    ]
      .filter(Boolean)
      .join("\n")

    await onSubmit({
      ...form,
      title,
      description,
      custom_description:
        isCustom
          ? customText
          : "",
    })
  }

  /* ==========================================================
     SUMMARY HELPERS
  ========================================================== */

  function subjectSummary() {
    if (
      form.subject_type ===
      "company"
    ) {
      return (
        form.subject_company_name ||
        "Company details"
      )
    }

    if (
      form.subject_type ===
      "digital_asset"
    ) {
      return (
        form.subject_domain ||
        form.subject_url ||
        "Digital asset"
      )
    }

    return (
      form.subject_full_name ||
      form.subject_known_usernames ||
      "Person details"
    )
  }

  function isStepComplete(
    targetStep: number,
  ) {
    if (targetStep === step) {
      return false
    }

    switch (targetStep) {
      case 1:
        return Boolean(
          form.service_type,
        )

      case 2:
        return (
          form.investigation_objective.trim()
            .length >= 5
        )

      case 3:
        if (form.service_type === "custom") {
          return true
        }

        return Boolean(
          subjectSummary() &&
            subjectSummary() !==
              "Person details",
        )

      case 4:
        return (
          Boolean(
            form.existing_information.trim(),
          ) ||
          form.supporting_links.length >
            0 ||
          form.evidence_files.length >
            0 ||
          Boolean(
            form.additional_notes.trim(),
          )
        )

      case 5:
        return Boolean(
          form.investigation_depth,
        )

      case 6:
        return Boolean(
          form.urgency,
        )

      case 7:
        return Boolean(
          form.client_country &&
            form.communication_method,
        )

      case 8:
        return Boolean(
          form.authorization_confirmed,
        )

      default:
        return false
    }
  }

  /* ==========================================================
     STEP 1
  ========================================================== */

  function renderStep1() {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm leading-6 text-white/45">
            Select the intelligence operation that best matches your requirement.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {OSINT_SERVICES.map(
            (service) => {
              const active =
                form.service_type ===
                service

              return (
                <button
                  key={service}
                  type="button"
                  onClick={() =>
                    set({
                      service_type:
                        service,
                      custom_description:
                        "",
                    })
                  }
                  className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-[#20dc73]/60 bg-[#20dc73]/8"
                      : "border-[#143b28] bg-black/20 hover:border-white/15 hover:bg-white/[0.02]"
                  }`}
                >
                  {active ? (
                    <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#20dc73]">
                      <Check className="h-3 w-3 text-black" />
                    </div>
                  ) : null}

                  <div className="flex items-start gap-3 pr-6">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        active
                          ? "bg-[#20dc73]/10 text-[#20dc73]"
                          : "bg-black/30 text-white/25"
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </div>

                    <div>
                      <p
                        className={`text-sm font-semibold leading-5 ${
                          active
                            ? "text-[#20dc73]"
                            : "text-white/75"
                        }`}
                      >
                        {service}
                      </p>

                      <p className="mt-1 text-[10px] leading-4 text-white/25">
                        Intelligence operation
                      </p>
                    </div>
                  </div>
                </button>
              )
            },
          )}

        </div>
      </div>
    )
  }

  /* ==========================================================
     STEP 2
  ========================================================== */

  function renderStep2() {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#143b28] bg-black/20 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#20dc73]/10 text-[#20dc73]">
              <Target className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                {form.service_type === "custom"
                  ? "What outcome do you need?"
                  : "What should the investigation establish?"}
              </p>

              <p className="mt-1 text-xs leading-5 text-white/35">
                {form.service_type === "custom"
                  ? "Describe what you want the bureau to deliver and what a successful result should look like."
                  : "Describe the specific question, concern, or outcome you need ShadowNode to investigate."}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
            Common objectives
          </label>

          <div className="flex flex-wrap gap-2">
            {OBJECTIVE_EXAMPLES.map(
              (example) => {
                const active =
                  form.investigation_objective ===
                  example

                return (
                  <button
                    key={example}
                    type="button"
                    onClick={() =>
                      set({
                        investigation_objective:
                          example,
                      })
                    }
                    className={`rounded-full border px-3.5 py-2 text-[11px] transition ${
                      active
                        ? "border-[#20dc73]/50 bg-[#20dc73]/8 text-[#20dc73]"
                        : "border-[#143b28] bg-black/20 text-white/45 hover:border-white/15 hover:text-white/70"
                    }`}
                  >
                    {example}
                  </button>
                )
              },
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#143b28] bg-black/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
              {form.service_type === "custom"
                ? "Requested outcome"
                : "Investigation objective"}
            </label>

            <span
              className={`font-mono text-[10px] ${
                form.investigation_objective.length >=
                5
                  ? "text-[#20dc73]"
                  : "text-white/25"
              }`}
            >
              {
                form.investigation_objective
                  .length
              } chars
            </span>
          </div>

          <textarea
            value={
              form.investigation_objective
            }
            onChange={(event) =>
              set({
                investigation_objective:
                  event.target.value,
              })
            }
            placeholder={
              form.service_type === "custom"
                ? "Example: Design and build a secure portal where our team can submit cases, exchange evidence, and receive reports."
                : "Example: Determine whether this individual is using multiple online identities and establish which public profiles appear to belong to the same person."
            }
            className="mt-3 min-h-40 w-full rounded-xl border border-[#143b28] bg-black px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 transition focus:border-[#20dc73]/50"
          />

          <p className="mt-2 text-[10px] text-white/25">
            Minimum 5 characters.
          </p>
        </div>
      </div>
    )
  }

  /* ==========================================================
     STEP 3
  ========================================================== */

  function renderStep3() {
    if (form.service_type === "custom") {
      return (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#143b28] bg-black/20 p-5">
            <p className="text-sm font-semibold text-white">
              Project context
            </p>
            <p className="mt-1 text-xs leading-5 text-white/35">
              Share any background, current systems, constraints, audience, or examples that will help the bureau assess the request.
            </p>

            <textarea
              value={form.existing_information}
              onChange={(event) =>
                set({
                  existing_information: event.target.value,
                })
              }
              rows={7}
              placeholder="Optional context, technical requirements, users, integrations, references, budget expectations, or other relevant details..."
              className="mt-4 w-full rounded-xl border border-[#143b28] bg-black px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 transition focus:border-[#20dc73]/50"
            />
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm leading-6 text-white/45">
            Provide whatever identifying information you currently have. You do not need to know every field.
          </p>
        </div>

        {/* Subject types */}
        <div className="grid gap-3 sm:grid-cols-3">
          {SUBJECT_TYPES.map(
            (subject) => {
              const Icon =
                subject.icon

              const active =
                form.subject_type ===
                subject.value

              return (
                <button
                  key={subject.value}
                  type="button"
                  onClick={() =>
                    set({
                      subject_type:
                        subject.value,
                    })
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-[#20dc73]/55 bg-[#20dc73]/8"
                      : "border-[#143b28] bg-black/20 hover:border-white/15"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      active
                        ? "bg-[#20dc73]/10 text-[#20dc73]"
                        : "bg-black/30 text-white/25"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <p
                    className={`mt-3 text-sm font-semibold ${
                      active
                        ? "text-[#20dc73]"
                        : "text-white/70"
                    }`}
                  >
                    {subject.label}
                  </p>

                  <p className="mt-1 text-[10px] text-white/25">
                    Investigation target
                  </p>
                </button>
              )
            },
          )}
        </div>

        {/* Person */}
        {form.subject_type ===
        "person" ? (
          <div className="rounded-2xl border border-[#143b28] bg-black/20 p-5">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
                Person Identification
              </p>

              <p className="mt-1 text-[11px] text-white/30">
                Any one of these identifiers can help begin the investigation.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Full Name"
                value={
                  form.subject_full_name
                }
                onChange={(value) =>
                  set({
                    subject_full_name:
                      value,
                  })
                }
              />

              <FormInput
                label="Known Usernames"
                value={
                  form.subject_known_usernames
                }
                onChange={(value) =>
                  set({
                    subject_known_usernames:
                      value,
                  })
                }
                placeholder="Comma-separated"
              />

              <FormInput
                label="Email Addresses"
                value={
                  form.subject_emails
                }
                onChange={(value) =>
                  set({
                    subject_emails:
                      value,
                  })
                }
                placeholder="Comma-separated"
              />

              <FormInput
                label="Phone Numbers"
                value={
                  form.subject_phone_numbers
                }
                onChange={(value) =>
                  set({
                    subject_phone_numbers:
                      value,
                  })
                }
                placeholder="Comma-separated"
              />

              <FormInput
                label="Known Location"
                value={
                  form.subject_location
                }
                onChange={(value) =>
                  set({
                    subject_location:
                      value,
                  })
                }
              />

              <FormInput
                label="Organization / Company"
                value={
                  form.subject_organization
                }
                onChange={(value) =>
                  set({
                    subject_organization:
                      value,
                  })
                }
              />

              <FormInput
                label="Known Websites / Social Profiles"
                value={
                  form.subject_websites
                }
                onChange={(value) =>
                  set({
                    subject_websites:
                      value,
                  })
                }
                placeholder="Comma-separated URLs"
                className="sm:col-span-2"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                set({
                  show_additional_info:
                    !form.show_additional_info,
                })
              }
              className="mt-5 flex w-full items-center justify-between rounded-xl border border-[#143b28] bg-black/20 px-4 py-3 text-left transition hover:border-white/15"
            >
              <div className="flex items-center gap-3">
                <Plus className="h-4 w-4 text-[#20dc73]" />

                <div>
                  <p className="text-xs font-semibold text-white/70">
                    Additional identifying information
                  </p>

                  <p className="mt-0.5 text-[10px] text-white/25">
                    Optional physical and digital details
                  </p>
                </div>
              </div>

              {form.show_additional_info ? (
                <ChevronUp className="h-4 w-4 text-white/25" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/25" />
              )}
            </button>

            {form.show_additional_info ? (
              <div className="mt-4 space-y-6 rounded-xl border border-[#143b28]/70 bg-black/20 p-4">
                <div>
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                    Physical Description
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput
                      label="Approximate Age"
                      value={
                        form.subject_approximate_age
                      }
                      onChange={(value) =>
                        set({
                          subject_approximate_age:
                            value,
                        })
                      }
                      placeholder="e.g. 30-35"
                    />

                    <FormInput
                      label="Height"
                      value={
                        form.subject_height
                      }
                      onChange={(value) =>
                        set({
                          subject_height:
                            value,
                        })
                      }
                      placeholder="e.g. 5'10"
                    />

                    <FormInput
                      label="Weight"
                      value={
                        form.subject_weight
                      }
                      onChange={(value) =>
                        set({
                          subject_weight:
                            value,
                        })
                      }
                      placeholder="e.g. 75kg"
                    />

                    <FormInput
                      label="Hair Color"
                      value={
                        form.subject_hair_color
                      }
                      onChange={(value) =>
                        set({
                          subject_hair_color:
                            value,
                        })
                      }
                    />

                    <FormInput
                      label="Eye Color"
                      value={
                        form.subject_eye_color
                      }
                      onChange={(value) =>
                        set({
                          subject_eye_color:
                            value,
                        })
                      }
                    />

                    <FormInput
                      label="Skin Tone"
                      value={
                        form.subject_skin_tone
                      }
                      onChange={(value) =>
                        set({
                          subject_skin_tone:
                            value,
                        })
                      }
                    />

                    <FormInput
                      label="Nationality"
                      value={
                        form.subject_nationality
                      }
                      onChange={(value) =>
                        set({
                          subject_nationality:
                            value,
                        })
                      }
                    />

                    <FormInput
                      label="Languages Spoken"
                      value={
                        form.subject_languages_spoken
                      }
                      onChange={(value) =>
                        set({
                          subject_languages_spoken:
                            value,
                        })
                      }
                      placeholder="Comma-separated"
                    />

                    <FormInput
                      label="Distinguishing Marks / Tattoos"
                      value={
                        form.subject_distinguishing_marks
                      }
                      onChange={(value) =>
                        set({
                          subject_distinguishing_marks:
                            value,
                        })
                      }
                      className="sm:col-span-2"
                    />

                    <FormInput
                      label="Last Known Address"
                      value={
                        form.subject_last_known_address
                      }
                      onChange={(value) =>
                        set({
                          subject_last_known_address:
                            value,
                        })
                      }
                      className="sm:col-span-2"
                    />

                    <FormInput
                      label="Last Known Occupation"
                      value={
                        form.subject_last_known_occupation
                      }
                      onChange={(value) =>
                        set({
                          subject_last_known_occupation:
                            value,
                        })
                      }
                      className="sm:col-span-2"
                    />
                  </div>
                </div>

                <div className="border-t border-[#143b28]/70 pt-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                    Digital Information
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput
                      label="Additional Usernames"
                      value={
                        form.subject_additional_usernames
                      }
                      onChange={(value) =>
                        set({
                          subject_additional_usernames:
                            value,
                        })
                      }
                      placeholder="Comma-separated"
                    />

                    <FormInput
                      label="Gaming IDs"
                      value={
                        form.subject_gaming_ids
                      }
                      onChange={(value) =>
                        set({
                          subject_gaming_ids:
                            value,
                        })
                      }
                      placeholder="Steam, Xbox, PSN..."
                    />

                    <FormInput
                      label="Cryptocurrency Wallets"
                      value={
                        form.subject_cryptocurrency_wallets
                      }
                      onChange={(value) =>
                        set({
                          subject_cryptocurrency_wallets:
                            value,
                        })
                      }
                    />

                    <FormInput
                      label="Domain Names"
                      value={
                        form.subject_domain_names
                      }
                      onChange={(value) =>
                        set({
                          subject_domain_names:
                            value,
                        })
                      }
                      placeholder="Comma-separated"
                    />

                    <FormInput
                      label="IP Addresses"
                      value={
                        form.subject_ip_addresses
                      }
                      onChange={(value) =>
                        set({
                          subject_ip_addresses:
                            value,
                        })
                      }
                      placeholder="Comma-separated"
                    />

                    <FormInput
                      label="Vehicle Registration"
                      value={
                        form.subject_vehicle_registration
                      }
                      onChange={(value) =>
                        set({
                          subject_vehicle_registration:
                            value,
                        })
                      }
                      note="Only where lawful and applicable."
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Company */}
        {form.subject_type ===
        "company" ? (
          <div className="rounded-2xl border border-[#143b28] bg-black/20 p-5">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
              Company Identification
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Company Name"
                value={
                  form.subject_company_name
                }
                onChange={(value) =>
                  set({
                    subject_company_name:
                      value,
                  })
                }
              />

              <FormInput
                label="Company Website"
                value={
                  form.subject_company_website
                }
                onChange={(value) =>
                  set({
                    subject_company_website:
                      value,
                  })
                }
                placeholder="https://"
              />

              <FormInput
                label="Country"
                value={
                  form.subject_company_country
                }
                onChange={(value) =>
                  set({
                    subject_company_country:
                      value,
                  })
                }
              />

              <FormInput
                label="Industry"
                value={
                  form.subject_company_industry
                }
                onChange={(value) =>
                  set({
                    subject_company_industry:
                      value,
                  })
                }
              />
            </div>
          </div>
        ) : null}

        {/* Digital asset */}
        {form.subject_type ===
        "digital_asset" ? (
          <div className="rounded-2xl border border-[#143b28] bg-black/20 p-5">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
              Digital Asset Identification
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Domain"
                value={
                  form.subject_domain
                }
                onChange={(value) =>
                  set({
                    subject_domain:
                      value,
                  })
                }
                placeholder="example.com"
              />

              <FormInput
                label="URL"
                value={
                  form.subject_url
                }
                onChange={(value) =>
                  set({
                    subject_url:
                      value,
                  })
                }
                placeholder="https://"
              />

              <FormInput
                label="IP Address"
                value={
                  form.subject_ip_address
                }
                onChange={(value) =>
                  set({
                    subject_ip_address:
                      value,
                  })
                }
              />

              <FormInput
                label="Platform"
                value={
                  form.subject_platform
                }
                onChange={(value) =>
                  set({
                    subject_platform:
                      value,
                  })
                }
                placeholder="Platform / service"
              />
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  /* ==========================================================
     STEP 4
  ========================================================== */

  function renderStep4() {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm leading-6 text-white/45">
            Give our analysts the context, links, and files you already have. Everything here is optional.
          </p>
        </div>

        {/* Existing intelligence */}
        <div className="rounded-2xl border border-[#143b28] bg-black/20 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#20dc73]/10 text-[#20dc73]">
              <FileText className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Existing Intelligence
              </p>

              <p className="mt-1 text-[10px] leading-5 text-white/30">
                Previous findings, observations, known facts, or context.
              </p>
            </div>
          </div>

          <textarea
            value={
              form.existing_information
            }
            onChange={(event) =>
              set({
                existing_information:
                  event.target.value,
              })
            }
            placeholder="Tell us what you already know..."
            className="mt-4 min-h-32 w-full rounded-xl border border-[#143b28] bg-black px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/50"
          />
        </div>

        {/* Links */}
        <div className="rounded-2xl border border-[#143b28] bg-black/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">
                Supporting Links
              </p>

              <p className="mt-1 text-[10px] text-white/30">
                Public profiles, websites, articles, or resources.
              </p>
            </div>

            <span className="rounded-full border border-[#143b28] bg-black/30 px-2.5 py-1 text-[9px] font-mono text-white/30">
              {form.supporting_links.length} added
            </span>
          </div>

          {form.supporting_links.length >
          0 ? (
            <div className="mt-4 space-y-2">
              {form.supporting_links.map(
                (link, index) => (
                  <div
                    key={`${link.url}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-[#143b28] bg-black/30 px-3 py-3"
                  >
                    <span className="shrink-0 rounded-full bg-[#20dc73]/8 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#20dc73]">
                      {link.type}
                    </span>

                    <span className="min-w-0 flex-1 truncate text-xs text-white/55">
                      {link.url}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        removeSupportingLink(
                          index,
                        )
                      }
                      className="shrink-0 rounded-lg p-1.5 text-white/20 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ),
              )}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-[150px_1fr_auto]">
            <select
              value={
                supportingLinkInput.type
              }
              onChange={(event) =>
                setSupportingLinkInput(
                  (previous) => ({
                    ...previous,
                    type: event.target.value,
                  }),
                )
              }
              className="h-11 rounded-xl border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/50"
            >
              {LINK_TYPES.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ),
              )}
            </select>

            <input
              value={
                supportingLinkInput.url
              }
              onChange={(event) =>
                setSupportingLinkInput(
                  (previous) => ({
                    ...previous,
                    url: event.target.value,
                  }),
                )
              }
              placeholder="https://"
              className="h-11 rounded-xl border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/50"
            />

            <button
              type="button"
              onClick={
                addSupportingLink
              }
              disabled={
                !supportingLinkInput.url.trim()
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#20dc73] px-4 text-sm font-bold text-black transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        {/* Evidence */}
        <div className="rounded-2xl border border-[#143b28] bg-black/20 p-5">
          <div>
            <p className="text-sm font-semibold text-white">
              Evidence Files
            </p>

            <p className="mt-1 text-[10px] leading-5 text-white/30">
              Screenshots, documents, PDFs, images, videos, audio, datasets, or related files.
            </p>
          </div>

          <label className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#143b28] bg-black/20 px-5 py-7 text-center transition hover:border-[#20dc73]/35 hover:bg-[#20dc73]/[0.02]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#20dc73]/8 text-[#20dc73]">
              <Upload className="h-5 w-5" />
            </div>

            <p className="mt-3 text-sm font-medium text-white/55">
              <span className="text-[#20dc73]">
                Click to upload
              </span>{" "}
              or drag and drop
            </p>

            <p className="mt-1 text-[10px] text-white/25">
              Maximum 50MB per file
            </p>

            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.mp4,.mov,.avi,.mp3,.wav,.zip,.csv,.xls,.xlsx"
              className="hidden"
              onChange={(event) =>
                handleFileAdd(
                  event.target.files,
                )
              }
            />
          </label>

          {lastFileError ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-3 text-xs text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {lastFileError}
              </span>
            </div>
          ) : null}

          {form.evidence_files.length >
          0 ? (
            <div className="mt-4 space-y-2">
              {form.evidence_files.map(
                (file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-xl border border-[#143b28] bg-black/30 px-3 py-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#20dc73]/8">
                      <FileText className="h-4 w-4 text-[#20dc73]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white/65">
                        {file.name}
                      </p>

                      <p className="mt-0.5 text-[9px] text-white/25">
                        {(
                          file.size /
                          1024 /
                          1024
                        ).toFixed(1)}{" "}
                        MB
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeEvidenceFile(
                          file.id,
                        )
                      }
                      className="rounded-lg p-1.5 text-white/20 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ),
              )}
            </div>
          ) : null}
        </div>

        {/* Notes */}
        <div className="rounded-2xl border border-[#143b28] bg-black/20 p-5">
          <p className="text-sm font-semibold text-white">
            Additional Notes
          </p>

          <p className="mt-1 text-[10px] text-white/30">
            Add any other context or instructions for our analysts.
          </p>

          <textarea
            value={
              form.additional_notes
            }
            onChange={(event) =>
              set({
                additional_notes:
                  event.target.value,
              })
            }
            placeholder="Additional information..."
            className="mt-4 min-h-24 w-full rounded-xl border border-[#143b28] bg-black px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/50"
          />
        </div>
      </div>
    )
  }

  /* ==========================================================
     STEP 5
  ========================================================== */

  function renderStep5() {
    return (
      <div className="space-y-5">
        <p className="text-sm leading-6 text-white/45">
          Select the investigation depth you need. ShadowNode will use this to determine the appropriate operational scope.
        </p>

        <div className="grid gap-3">
          {INVESTIGATION_DEPTHS.map(
            (depth) => {
              const active =
                form.investigation_depth ===
                depth.value

              return (
                <button
                  key={depth.value}
                  type="button"
                  onClick={() =>
                    set({
                      investigation_depth:
                        depth.value,
                    })
                  }
                  className={`group flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-[#20dc73]/55 bg-[#20dc73]/8"
                      : "border-[#143b28] bg-black/20 hover:border-white/15"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-[10px] ${
                      active
                        ? "bg-[#20dc73] text-black"
                        : "border border-[#143b28] bg-black/20 text-white/30"
                    }`}
                  >
                    {active ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      depth.value
                        .slice(0, 1)
                        .toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        active
                          ? "text-[#20dc73]"
                          : "text-white/75"
                      }`}
                    >
                      {depth.label}
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-white/30">
                      {depth.desc}
                    </p>
                  </div>

                  {active ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#20dc73]" />
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0 text-white/15 transition group-hover:text-white/30" />
                  )}
                </button>
              )
            },
          )}
        </div>
      </div>
    )
  }

  /* ==========================================================
     STEP 6
  ========================================================== */

  function renderStep6() {
    return (
      <div className="space-y-5">
        <p className="text-sm leading-6 text-white/45">
          Set the priority and the date by which you would ideally like the investigation completed.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {PRIORITY_LEVELS.map(
            (priority) => {
              const active =
                form.urgency ===
                priority.value

              return (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() =>
                    set({
                      urgency:
                        priority.value,
                    })
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-[#20dc73]/55 bg-[#20dc73]/8"
                      : "border-[#143b28] bg-black/20 hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className={`text-sm font-semibold ${
                        active
                          ? "text-[#20dc73]"
                          : "text-white/75"
                      }`}
                    >
                      {priority.label}
                    </p>

                    {active ? (
                      <CheckCircle2 className="h-4 w-4 text-[#20dc73]" />
                    ) : null}
                  </div>

                  <p className="mt-1.5 text-[10px] leading-5 text-white/30">
                    {priority.desc}
                  </p>
                </button>
              )
            },
          )}
        </div>

        <div className="rounded-2xl border border-[#143b28] bg-black/20 p-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#20dc73]" />

            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
              Preferred completion date
            </label>
          </div>

          <input
            type="date"
            value={
              form.osint_completion_date
            }
            onChange={(event) =>
              set({
                osint_completion_date:
                  event.target.value,
              })
            }
            className="mt-4 h-11 w-full rounded-xl border border-[#143b28] bg-black px-4 text-sm text-white outline-none transition focus:border-[#20dc73]/50"
          />

          <p className="mt-2 text-[10px] leading-4 text-white/25">
            Optional. This is your preferred target date and not a guaranteed completion date.
          </p>
        </div>
      </div>
    )
  }

  /* ==========================================================
     STEP 7
  ========================================================== */

  function renderStep7() {
    return (
      <div className="space-y-5">
        <p className="text-sm leading-6 text-white/45">
          Choose the country associated with this request and how you would like ShadowNode to communicate with you.
        </p>

        <div className="rounded-2xl border border-[#143b28] bg-black/20 p-5">
          <CommunicationSection
            allowPortal
            country={
              form.client_country
            }
            customCountry={
              form.custom_country
            }
            communicationMethod={
              form.communication_method
            }
            email={
              form.communication_email
            }
            whatsapp={
              form.communication_whatsapp
            }
            signal={
              form.communication_signal
            }
            onCountryChange={(
              value: string,
            ) => {
              if (
                value ===
                "custom"
              ) {
                set({
                  client_country:
                    value,
                  preferred_currency:
                    "",
                })

                return
              }

              handleCountryChange(
                value,
              )
            }}
            onCustomCountryChange={(
              value: string,
            ) =>
              set({
                custom_country:
                  value,
              })
            }
            onMethodChange={(
              value: string,
            ) =>
              set({
                communication_method:
                  value,
              })
            }
            onEmailChange={(
              value: string,
            ) =>
              set({
                communication_email:
                  value,
              })
            }
            onWhatsappChange={(
              value: string,
            ) =>
              set({
                communication_whatsapp:
                  value,
              })
            }
            onSignalChange={(
              value: string,
            ) =>
              set({
                communication_signal:
                  value,
              })
            }
          />
        </div>
      </div>
    )
  }

  /* ==========================================================
     STEP 8
  ========================================================== */

  function getSummaryItems() {
    const items = [
      {
        label: "Division",
        value:
          form.service_type === "custom"
            ? "Bureau Services"
            : "OSINT Operations",
      },
      {
        label: "Service",
        value:
          form.service_type ===
          "custom"
            ? form.custom_description ||
              "Custom Request"
            : form.service_type,
      },
      {
        label: "Objective",
        value:
          form.investigation_objective,
      },
      {
        label: "Subject",
        value:
          form.subject_type.replace(
            "_",
            " ",
          ),
      },
      {
        label: "Target",
        value:
          subjectSummary(),
      },
      {
        label: "Depth",
        value:
          INVESTIGATION_DEPTHS.find(
            (item) =>
              item.value ===
              form.investigation_depth,
          )?.label ||
          "",
      },
      {
        label: "Priority",
        value:
          PRIORITY_LEVELS.find(
            (item) =>
              item.value ===
              form.urgency,
          )?.label ||
          "",
      },
      {
        label: "Country",
        value:
          form.client_country ===
          "custom"
            ? form.custom_country
            : form.client_country,
      },
      {
        label: "Currency",
        value:
          form.preferred_currency,
      },
      {
        label: "Communication",
        value:
          form.communication_method.replace(
            /_/g,
            " ",
          ),
      },
      {
        label: "Completion Target",
        value:
          form.osint_completion_date ||
          "Not specified",
      },
    ]

    if (form.service_type === "custom") {
      return items.filter(
        (item) =>
          item.label !== "Subject" &&
          item.label !== "Target" &&
          item.label !== "Depth",
      )
    }

    return items
  }

  function renderStep8() {
    const summaryItems =
      getSummaryItems()

    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#143b28] bg-black/20 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#20dc73]/10 text-[#20dc73]">
              <FileCheck2 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Investigation Brief
              </p>

              <p className="mt-1 text-[10px] leading-5 text-white/30">
                Review the information that will be sent to ShadowNode Operations.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {summaryItems.map(
              (item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[#143b28] bg-black/20 p-3.5"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                    {item.label}
                  </p>

                  <p className="mt-1.5 break-words text-xs leading-5 text-white/70">
                    {item.value ||
                      "Not provided"}
                  </p>
                </div>
              ),
            )}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#143b28] bg-black/20 p-3.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                Supporting Links
              </p>

              <p className="mt-1.5 text-xs text-white/70">
                {
                  form.supporting_links
                    .length
                }{" "}
                link
                {form.supporting_links.length ===
                1
                  ? ""
                  : "s"}{" "}
                provided
              </p>
            </div>

            <div className="rounded-xl border border-[#143b28] bg-black/20 p-3.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                Evidence Files
              </p>

              <p className="mt-1.5 text-xs text-white/70">
                {
                  form.evidence_files
                    .length
                }{" "}
                file
                {form.evidence_files.length ===
                1
                  ? ""
                  : "s"}{" "}
                attached
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200/90">
                Legal Authorization
              </p>

              <p className="mt-2 text-xs leading-6 text-amber-100/55">
                By submitting this request, you confirm that you have lawful authority to request this investigation and that the information supplied is accurate to the best of your knowledge.
              </p>
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#143b28] bg-black/20 p-5 transition hover:border-[#20dc73]/30">
          <input
            id="osint-auth-check"
            type="checkbox"
            checked={
              form.authorization_confirmed
            }
            onChange={(event) =>
              set({
                authorization_confirmed:
                  event.target
                    .checked,
              })
            }
            className="mt-1 h-4 w-4 shrink-0 accent-[#20dc73]"
          />

          <span className="text-xs leading-6 text-white/65">
            I confirm that I have{" "}
            <strong className="text-white">
              lawful authorization
            </strong>{" "}
            to request this investigation and that the information provided is accurate to the best of my knowledge.
          </span>
        </label>

        {submitting ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[#143b28] bg-black/20 py-4 text-xs text-[#20dc73]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting investigation request...
          </div>
        ) : null}
      </div>
    )
  }

  /* ==========================================================
     RENDER STEP
  ========================================================== */

  function renderStep() {
    switch (step) {
      case 1:
        return renderStep1()

      case 2:
        return renderStep2()

      case 3:
        return renderStep3()

      case 4:
        return renderStep4()

      case 5:
        return renderStep5()

      case 6:
        return renderStep6()

      case 7:
        return renderStep7()

      case 8:
        return renderStep8()

      default:
        return null
    }
  }

  /* ==========================================================
     CURRENT STEP
  ========================================================== */

  const currentStep =
    STEPS.find(
      (item) =>
        item.id === step,
    ) || STEPS[0]

  const CurrentIcon =
    currentStep.icon

  const completedSteps =
    STEPS.filter(
      (item) =>
        isStepComplete(
          item.id,
        ),
    ).length

  const progress =
    (step / STEPS.length) *
    100

  /* ==========================================================
     MAIN RENDER
  ========================================================== */

  return (
    <div className="w-full">
      {/* ======================================================
          MOBILE HEADER
      ====================================================== */}

      <div className="mb-4 overflow-hidden rounded-2xl border border-[#143b28] bg-[#06110f] lg:hidden">
        <button
          type="button"
          onClick={() =>
            setMobileStepsOpen(
              (current) =>
                !current,
            )
          }
          className="flex w-full items-center gap-3 p-4 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#20dc73]/25 bg-[#20dc73]/8">
            <CurrentIcon className="h-5 w-5 text-[#20dc73]" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#20dc73]">
              Investigation Intake · Step{" "}
              {step}/{STEPS.length}
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-white">
              {currentStep.label}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-[9px] text-white/25">
              {Math.round(
                progress,
              )}
              %
            </span>

            {mobileStepsOpen ? (
              <ChevronUp className="h-4 w-4 text-white/30" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white/30" />
            )}
          </div>
        </button>

        <div className="mx-4 mb-4 h-1 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-[#20dc73] transition-all duration-300"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        {mobileStepsOpen ? (
          <div className="border-t border-[#143b28] p-3">
            <div className="grid gap-1">
              {STEPS.map(
                (item) => {
                  const Icon =
                    item.icon

                  const active =
                    item.id ===
                    step

                  const complete =
                    isStepComplete(
                      item.id,
                    )

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        jumpToStep(
                          item.id,
                        )
                      }
                      disabled={
                        item.id >
                          step ||
                        submitting
                      }
                      className={`flex items-center gap-3 rounded-xl p-3 text-left ${
                        active
                          ? "bg-[#20dc73]/8"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                          active
                            ? "border-[#20dc73] bg-[#20dc73] text-black"
                            : complete
                              ? "border-[#20dc73]/30 bg-[#20dc73]/8 text-[#20dc73]"
                              : "border-[#143b28] text-white/25"
                        }`}
                      >
                        {complete ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Icon className="h-3.5 w-3.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white/65">
                          {item.label}
                        </p>

                        <p className="mt-0.5 text-[9px] text-white/25">
                          Step{" "}
                          {item.id}
                        </p>
                      </div>
                    </button>
                  )
                },
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* ======================================================
          MAIN WIZARD
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-[#143b28] bg-[#06110f] shadow-[0_20px_70px_rgba(0,0,0,0.2)]">
        <div className="grid lg:grid-cols-[245px_1fr]">
          {/* ==================================================
              DESKTOP RAIL
          ================================================== */}

          <aside className="hidden border-r border-[#143b28] bg-black/20 lg:block">
            <div className="sticky top-6 p-5">
              <div className="mb-7">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#20dc73]" />

                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#20dc73]">
                    Secure Intake
                  </span>
                </div>

                <h2 className="mt-3 text-lg font-bold text-white">
                  OSINT Investigation
                </h2>

                <p className="mt-2 text-[11px] leading-5 text-white/30">
                  Build a structured intelligence request for ShadowNode Operations.
                </p>
              </div>

              <div className="relative space-y-1">
                <div className="absolute left-[18px] top-5 bottom-5 w-px bg-[#143b28]" />

                <div
                  className="absolute left-[18px] top-5 w-px bg-[#20dc73] transition-all duration-300"
                  style={{
                    height: `${Math.max(
                      0,
                      progress - 12.5,
                    )}%`,
                  }}
                />

                {STEPS.map(
                  (item) => {
                    const Icon =
                      item.icon

                    const active =
                      item.id ===
                      step

                    const complete =
                      isStepComplete(
                        item.id,
                      )

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          jumpToStep(
                            item.id,
                          )
                        }
                        disabled={
                          item.id >
                            step ||
                          submitting
                        }
                        className={`relative z-10 flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${
                          active
                            ? "bg-[#20dc73]/7"
                            : complete
                              ? "hover:bg-white/[0.02]"
                              : "opacity-55"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                            active
                              ? "border-[#20dc73] bg-[#20dc73] text-black"
                              : complete
                                ? "border-[#20dc73]/35 bg-[#20dc73]/8 text-[#20dc73]"
                                : "border-[#143b28] bg-[#06110f] text-white/25"
                          }`}
                        >
                          {complete ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-[11px] font-semibold ${
                              active
                                ? "text-white"
                                : complete
                                  ? "text-white/60"
                                  : "text-white/40"
                            }`}
                          >
                            {item.label}
                          </p>

                          <p className="mt-0.5 text-[8px] uppercase tracking-[0.12em] text-white/20">
                            {complete
                              ? "Completed"
                              : active
                                ? "Current"
                                : `Stage ${item.id}`}
                          </p>
                        </div>
                      </button>
                    )
                  },
                )}
              </div>

              <div className="mt-8 rounded-xl border border-[#143b28] bg-[#06110f] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-white/30">
                    Request Progress
                  </span>

                  <span className="font-mono text-[10px] text-[#20dc73]">
                    {Math.round(
                      progress,
                    )}
                    %
                  </span>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-[#20dc73] transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-[9px] text-white/20">
                  {completedSteps} of{" "}
                  {STEPS.length} stages
                  completed
                </p>
              </div>

              <div className="mt-3 flex items-center gap-2 text-[9px] text-white/20">
                <ShieldCheck className="h-3.5 w-3.5 text-[#20dc73]/60" />

                <span>
                  Protected ShadowNode submission
                </span>
              </div>
            </div>
          </aside>

          {/* ==================================================
              CONTENT
          ================================================== */}

          <section className="min-w-0">
            {/* Header */}
            <div className="border-b border-[#143b28] px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex items-start justify-between gap-5">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#20dc73]/25 bg-[#20dc73]/8 sm:flex">
                    <CurrentIcon className="h-5 w-5 text-[#20dc73]" />
                  </div>

                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#20dc73]">
                      OSINT OPERATIONS · STAGE{" "}
                      {String(
                        step,
                      ).padStart(
                        2,
                        "0",
                      )}
                    </p>

                    <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                      {currentStep.label}
                    </h1>

                    <p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/35 sm:text-sm">
                      {
                        currentStep.description
                      }
                    </p>
                  </div>
                </div>

                <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-[#143b28] bg-black/20 px-3 py-2 sm:flex">
                  <span className="font-mono text-[9px] text-white/30">
                    {step} /{" "}
                    {STEPS.length}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-5 flex items-center gap-2">
                {STEPS.map(
                  (item) => {
                    const active =
                      item.id ===
                      step

                    const complete =
                      isStepComplete(
                        item.id,
                      )

                    return (
                      <div
                        key={item.id}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          complete
                            ? "bg-[#20dc73]"
                            : active
                              ? "bg-[#20dc73]/60"
                              : "bg-[#143b28]"
                        }`}
                      />
                    )
                  },
                )}
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-6 sm:px-7 sm:py-7">
              <form
                onSubmit={(event) => {
                  event.preventDefault()

                  if (
                    step <
                    STEPS.length
                  ) {
                    nextStep()
                  } else {
                    handleSubmit()
                  }
                }}
              >
                <div
                  key={step}
                  className="animate-[osintStepIn_.2s_ease-out]"
                >
                  {renderStep()}
                </div>

                {/* Navigation */}
                <div className="mt-8 border-t border-[#143b28] pt-5">
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      {step > 1 ? (
                        <button
                          type="button"
                          onClick={
                            prevStep
                          }
                          disabled={
                            submitting
                          }
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#143b28] px-5 text-sm font-medium text-white/55 transition hover:border-white/20 hover:bg-white/[0.03] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Back
                        </button>
                      ) : (
                        <div className="hidden sm:block">
                          <p className="text-[9px] uppercase tracking-[0.14em] text-white/20">
                            Secure intake
                          </p>

                          <p className="mt-1 text-[10px] text-white/30">
                            One stage at a time.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <div className="hidden text-right sm:block">
                        <p className="text-[9px] uppercase tracking-[0.14em] text-white/20">
                          Progress
                        </p>

                        <p className="mt-1 font-mono text-[10px] text-white/35">
                          {Math.round(
                            progress,
                          )}
                          %
                        </p>
                      </div>

                      {step <
                      STEPS.length ? (
                        <button
                          type="submit"
                          disabled={
                            submitting ||
                            !canProceed()
                          }
                          className="inline-flex h-11 min-w-[135px] items-center justify-center gap-2 rounded-xl bg-[#20dc73] px-6 text-sm font-bold text-black shadow-[0_10px_30px_rgba(32,220,115,0.07)] transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          Continue
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={
                            submitting ||
                            !canProceed()
                          }
                          className="inline-flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-xl bg-[#20dc73] px-6 text-sm font-bold text-black shadow-[0_10px_30px_rgba(32,220,115,0.07)] transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Submit Investigation
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>

      <style jsx global>{`
        @keyframes osintStepIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
