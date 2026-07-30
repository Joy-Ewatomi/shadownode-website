"use client"

import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Loader2,
  Link,
  MapPin,
  MessageSquareText,
  Phone,
  Plus,
  Search,
  Shield,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react"
import { useCallback, useMemo, useState } from "react"

/* ──────────── Service Definitions ──────────── */

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

const CYBERSECURITY_SERVICES = [
  "Cybersecurity Training Programs",
  "Security Awareness Training",
  "Digital Safety Education",
  "Security Assessment Guidance",
]

const INVESTIGATION_DEPTHS = [
  { value: "basic", label: "Basic Review", desc: "High-level overview and initial assessment" },
  { value: "standard", label: "Standard Investigation", desc: "Thorough investigation following standard procedures" },
  { value: "deep", label: "Deep Investigation", desc: "In-depth analysis with expanded resource allocation" },
  { value: "comprehensive", label: "Comprehensive Intelligence Report", desc: "Full-scale intelligence operation with detailed reporting" },
]

const PRIORITY_LEVELS = [
  { value: "low", label: "Low", desc: "No time pressure – standard processing" },
  { value: "normal", label: "Normal", desc: "Standard turnaround expected" },
  { value: "high", label: "High", desc: "Expedited processing requested" },
  { value: "critical", label: "Critical", desc: "Immediate attention required" },
]

const SUBJECT_TYPES = [
  { value: "person", label: "Person", icon: User },
  { value: "company", label: "Company", icon: Building2 },
  { value: "digital_asset", label: "Digital Asset", icon: Globe },
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

/* ──────────── Country → Currency Mapping ──────────── */

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  "Nigeria": "NGN",
  "United States": "USD",
  "United Kingdom": "GBP",
  "Canada": "CAD",
  "India": "INR",
  "South Africa": "ZAR",
  "Ghana": "GHS",
  "Kenya": "KES",
  "Egypt": "EGP",
  "Morocco": "MAD",
  "Germany": "EUR",
  "France": "EUR",
  "Italy": "EUR",
  "Spain": "EUR",
  "Netherlands": "EUR",
  "Australia": "AUD",
  "Brazil": "BRL",
  "Mexico": "MXN",
  "Japan": "JPY",
  "China": "CNY",
  "UAE": "AED",
  "Saudi Arabia": "SAR",
  "Singapore": "SGD",
  "Switzerland": "CHF",
  "Sweden": "SEK",
  "Norway": "NOK",
  "Poland": "PLN",
  "Turkey": "TRY",
}

const COUNTRY_OPTIONS = Object.keys(COUNTRY_CURRENCY_MAP).sort()

function getCurrencyForCountry(country: string): string {
  return COUNTRY_CURRENCY_MAP[country] || "USD"
}

/* ──────────── Supporting Link ──────────── */

type SupportingLink = {
  type: string
  url: string
}

/* ──────────── Form Data Type ──────────── */

export type InvestigationFormData = {
   /* Request metadata */
  title: string

  /* Step 1 — Service */
  category: string
  service_type: string

  /* Step 2 — Objective */
  investigation_objective: string

  /* Step 3 — Subject / Target (OSINT only) */
  subject_type: string
  subject_full_name: string
  subject_known_usernames: string
  subject_emails: string
  subject_phone_numbers: string
  subject_location: string
  subject_organization: string
  subject_websites: string

  /* Step 3 — Company fields */
  subject_company_name: string
  subject_company_website: string
  subject_company_country: string
  subject_company_industry: string

  /* Step 3 — Digital Asset fields */
  subject_domain: string
  subject_url: string
  subject_ip_address: string
  subject_platform: string

  /* Step 3 — Additional Identifying Info (OSINT, optional, expandable) */
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

  /* Step 4 — Supporting Intelligence & Evidence */
  existing_information: string
  supporting_links: SupportingLink[]
  additional_notes: string
  /* Evidence upload — we store file metadata (name, size, type) for future backend processing */
  evidence_files: EvidenceFile[]

  /* Step 5 — Investigation Scope */
  investigation_depth: string

  /* Step 6 — Priority & Timeline */
  urgency: string
  preferred_deadline: string

  /* Step 7 — Communication & Country */
  communication_method: string
  communication_email: string
  communication_country_code: string
  communication_phone: string
  communication_whatsapp: string
  communication_signal: string
  client_country: string
  preferred_currency: string

  /* Step 8 — Authorization */
  authorization_confirmed: boolean

  /* Cybersecurity Training fields */
  training_organization_name: string
  training_client_type: string
  training_participant_count: string
  training_skill_level: string
  training_goal: string
  training_topics: string
  training_preferred_dates: string
  training_additional_requirements: string

  /* Legacy */
  description: string
}

/* ──────────── Evidence File Type ──────────── */

export type EvidenceFile = {
  id: string
  name: string
  size: number
  type: string
  dataUrl?: string // For preview; not sent to API
}

/* ──────────── Empty Form ──────────── */

const EMPTY_FORM: InvestigationFormData = {
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
  preferred_deadline: "",
  communication_method: "portal_notification",
  communication_email: "",
  communication_country_code: "",
  communication_phone: "",
  communication_whatsapp: "",
  communication_signal: "",
  client_country: "",
  preferred_currency: "",
  authorization_confirmed: false,
  training_organization_name: "",
  training_client_type: "organization",
  training_participant_count: "",
  training_skill_level: "beginner",
  training_goal: "",
  training_topics: "",
  training_preferred_dates: "",
  training_additional_requirements: "",
  description: "",
}

/* ──────────── Step Definitions ──────────── */

const STEPS = [
  { id: 1, label: "Service Selection" },
  { id: 2, label: "Investigation Objective" },
  { id: 3, label: "Subject / Target Information" },
  { id: 4, label: "Supporting Intelligence & Evidence" },
  { id: 5, label: "Investigation Scope" },
  { id: 6, label: "Priority & Timeline" },
  { id: 7, label: "Communication Preferences" },
  { id: 8, label: "Review & Legal Authorization" },
]

/* ──────────── Props ──────────── */

type Props = {
  onSubmit: (data: InvestigationFormData) => Promise<void>
  submitting: boolean
}

/* ──────────── Component ──────────── */

/** Small reusable form input.
 * Defined outside InvestigationForm so React preserves input focus
 * when the parent component re-renders after each keystroke.
 */
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
      <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-white/50">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#20dc73]/50"
      />
      {note && <p className="mt-1 text-[11px] text-white/30">{note}</p>}
    </div>
  )
}

export default function InvestigationForm({ onSubmit, submitting }: Props) {
  const [form, setForm] = useState<InvestigationFormData>(EMPTY_FORM)
  const [step, setStep] = useState(1)
  const [supportingLinkInput, setSupportingLinkInput] = useState<SupportingLink>({ type: "Website", url: "" })
  const [showObjectiveDropdown, setShowObjectiveDropdown] = useState(false)

  const set = useCallback((patch: Partial<InvestigationFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])

  /* Determine if this is a cybersecurity training request */
  const isCybersecurity = form.category === "cybersecurity"
  const isTrainingService = isCybersecurity && form.service_type && (
    form.service_type === "Cybersecurity Training Programs" ||
    form.service_type === "Security Awareness Training" ||
    form.service_type === "Digital Safety Education"
  )
  // Security Assessment Guidance is still a cybersecurity service but uses different fields
  const isTrainingRequest = isCybersecurity && isTrainingService
  const services = isCybersecurity ? CYBERSECURITY_SERVICES : OSINT_SERVICES

  /* Automatically set currency when country changes */
  const handleCountryChange = useCallback((country: string) => {
    const currency = getCurrencyForCountry(country)
    set({ client_country: country, preferred_currency: currency })
  }, [set])

  /* ────────── Evidence file handling ────────── */
  const [lastFileError, setLastFileError] = useState("")

  const handleFileAdd = useCallback((files: FileList | null) => {
    if (!files) return
    setLastFileError("")
    const newFiles: EvidenceFile[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      const MAX_SIZE = 50 * 1024 * 1024 // 50MB per file
      if (f.size > MAX_SIZE) {
        setLastFileError(`"${f.name}" exceeds the 50MB limit and has been skipped.`)
        continue
      }
      newFiles.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${i}`,
        name: f.name,
        size: f.size,
        type: f.type,
      })
    }
    setForm((prev) => ({
      ...prev,
      evidence_files: [...prev.evidence_files, ...newFiles],
    }))
  }, [])

  const removeEvidenceFile = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      evidence_files: prev.evidence_files.filter((f) => f.id !== id),
    }))
  }, [])

  /* ────────── Supporting links ────────── */
  const addSupportingLink = useCallback(() => {
    if (!supportingLinkInput.url.trim()) return
    setForm((prev) => ({
      ...prev,
      supporting_links: [...prev.supporting_links, { ...supportingLinkInput }],
    }))
    setSupportingLinkInput({ type: "Website", url: "" })
  }, [supportingLinkInput])

  const removeSupportingLink = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      supporting_links: prev.supporting_links.filter((_, i) => i !== index),
    }))
  }, [])

  /* ────────── Navigation ────────── */
  function nextStep() {
    if (step < 8) setStep(step + 1)
  }
  function prevStep() {
    if (step > 1) setStep(step - 1)
  }

  /* ────────── Validation per step ────────── */
  function canProceed(): boolean {
  switch (step) {

    case 1:
  return Boolean(form.service_type)

    case 2:
  return Boolean(form.investigation_objective?.trim().length >= 20)

    case 3:
      if (isTrainingRequest) {
        return Boolean(form.training_goal?.trim().length >= 5)
      }
      return true

    case 4:
      return true

    case 5:
      return Boolean(form.investigation_depth)

    case 6:
      return Boolean(form.urgency)

    case 7:
      return Boolean(form.client_country)

    case 8:
      return Boolean(form.authorization_confirmed)

    default:
      return false
  }
}

  /* ────────── Submit ────────── */
async function handleSubmit() {
  const title =
    form.title.trim() ||
    form.service_type.trim() ||
    `${form.category === "cybersecurity" ? "Cybersecurity" : "OSINT"} Investigation`

  const description = [
    `Service: ${form.service_type || form.category}`,
    `Objective: ${form.investigation_objective}`,
    `Subject Type: ${form.subject_type}`,
    form.subject_full_name ? `Subject Name: ${form.subject_full_name}` : "",
    form.subject_organization ? `Organization: ${form.subject_organization}` : "",
    form.subject_company_name ? `Company: ${form.subject_company_name}` : "",
    form.subject_domain ? `Domain: ${form.subject_domain}` : "",
    form.subject_url ? `URL: ${form.subject_url}` : "",
    form.existing_information
      ? `Supporting Intelligence: ${form.existing_information}`
      : "",
    form.additional_notes
      ? `Additional Notes: ${form.additional_notes}`
      : "",
  ]
    .filter(Boolean)
    .join("\n")
    .trim()

  await onSubmit({
    ...form,
    title,
    description,
  })
}

  /* ────────── Render: Step 1 — Service Selection ────────── */
  function renderStep1() {
    return (
      <div className="space-y-5">
        <p className="text-sm text-white/60">
          Select the division and specific service that best matches your investigation needs.
        </p>

        {/* Division selector */}
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">Service Division</label>
          <div className="flex gap-3">
            {[
              { value: "osint", label: "Open Source Intelligence Operations", icon: Search },
              { value: "cybersecurity", label: "Cybersecurity Services", icon: Shield },
            ].map((div) => (
              <button
                key={div.value}
                type="button"
                onClick={() => set({ category: div.value, service_type: "" })}
                className={`flex flex-1 items-center gap-3 rounded-md border px-4 py-5 text-left transition ${
                  form.category === div.value
                    ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                    : "border-[#143b28] text-white/60 hover:border-white/20 hover:text-white"
                }`}
              >
                <div.icon className="h-5 w-5 shrink-0" />
                <span className="text-sm font-semibold">{div.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Services list */}
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">Select Service</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ service_type: s })}
                className={`rounded-md border px-4 py-3 text-left text-sm transition ${
                  form.service_type === s
                    ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                    : "border-[#143b28] text-white/60 hover:border-white/20 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ────────── Render: Step 2 — Investigation Objective ────────── */
  function renderStep2() {
    return (
      <div className="space-y-5">
        <p className="text-sm text-white/60">
          Describe the primary objective of this investigation. What are you trying to determine or achieve?
        </p>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            Objective suggestions
          </label>
          <div className="mb-4 flex flex-wrap gap-2">
            {OBJECTIVE_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  set({ investigation_objective: ex })
                  setShowObjectiveDropdown(false)
                }}
                className={`rounded border px-3 py-1.5 text-xs transition ${
                  form.investigation_objective === ex
                    ? "border-[#20dc73] text-[#20dc73]"
                    : "border-[#143b28] text-white/50 hover:border-white/20"
                }`}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            What is the objective of this request?
          </label>
          <textarea
            value={form.investigation_objective}
            onChange={(e) => set({ investigation_objective: e.target.value })}
            placeholder="e.g. Identity verification, background verification, fraud investigation, digital footprint analysis..."
            className="min-h-32 w-full rounded-md border border-[#143b28] bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#20dc73]/50"
          />
          <p className="mt-1 text-xs text-white/40">
            {form.investigation_objective.length} characters (minimum 10 required)
          </p>
        </div>
      </div>
    )
  }

  /* ────────── Render: Step 3 — Subject / Target Information ────────── */

  function renderSubjectFields() {
    // Cybersecurity training: show training fields instead of subject info
    if (isTrainingRequest) {
      return renderTrainingFields()
    }

    return (
      <div className="space-y-5">
        <p className="text-sm text-white/60">
          Provide information about the subject or target of the investigation.
        </p>

        {/* Subject Type */}
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">Subject Type</label>
          <div className="flex gap-3">
            {SUBJECT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set({ subject_type: t.value })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm transition ${
                  form.subject_type === t.value
                    ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                    : "border-[#143b28] text-white/50 hover:border-white/20"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Person fields */}
        {form.subject_type === "person" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormInput label="Full Name" value={form.subject_full_name} onChange={(v) => set({ subject_full_name: v })} />
              <FormInput label="Known Usernames" value={form.subject_known_usernames} onChange={(v) => set({ subject_known_usernames: v })} placeholder="Comma-separated" />
              <FormInput label="Email Addresses" value={form.subject_emails} onChange={(v) => set({ subject_emails: v })} placeholder="Comma-separated" />
              <FormInput label="Phone Numbers" value={form.subject_phone_numbers} onChange={(v) => set({ subject_phone_numbers: v })} placeholder="Comma-separated" />
              <FormInput label="Location" value={form.subject_location} onChange={(v) => set({ subject_location: v })} />
              <FormInput label="Organization / Company" value={form.subject_organization} onChange={(v) => set({ subject_organization: v })} />
              <div className="sm:col-span-2">
                <FormInput label="Known Websites / Social Profiles" value={form.subject_websites} onChange={(v) => set({ subject_websites: v })} placeholder="Comma-separated URLs" />
              </div>
            </div>

            {/* + Add Additional Identifying Information (expandable) */}
            <div className="border-t border-[#143b28] pt-4">
              <button
                type="button"
                onClick={() => set({ show_additional_info: !form.show_additional_info })}
                className="inline-flex items-center gap-2 text-sm text-[#20dc73] hover:text-[#20dc73]/80"
              >
                {form.show_additional_info ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {form.show_additional_info ? "Hide" : "+ Add Additional Identifying Information"}
              </button>

              {form.show_additional_info && (
                <div className="mt-4 space-y-5">
                  {/* Physical Description */}
                  <div>
                    <p className="mb-3 text-xs uppercase tracking-[0.1em] text-white/40">Physical Description</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormInput label="Approximate Age" value={form.subject_approximate_age} onChange={(v) => set({ subject_approximate_age: v })} placeholder="e.g. 30-35" />
                      <FormInput label="Height" value={form.subject_height} onChange={(v) => set({ subject_height: v })} placeholder="e.g. 5'10" />
                      <FormInput label="Weight" value={form.subject_weight} onChange={(v) => set({ subject_weight: v })} placeholder="e.g. 75kg" />
                      <FormInput label="Hair Color" value={form.subject_hair_color} onChange={(v) => set({ subject_hair_color: v })} />
                      <FormInput label="Eye Color" value={form.subject_eye_color} onChange={(v) => set({ subject_eye_color: v })} />
                      <FormInput label="Skin Tone" value={form.subject_skin_tone} onChange={(v) => set({ subject_skin_tone: v })} />
                      <FormInput label="Distinguishing Marks / Tattoos" value={form.subject_distinguishing_marks} onChange={(v) => set({ subject_distinguishing_marks: v })} className="sm:col-span-2" />
                      <FormInput label="Nationality" value={form.subject_nationality} onChange={(v) => set({ subject_nationality: v })} />
                      <FormInput label="Languages Spoken" value={form.subject_languages_spoken} onChange={(v) => set({ subject_languages_spoken: v })} placeholder="Comma-separated" />
                      <FormInput label="Last Known Address" value={form.subject_last_known_address} onChange={(v) => set({ subject_last_known_address: v })} className="sm:col-span-2" />
                      <FormInput label="Last Known Occupation" value={form.subject_last_known_occupation} onChange={(v) => set({ subject_last_known_occupation: v })} className="sm:col-span-2" />
                    </div>
                  </div>

                  {/* Digital Information */}
                  <div>
                    <p className="mb-3 text-xs uppercase tracking-[0.1em] text-white/40">Digital Information</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormInput label="Additional Usernames" value={form.subject_additional_usernames} onChange={(v) => set({ subject_additional_usernames: v })} placeholder="Comma-separated" />
                      <FormInput label="Gaming IDs" value={form.subject_gaming_ids} onChange={(v) => set({ subject_gaming_ids: v })} placeholder="e.g. Steam, Xbox, PSN" />
                      <FormInput label="Cryptocurrency Wallets" value={form.subject_cryptocurrency_wallets} onChange={(v) => set({ subject_cryptocurrency_wallets: v })} placeholder="Wallet addresses" />
                      <FormInput label="Domain Names" value={form.subject_domain_names} onChange={(v) => set({ subject_domain_names: v })} placeholder="Comma-separated" />
                      <FormInput label="IP Addresses" value={form.subject_ip_addresses} onChange={(v) => set({ subject_ip_addresses: v })} placeholder="Comma-separated" />
                      <FormInput label="Vehicle Registration" value={form.subject_vehicle_registration} onChange={(v) => set({ subject_vehicle_registration: v })} placeholder="Where lawful and applicable" note="Only where lawful and applicable" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Company fields */}
        {form.subject_type === "company" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label="Company Name" value={form.subject_company_name} onChange={(v) => set({ subject_company_name: v })} />
            <FormInput label="Website" value={form.subject_company_website} onChange={(v) => set({ subject_company_website: v })} />
            <FormInput label="Country" value={form.subject_company_country} onChange={(v) => set({ subject_company_country: v })} />
            <FormInput label="Industry" value={form.subject_company_industry} onChange={(v) => set({ subject_company_industry: v })} />
          </div>
        )}

        {/* Digital Asset fields */}
        {form.subject_type === "digital_asset" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label="Domain" value={form.subject_domain} onChange={(v) => set({ subject_domain: v })} />
            <FormInput label="URL" value={form.subject_url} onChange={(v) => set({ subject_url: v })} />
            <FormInput label="IP Address" value={form.subject_ip_address} onChange={(v) => set({ subject_ip_address: v })} />
            <FormInput label="Platform" value={form.subject_platform} onChange={(v) => set({ subject_platform: v })} />
          </div>
        )}
      </div>
    )
  }

  /* ────────── Render: Cybersecurity Training Fields ────────── */
  function renderTrainingFields() {
    return (
      <div className="space-y-5">
        <p className="text-sm text-white/60">
          Provide details about your cybersecurity training requirements.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput label="Organization Name (optional)" value={form.training_organization_name} onChange={(v) => set({ training_organization_name: v })} />

          {/* Client Type */}
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-white/50">Individual or Organization</label>
            <div className="flex gap-2">
              {[
                { value: "individual", label: "Individual" },
                { value: "organization", label: "Organization" },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set({ training_client_type: t.value })}
                  className={`flex-1 rounded border px-3 py-2 text-xs transition ${
                    form.training_client_type === t.value
                      ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                      : "border-[#143b28] text-white/50 hover:border-white/20"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput label="Number of Participants" value={form.training_participant_count} onChange={(v) => set({ training_participant_count: v })} placeholder="e.g. 10" />

          {/* Skill Level */}
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-white/50">Current Skill Level</label>
            <div className="flex gap-2">
              {[
                { value: "beginner", label: "Beginner" },
                { value: "intermediate", label: "Intermediate" },
                { value: "advanced", label: "Advanced" },
              ].map((lvl) => (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => set({ training_skill_level: lvl.value })}
                  className={`flex-1 rounded border px-3 py-2 text-xs transition ${
                    form.training_skill_level === lvl.value
                      ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                      : "border-[#143b28] text-white/50 hover:border-white/20"
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-white/50">Training Goal</label>
          <textarea
            value={form.training_goal}
            onChange={(e) => set({ training_goal: e.target.value })}
            placeholder="What is the primary goal of this training?"
            className="min-h-24 w-full rounded-md border border-[#143b28] bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#20dc73]/50"
          />
        </div>

        <FormInput label="Topics of Interest" value={form.training_topics} onChange={(v) => set({ training_topics: v })} placeholder="Comma-separated topics" />

        <FormInput label="Preferred Training Dates" value={form.training_preferred_dates} onChange={(v) => set({ training_preferred_dates: v })} placeholder="e.g. March 2026, Q2 2026" />

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-white/50">Additional Requirements</label>
          <textarea
            value={form.training_additional_requirements}
            onChange={(e) => set({ training_additional_requirements: e.target.value })}
            placeholder="Any specific requirements, prerequisites, or special considerations..."
            className="min-h-20 w-full rounded-md border border-[#143b28] bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#20dc73]/50"
          />
        </div>
      </div>
    )
  }

  /* ────────── Render: Step 4 — Supporting Intelligence & Evidence ────────── */
  function renderStep4() {
    return (
      <div className="space-y-6">
        {/* Section A — Investigation Summary */}
        <section>
          <h3 className="mb-1 font-semibold text-white">Section A — Investigation Summary</h3>
          <p className="mb-3 text-sm text-white/50">
            Describe everything you already know that may assist our analysts.
          </p>
          <textarea
            value={form.existing_information}
            onChange={(e) => set({ existing_information: e.target.value })}
            placeholder="Known facts, previous findings, relevant context, observations, and any intelligence that may assist our analysts..."
            className="min-h-36 w-full rounded-md border border-[#143b28] bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#20dc73]/50"
          />
        </section>

        {/* Section B — Supporting Links */}
        <section>
          <h3 className="mb-1 font-semibold text-white">Section B — Supporting Links</h3>
          <p className="mb-3 text-sm text-white/50">
            Add links to relevant profiles, articles, websites, or other online resources.
          </p>

          {/* Existing links */}
          {form.supporting_links.length > 0 && (
            <div className="mb-3 space-y-2">
              {form.supporting_links.map((link, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded border border-[#143b28] bg-black/30 px-3 py-2"
                >
                  <span className="rounded bg-[#20dc73]/10 px-2 py-0.5 text-[11px] text-[#20dc73]">
                    {link.type}
                  </span>
                  <span className="flex-1 truncate text-sm text-white/70">{link.url}</span>
                  <button
                    type="button"
                    onClick={() => removeSupportingLink(index)}
                    className="shrink-0 text-white/30 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add link input */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[140px]">
              <label className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-white/40">Type</label>
              <select
                value={supportingLinkInput.type}
                onChange={(e) => setSupportingLinkInput((prev) => ({ ...prev, type: e.target.value }))}
                className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/50"
              >
                {LINK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex-[2] min-w-[200px]">
              <label className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-white/40">URL</label>
              <input
                value={supportingLinkInput.url}
                onChange={(e) => setSupportingLinkInput((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://"
                className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#20dc73]/50"
              />
            </div>
            <button
              type="button"
              onClick={addSupportingLink}
              disabled={!supportingLinkInput.url.trim()}
              className="inline-flex h-10 items-center gap-2 rounded bg-[#20dc73] px-4 text-sm font-bold text-black disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add Link
            </button>
          </div>
        </section>

        {/* Section C — Evidence Upload */}
        <section>
          <h3 className="mb-1 font-semibold text-white">Section C — Evidence Upload</h3>
          <p className="mb-3 text-sm text-white/50">
            Upload supporting evidence such as images, screenshots, PDFs, documents, videos, or audio files.
            <br />
            <span className="text-white/30">Maximum 50MB per file. Files are stored securely and reviewed by our analysts.</span>
          </p>

          {/* File dropzone */}
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-[#143b28] bg-black/30 px-4 py-6 text-center transition hover:border-[#20dc73]/40">
            <Upload className="h-8 w-8 text-white/30" />
            <p className="text-sm text-white/50">
              <span className="text-[#20dc73]">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-white/30">Images, Screenshots, PDFs, Documents, Videos, Audio</p>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.mp4,.mov,.avi,.mp3,.wav,.zip,.csv,.xls,.xlsx"
              className="hidden"
              onChange={(e) => handleFileAdd(e.target.files)}
            />
          </label>

          {lastFileError && (
            <p className="mt-2 text-xs text-red-400">{lastFileError}</p>
          )}

          {/* File list */}
          {form.evidence_files.length > 0 && (
            <div className="mt-3 space-y-2">
              {form.evidence_files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 rounded border border-[#143b28] bg-black/30 px-3 py-2"
                >
                  <FileText className="h-4 w-4 shrink-0 text-[#20dc73]" />
                  <span className="flex-1 truncate text-sm text-white/70">{file.name}</span>
                  <span className="shrink-0 text-xs text-white/40">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEvidenceFile(file.id)}
                    className="shrink-0 text-white/30 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section D — Additional Notes */}
        <section>
          <h3 className="mb-1 font-semibold text-white">Section D — Additional Notes</h3>
          <p className="mb-3 text-sm text-white/50">
            Any additional information, context, or special instructions for our analysts.
          </p>
          <textarea
            value={form.additional_notes}
            onChange={(e) => set({ additional_notes: e.target.value })}
            placeholder="Any other relevant information, context, or special instructions..."
            className="min-h-24 w-full rounded-md border border-[#143b28] bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#20dc73]/50"
          />
        </section>
      </div>
    )
  }

  /* ────────── Render: Step 5 — Investigation Scope ────────── */
  function renderStep5() {
    return (
      <div className="space-y-5">
        <p className="text-sm text-white/60">
          Select the depth and scope of the investigation.
        </p>
        <div className="grid gap-3">
          {INVESTIGATION_DEPTHS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => set({ investigation_depth: d.value })}
              className={`rounded-md border px-5 py-4 text-left transition ${
                form.investigation_depth === d.value
                  ? "border-[#20dc73] bg-[#20dc73]/10"
                  : "border-[#143b28] hover:border-white/20"
              }`}
            >
              <p className={`font-semibold ${form.investigation_depth === d.value ? "text-[#20dc73]" : "text-white"}`}>
                {d.label}
              </p>
              <p className="mt-1 text-sm text-white/50">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ────────── Render: Step 6 — Priority & Timeline ────────── */
  function renderStep6() {
    return (
      <div className="space-y-5">
        <p className="text-sm text-white/60">
          Set the priority level and preferred deadline for this investigation.
        </p>

        {/* Priority */}
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">Priority</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRIORITY_LEVELS.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => set({ urgency: u.value })}
                className={`rounded-md border px-4 py-3 text-left transition ${
                  form.urgency === u.value
                    ? "border-[#20dc73] bg-[#20dc73]/10"
                    : "border-[#143b28] hover:border-white/20"
                }`}
              >
                <p className={`font-semibold text-sm ${form.urgency === u.value ? "text-[#20dc73]" : "text-white"}`}>
                  {u.label}
                </p>
                <p className="mt-1 text-xs text-white/50">{u.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Deadline */}
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            <Calendar className="mr-1.5 inline h-3 w-3" />
            Preferred Deadline (optional)
          </label>
          <input
            type="date"
            value={form.preferred_deadline}
            onChange={(e) => set({ preferred_deadline: e.target.value })}
            className="h-10 w-full rounded-md border border-[#143b28] bg-black px-4 text-sm text-white outline-none focus:border-[#20dc73]/50"
          />
        </div>
      </div>
    )
  }

  /* ────────── Render: Step 7 — Communication Preferences ────────── */
  function renderStep7() {
    return (
      <div className="space-y-5">
        <p className="text-sm text-white/60">
          Select your preferred communication method and provide your country for quotation purposes.
        </p>

        {/* Country */}
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            <MapPin className="mr-1.5 inline h-3 w-3" />
            Country
          </label>
          <select
            value={form.client_country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/50"
          >
            <option value="">Select your country</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {form.client_country && (
            <p className="mt-1 text-xs text-[#20dc73]">
              Quote currency: <strong>{form.preferred_currency}</strong>
            </p>
          )}
        </div>

        {/* Communication Method */}
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            <MessageSquareText className="mr-1.5 inline h-3 w-3" />
            Preferred Communication Method
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { value: "portal_notification", label: "Secure Portal Notification", icon: Shield, desc: "Recommended — receive updates in your secure client portal" },
              { value: "email", label: "Email", icon: MessageSquareText, desc: "Receive updates via email" },
              { value: "phone", label: "Phone Call", icon: Phone, desc: "Direct phone consultation" },
              { value: "whatsapp", label: "WhatsApp Business", icon: Phone, desc: "WhatsApp communication" },
              { value: "signal", label: "Signal", icon: Phone, desc: "Encrypted Signal messaging" },
            ].map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => set({ communication_method: m.value })}
                className={`rounded-md border px-4 py-3 text-left transition ${
                  form.communication_method === m.value
                    ? "border-[#20dc73] bg-[#20dc73]/10"
                    : "border-[#143b28] hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  <m.icon className={`h-4 w-4 ${form.communication_method === m.value ? "text-[#20dc73]" : "text-white/50"}`} />
                  <p className={`text-sm font-medium ${form.communication_method === m.value ? "text-[#20dc73]" : "text-white"}`}>
                    {m.label}
                  </p>
                </div>
                <p className="mt-1 text-[11px] text-white/40">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic communication fields */}
        {form.communication_method === "email" && (
          <FormInput label="Email Address" value={form.communication_email} onChange={(v) => set({ communication_email: v })} placeholder="client@example.com" />
        )}

        {form.communication_method === "phone" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label="Country Code" value={form.communication_country_code} onChange={(v) => set({ communication_country_code: v })} placeholder="+234" />
            <FormInput label="Phone Number" value={form.communication_phone} onChange={(v) => set({ communication_phone: v })} placeholder="8012345678" />
          </div>
        )}

        {form.communication_method === "whatsapp" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label="Country Code" value={form.communication_country_code} onChange={(v) => set({ communication_country_code: v })} placeholder="+234" />
            <FormInput label="WhatsApp Number" value={form.communication_whatsapp} onChange={(v) => set({ communication_whatsapp: v })} placeholder="8012345678" />
          </div>
        )}

        {form.communication_method === "signal" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label="Country Code" value={form.communication_country_code} onChange={(v) => set({ communication_country_code: v })} placeholder="+234" />
            <FormInput label="Signal Number" value={form.communication_signal} onChange={(v) => set({ communication_signal: v })} placeholder="8012345678" />
          </div>
        )}
      </div>
    )
  }

  /* ────────── Render: Step 8 — Review & Legal Authorization ────────── */

  function getSummaryItems() {
    const items: { label: string; value: string }[] = [
      { label: "Division", value: form.category === "osint" ? "OSINT Operations" : "Cybersecurity Services" },
      { label: "Service", value: form.service_type },
      { label: "Objective", value: form.investigation_objective },
    ]

    if (isTrainingRequest) {
      if (form.training_organization_name) items.push({ label: "Organization", value: form.training_organization_name })
      items.push({ label: "Client Type", value: form.training_client_type })
      if (form.training_participant_count) items.push({ label: "Participants", value: form.training_participant_count })
      items.push({ label: "Skill Level", value: form.training_skill_level })
      if (form.training_goal) items.push({ label: "Training Goal", value: form.training_goal })
      if (form.training_topics) items.push({ label: "Topics", value: form.training_topics })
    } else {
      items.push({ label: "Subject Type", value: form.subject_type.replace("_", " ") })
      if (form.subject_full_name) items.push({ label: "Subject Name", value: form.subject_full_name })
      if (form.subject_company_name) items.push({ label: "Company", value: form.subject_company_name })
      if (form.subject_domain) items.push({ label: "Domain", value: form.subject_domain })
    }

    items.push(
      { label: "Depth", value: INVESTIGATION_DEPTHS.find((d) => d.value === form.investigation_depth)?.label || "" },
      { label: "Priority", value: PRIORITY_LEVELS.find((u) => u.value === form.urgency)?.label || "" },
      { label: "Country", value: form.client_country },
      { label: "Currency", value: form.preferred_currency },
      { label: "Communication", value: form.communication_method.replace(/_/g, " ") },
    )

    return items
  }

  function renderStep8() {
    return (
      <div className="space-y-5">
        {/* Summary */}
        <div className="rounded-md border border-[#143b28] bg-black/30 p-5">
          <p className="mb-4 font-semibold text-white">Review Your Investigation Request</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {getSummaryItems().map((item) => (
              <div key={item.label}>
                <p className="text-xs uppercase tracking-[0.1em] text-white/40">{item.label}</p>
                <p className="mt-1 text-sm text-white/80 capitalize">{item.value}</p>
              </div>
            ))}
            {form.supporting_links.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.1em] text-white/40">Supporting Links</p>
                <p className="mt-1 text-sm text-white/80">{form.supporting_links.length} link(s) provided</p>
              </div>
            )}
            {form.evidence_files.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.1em] text-white/40">Evidence Files</p>
                <p className="mt-1 text-sm text-white/80">{form.evidence_files.length} file(s) uploaded</p>
              </div>
            )}
          </div>
        </div>

        {/* Legal Authorization */}
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-5">
          <p className="text-sm font-semibold text-yellow-200">Legal Authorization Required</p>
          <p className="mt-2 text-sm text-yellow-100/70">
            By submitting this request, you confirm that you have the lawful authority to request this
            investigation and that all information provided is accurate and truthful.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-md border border-[#143b28] bg-black/30 p-5">
          <input
            id="auth-check"
            type="checkbox"
            checked={form.authorization_confirmed}
            onChange={(e) => set({ authorization_confirmed: e.target.checked })}
            className="mt-1 h-4 w-4 shrink-0 accent-[#20dc73]"
          />
          <label htmlFor="auth-check" className="text-sm leading-relaxed text-white/80">
            I confirm that I have <strong>lawful authorization</strong> to request this investigation and that
            the information provided is accurate to the best of my knowledge.
          </label>
        </div>
        {submitting && (
          <div className="flex items-center justify-center gap-2 py-4 text-[#20dc73]">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Submitting investigation request...</span>
          </div>
        )}
      </div>
    )
  }

  /* ────────── Main Step Renderer ────────── */
  function renderStep() {
    switch (step) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderSubjectFields()
      case 4: return renderStep4()
      case 5: return renderStep5()
      case 6: return renderStep6()
      case 7: return renderStep7()
      case 8: return renderStep8()
      default: return null
    }
  }

  /* ────────── Main Render ────────── */
  return (
    <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b border-[#143b28] pb-4">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
          Step {step} of 8
        </p>
        <p className="text-xs text-white/40">{STEPS.find((s) => s.id === step)?.label}</p>
      </div>

      {/* Progress Dots */}
      <div className="mb-6 flex gap-1">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`h-1.5 flex-1 rounded-full transition ${
              s.id < step ? "bg-[#20dc73]" : s.id === step ? "bg-[#20dc73]/70" : "bg-[#143b28]"
            }`}
          />
        ))}
      </div>

     <form
  onSubmit={(e) => {
    e.preventDefault()

    if (!canProceed() || submitting) {
      return
    }

    if (step < 8) {
      nextStep()
    } else {
      handleSubmit()
    }
  }}
>
        {renderStep()}

        {/* Navigation */}
        <div
          className={`mt-6 flex items-center ${
            step === 1 ? "justify-end" : "justify-between"
          } border-t border-[#143b28] pt-5`}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="inline-flex h-10 items-center gap-2 rounded border border-[#143b28] px-5 text-sm text-white/60 hover:border-white/30 hover:text-white"
            >
              <ChevronUp className="h-4 w-4" /> Back
            </button>
          ) : (
            <div />
          )}
          <button
            type="submit"
        disabled={Boolean(!canProceed() || submitting)}
            className="inline-flex h-10 items-center gap-2 rounded bg-[#20dc73] px-6 text-sm font-bold text-black transition enabled:hover:bg-[#20dc73]/80 disabled:opacity-40"
          >
            {step < 8 ? (
              <>
                Next <ChevronDown className="h-4 w-4" />
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Submit Investigation Request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
