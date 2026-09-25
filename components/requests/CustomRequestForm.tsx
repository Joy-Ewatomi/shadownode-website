"use client"

import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Code2,
  FileText,
  Headphones,
  Landmark,
  Loader2,
  MessageSquareText,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  Wrench,
} from "lucide-react"
import { type FormEvent, useMemo, useRef, useState } from "react"
import WhatsAppPreferenceFields from "@/components/communications/WhatsAppPreferenceFields"

export type CustomRequestData = {
  submissionKey: string
  title: string
  objective: string
  serviceCategory: string
  context: string
  goals: string
  deliverables: string
  audience: string
  existingEnvironment: string
  supportingLinks: string[]
  technicalRequirements: string
  technologies: string
  integrations: string
  scale: string
  preferredStartDate: string
  preferredEndDate: string
  schedulePreference: string
  urgency: string
  budgetAmount: string
  budgetCurrency: string
  billingCountry: string
  preferredCurrency: string
  confidentialityRequirements: string
  complianceRequirements: string
  accessibilityRequirements: string
  communicationMethod: string
  communicationEmail: string
  communicationWhatsapp: string
  whatsappConsent: boolean
  additionalNotes: string
  authorizationConfirmed: boolean
  termsAccepted: boolean
  files: File[]
}

type CustomFormState = CustomRequestData & {
  existingReferences: string
}

type FormErrors = Partial<Record<keyof CustomFormState | "schedule", string>>

const STEPS = [
  { id: 1, label: "Service overview", short: "Overview", description: "Tell us what you need and why.", icon: BriefcaseBusiness },
  { id: 2, label: "Requirements", short: "Requirements", description: "Describe useful outcomes, features and constraints.", icon: Wrench },
  { id: 3, label: "Supporting material", short: "Materials", description: "Add links, files and existing references.", icon: FileText },
  { id: 4, label: "Schedule and budget", short: "Schedule", description: "Share timing and budget preferences.", icon: Landmark },
  { id: 5, label: "Review and submit", short: "Review", description: "Check the request and confirm authorization.", icon: ShieldCheck },
] as const

const SERVICE_CATEGORIES = [
  { value: "Consulting and advisory", icon: Users },
  { value: "Software or website development", icon: Code2 },
  { value: "Cybersecurity service", icon: ShieldCheck },
  { value: "Research and analysis", icon: Search },
  { value: "Technical support", icon: Headphones },
  { value: "Training or workshop outside the standard training form", icon: Landmark },
  { value: "Documentation or reporting", icon: FileText },
  { value: "Other", icon: BriefcaseBusiness },
] as const

const COUNTRIES = [
  ["NG", "Nigeria", "NGN"], ["GB", "United Kingdom", "GBP"], ["US", "United States", "USD"],
  ["CA", "Canada", "CAD"], ["AU", "Australia", "AUD"], ["DE", "Germany", "EUR"],
  ["FR", "France", "EUR"], ["IE", "Ireland", "EUR"], ["GH", "Ghana", "GHS"],
  ["KE", "Kenya", "KES"], ["ZA", "South Africa", "ZAR"], ["AE", "United Arab Emirates", "AED"],
  ["IN", "India", "INR"],
] as const

export function suggestedCurrencyForCountry(country: string) {
  return COUNTRIES.find(([code]) => code === country)?.[2] || "USD"
}

export function scheduleError(start: string, end: string) {
  return start && end && end < start ? "Preferred completion cannot be earlier than the start date." : ""
}

function emptyData(submissionKey: string): CustomFormState {
  return {
    submissionKey, title: "", objective: "", serviceCategory: "", context: "", goals: "",
    deliverables: "", audience: "", existingEnvironment: "", supportingLinks: [""],
    technicalRequirements: "", technologies: "", integrations: "", scale: "",
    preferredStartDate: "", preferredEndDate: "", schedulePreference: "flexible",
    urgency: "", budgetAmount: "", budgetCurrency: "USD", billingCountry: "",
    preferredCurrency: "USD", confidentialityRequirements: "", complianceRequirements: "",
    accessibilityRequirements: "", communicationMethod: "portal_notification",
    communicationEmail: "", communicationWhatsapp: "", whatsappConsent: false, additionalNotes: "", existingReferences: "",
    authorizationConfirmed: false, termsAccepted: false, files: [],
  }
}

const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-[#143b28] bg-black/65 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#20dc73]/60 focus:ring-2 focus:ring-[#20dc73]/10"
const areaClass = `${inputClass} min-h-28 resize-y leading-6`
const panelClass = "rounded-xl border border-[#143b28] bg-black/25 p-4 sm:p-5"

function Field({
  label, hint, error, children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block min-w-0 text-sm font-medium text-white/75">
      {label}
      {children}
      {hint && !error && <span className="mt-2 block text-xs leading-5 text-white/40">{hint}</span>}
      {error && <span className="mt-2 block text-xs leading-5 text-red-300" role="alert">{error}</span>}
    </label>
  )
}

function SummaryItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return <div><dt className="text-xs uppercase text-white/35">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-white/75">{value}</dd></div>
}

export default function CustomRequestForm({
  submitting,
  uploadStatus,
  onSubmit,
}: {
  submitting: boolean
  uploadStatus?: string | null
  onSubmit: (data: CustomRequestData) => Promise<void>
}) {
  const submissionKey = useMemo(() => crypto.randomUUID(), [])
  const [step, setStep] = useState(1)
  const [data, setData] = useState(() => emptyData(submissionKey))
  const [errors, setErrors] = useState<FormErrors>({})
  const [mobileStepsOpen, setMobileStepsOpen] = useState(false)
  const formTop = useRef<HTMLDivElement>(null)
  const submitLocked = useRef(false)

  const currentStep = STEPS[step - 1]
  const progress = (step / STEPS.length) * 100

  function update<K extends keyof CustomFormState>(key: K, value: CustomFormState[K]) {
    setData((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined, schedule: key === "preferredStartDate" || key === "preferredEndDate" ? undefined : current.schedule }))
  }

  function goTo(target: number) {
    if (submitting || target < 1 || target > STEPS.length) return
    setStep(target)
    setMobileStepsOpen(false)
    requestAnimationFrame(() => formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  function validateStep(target: number) {
    const next: FormErrors = {}
    if (target === 1 && !data.objective.trim()) next.objective = "Describe what you would like ShadowNode to accomplish."
    if (target === 2) {
      if (data.communicationMethod === "email" && !data.communicationEmail.trim()) next.communicationEmail = "Enter the email address to use."
      if (data.communicationMethod === "whatsapp" && !data.communicationWhatsapp.trim()) next.communicationWhatsapp = "Enter the WhatsApp number to use."
      if (data.communicationMethod === "whatsapp" && !data.whatsappConsent) next.whatsappConsent = "WhatsApp consent is required."
    }
    if (target === 3) {
      const invalidLink = data.supportingLinks.find((link) => {
        if (!link.trim()) return false
        try { return !["http:", "https:"].includes(new URL(link).protocol) } catch { return true }
      })
      if (invalidLink) next.supportingLinks = "Each supporting link must be a complete HTTP or HTTPS URL."
    }
    if (target === 4) {
      if (!data.billingCountry) next.billingCountry = "Select the country used for billing and currency preferences."
      if (!/^[A-Z]{3}$/.test(data.preferredCurrency)) next.preferredCurrency = "Enter a three-letter currency code."
      const dateError = scheduleError(data.preferredStartDate, data.preferredEndDate)
      if (dateError) next.schedule = dateError
    }
    if (target === 5) {
      if (!data.authorizationConfirmed) next.authorizationConfirmed = "Confirm that you are authorized to submit this lawful request."
      if (!data.termsAccepted) next.termsAccepted = "Accept the terms before submitting."
    }
    setErrors(next)
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
        first?.focus()
        first?.scrollIntoView({ behavior: "smooth", block: "center" })
      })
      return false
    }
    return true
  }

  function nextStep() {
    if (validateStep(step)) goTo(step + 1)
  }

  function addLink() {
    if (data.supportingLinks.length < 10) update("supportingLinks", [...data.supportingLinks, ""])
  }

  function updateLink(index: number, link: string) {
    update("supportingLinks", data.supportingLinks.map((item, itemIndex) => itemIndex === index ? link : item))
  }

  function removeLink(index: number) {
    const links = data.supportingLinks.filter((_, itemIndex) => itemIndex !== index)
    update("supportingLinks", links.length ? links : [""])
  }

  function chooseFiles(files: File[]) {
    const nextErrors: FormErrors = {}
    if (files.length > 10) nextErrors.files = "Select no more than 10 files."
    else if (files.some((file) => file.size <= 0 || file.size > 50 * 1024 * 1024)) nextErrors.files = "Each file must be non-empty and no larger than 50MB."
    else if (files.reduce((total, file) => total + file.size, 0) > 100 * 1024 * 1024) nextErrors.files = "The combined upload cannot exceed 100MB."
    if (nextErrors.files) {
      setErrors((current) => ({ ...current, ...nextErrors }))
      return
    }
    update("files", files)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step !== 5) {
      nextStep()
      return
    }
    if (!validateStep(5) || submitting || submitLocked.current) return
    submitLocked.current = true
    try {
      const { existingReferences, ...requestData } = data
      const referenceNote = existingReferences.trim()
        ? `Existing documents or references:\n${existingReferences.trim()}`
        : ""
      await onSubmit({
        ...requestData,
        additionalNotes: [referenceNote, data.additionalNotes.trim()].filter(Boolean).join("\n\n"),
        supportingLinks: data.supportingLinks.map((link) => link.trim()).filter(Boolean),
      })
    } finally {
      submitLocked.current = false
    }
  }

  function renderStep() {
    if (step === 1) return (
      <div className="space-y-6">
        <Field label="Service title (optional)" hint="A short name helps identify the request later.">
          <input name="title" value={data.title} onChange={(event) => update("title", event.target.value)} maxLength={160} className={inputClass} placeholder="For example, client portal accessibility review" />
        </Field>
        <fieldset>
          <legend className="text-sm font-medium text-white/75">Service category (optional)</legend>
          <p className="mt-1 text-xs text-white/40">Choose the closest fit. Selecting Other is perfectly fine.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {SERVICE_CATEGORIES.map(({ value, icon: Icon }) => {
              const selected = data.serviceCategory === value
              return <button key={value} type="button" aria-pressed={selected} onClick={() => update("serviceCategory", value)} className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73] ${selected ? "border-[#20dc73] bg-[#20dc73]/10 text-white" : "border-[#143b28] bg-black/25 text-white/65 hover:border-white/20 hover:text-white"}`}><Icon className={`h-5 w-5 shrink-0 ${selected ? "text-[#20dc73]" : "text-white/35"}`} aria-hidden="true" /><span>{value}</span>{selected && <Check className="ml-auto h-4 w-4 text-[#20dc73]" aria-hidden="true" />}</button>
            })}
          </div>
        </fieldset>
        <Field label="What would you like ShadowNode to accomplish?" hint="Describe the result you need in your own words. Technical terminology is not required." error={errors.objective}>
          <textarea id="objective" name="objective" required aria-invalid={Boolean(errors.objective)} value={data.objective} onChange={(event) => update("objective", event.target.value)} maxLength={10000} className={`${areaClass} min-h-40`} placeholder="Explain the service, project, support or outcome you need." />
        </Field>
        <Field label="Background or context (optional)" hint="Include anything that will help reviewers understand the situation.">
          <textarea name="context" value={data.context} onChange={(event) => update("context", event.target.value)} className={areaClass} />
        </Field>
      </div>
    )

    if (step === 2) return (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Field label="Expected outcome or deliverables (optional)" hint="Examples: a working prototype, written recommendations, repairs or a review report."><textarea value={data.deliverables} onChange={(event) => update("deliverables", event.target.value)} className={areaClass} /></Field>
          <Field label="Goals (optional)" hint="What should be different or improved when the work is complete?"><textarea value={data.goals} onChange={(event) => update("goals", event.target.value)} className={areaClass} /></Field>
          <Field label="Specific requirements or features (optional)" hint="List functions, standards or capabilities that matter."><textarea value={data.technicalRequirements} onChange={(event) => update("technicalRequirements", event.target.value)} className={areaClass} /></Field>
          <Field label="Intended audience or users (optional)" hint="Who will use or benefit from the work?"><textarea value={data.audience} onChange={(event) => update("audience", event.target.value)} className={areaClass} /></Field>
        </div>
        <div className={panelClass}>
          <h3 className="text-sm font-semibold">Existing environment</h3>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <Field label="Systems, platforms or organization (optional)"><textarea value={data.existingEnvironment} onChange={(event) => update("existingEnvironment", event.target.value)} className={areaClass} /></Field>
            <div className="grid gap-4">
              <Field label="Technologies or tools (optional)"><input value={data.technologies} onChange={(event) => update("technologies", event.target.value)} className={inputClass} placeholder="For example, WordPress, React, Microsoft 365" /></Field>
              <Field label="Integrations (optional)"><input value={data.integrations} onChange={(event) => update("integrations", event.target.value)} className={inputClass} placeholder="Services or systems that need to connect" /></Field>
              <Field label="Expected scale (optional)"><input value={data.scale} onChange={(event) => update("scale", event.target.value)} className={inputClass} placeholder="Users, volume or intended reach" /></Field>
            </div>
          </div>
        </div>
        <details className={panelClass}>
          <summary className="cursor-pointer text-sm font-semibold text-white/75">Constraints and specialist requirements</summary>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Field label="Confidentiality requirements (optional)"><textarea value={data.confidentialityRequirements} onChange={(event) => update("confidentialityRequirements", event.target.value)} className={areaClass} /></Field>
            <Field label="Compliance requirements (optional)"><textarea value={data.complianceRequirements} onChange={(event) => update("complianceRequirements", event.target.value)} className={areaClass} /></Field>
            <Field label="Accessibility requirements (optional)"><textarea value={data.accessibilityRequirements} onChange={(event) => update("accessibilityRequirements", event.target.value)} className={areaClass} /></Field>
          </div>
        </details>
        <fieldset className={panelClass}>
          <legend className="px-1 text-sm font-semibold">Preferred communication</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[["portal_notification", "Portal"], ["email", "Email"], ["whatsapp", "WhatsApp"]].map(([value, label]) => <button key={value} type="button" aria-pressed={data.communicationMethod === value} onClick={() => update("communicationMethod", value)} className={`min-h-11 rounded-xl border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73] ${data.communicationMethod === value ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]" : "border-[#143b28] text-white/60 hover:text-white"}`}>{label}</button>)}
          </div>
          {data.communicationMethod === "email" && <div className="mt-4"><Field label="Communication email" error={errors.communicationEmail}><input type="email" autoComplete="email" aria-invalid={Boolean(errors.communicationEmail)} value={data.communicationEmail} onChange={(event) => update("communicationEmail", event.target.value)} className={inputClass} /></Field></div>}
          {data.communicationMethod === "whatsapp" && <div className="mt-4"><WhatsAppPreferenceFields value={data.communicationWhatsapp} consent={data.whatsappConsent} onValueChange={(value) => update("communicationWhatsapp", value)} onConsentChange={(value) => update("whatsappConsent", value)} numberError={errors.communicationWhatsapp} consentError={errors.whatsappConsent} /></div>}
        </fieldset>
      </div>
    )

    if (step === 3) return (
      <div className="space-y-5">
        <section className={panelClass}>
          <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">Supporting links</h3><p className="mt-1 text-xs text-white/40">Add up to 10 complete web addresses.</p></div><button type="button" onClick={addLink} disabled={data.supportingLinks.length >= 10} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#24563d] px-3 text-sm text-[#20dc73] disabled:opacity-40"><Plus className="h-4 w-4" aria-hidden="true" />Add link</button></div>
          <div className="mt-4 space-y-3">{data.supportingLinks.map((link, index) => <div key={index} className="flex min-w-0 items-center gap-2"><label className="sr-only" htmlFor={`supporting-link-${index}`}>Supporting link {index + 1}</label><input id={`supporting-link-${index}`} type="url" inputMode="url" aria-invalid={Boolean(errors.supportingLinks)} value={link} onChange={(event) => updateLink(index, event.target.value)} className={`${inputClass} mt-0 min-w-0`} placeholder="https://example.com/reference" /><button type="button" onClick={() => removeLink(index)} aria-label={`Remove supporting link ${index + 1}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/45 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73]"><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div>)}</div>
          {errors.supportingLinks && <p role="alert" className="mt-2 text-xs text-red-300">{errors.supportingLinks}</p>}
        </section>
        <section className={panelClass}>
          <h3 className="font-semibold">File attachments</h3>
          <p className="mt-1 text-xs leading-5 text-white/40">Up to 10 files, 50MB each and 100MB combined. Files upload securely after the request is created.</p>
          <label className="mt-4 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#24563d] bg-black/25 p-4 text-center transition hover:border-[#20dc73]/60 focus-within:ring-2 focus-within:ring-[#20dc73]"><Upload className="h-6 w-6 text-[#20dc73]" aria-hidden="true" /><span className="mt-2 text-sm font-medium">Choose supporting files</span><span className="mt-1 text-xs text-white/40">Documents, images, spreadsheets, archives or other relevant material</span><input type="file" multiple className="sr-only" onChange={(event) => chooseFiles(Array.from(event.target.files || []))} /></label>
          {errors.files && <p role="alert" className="mt-2 text-xs text-red-300">{errors.files}</p>}
          {data.files.length > 0 && <ul className="mt-4 divide-y divide-white/5 rounded-xl border border-white/10">{data.files.map((file) => <li key={`${file.name}-${file.size}`} className="flex items-center gap-3 px-3 py-3 text-sm"><FileText className="h-4 w-4 shrink-0 text-white/35" aria-hidden="true" /><span className="min-w-0 flex-1 truncate">{file.name}</span><span className="shrink-0 text-xs text-white/35">{(file.size / 1024 / 1024).toFixed(1)}MB</span></li>)}</ul>}
        </section>
        <div className="grid gap-5 lg:grid-cols-2">
          <Field label="Existing documents or references (optional)" hint="Describe material that exists but is not attached here."><textarea value={data.existingReferences} onChange={(event) => update("existingReferences", event.target.value)} className={areaClass} /></Field>
          <Field label="Additional notes (optional)" hint="Anything else reviewers should consider."><textarea value={data.additionalNotes} onChange={(event) => update("additionalNotes", event.target.value)} className={areaClass} /></Field>
        </div>
      </div>
    )

    if (step === 4) return (
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Preferred start date (optional)"><input type="date" aria-invalid={Boolean(errors.schedule)} value={data.preferredStartDate} onChange={(event) => update("preferredStartDate", event.target.value)} className={inputClass} /></Field>
          <Field label="Preferred completion date (optional)" error={errors.schedule}><input type="date" aria-invalid={Boolean(errors.schedule)} value={data.preferredEndDate} min={data.preferredStartDate || undefined} onChange={(event) => update("preferredEndDate", event.target.value)} className={inputClass} /></Field>
        </div>
        <fieldset className={panelClass}><legend className="px-1 text-sm font-semibold">Schedule flexibility</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{[["flexible", "Dates are flexible"], ["fixed", "Dates are important"]].map(([value, label]) => <button key={value} type="button" aria-pressed={data.schedulePreference === value} onClick={() => update("schedulePreference", value)} className={`min-h-11 rounded-xl border px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73] ${data.schedulePreference === value ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]" : "border-[#143b28] text-white/60"}`}>{label}</button>)}</div><p className="mt-3 text-xs text-white/40">Dates are preferences and do not promise availability or completion.</p></fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Billing country" hint="Used only for currency, payment and tax preferences." error={errors.billingCountry}><select required aria-invalid={Boolean(errors.billingCountry)} value={data.billingCountry} onChange={(event) => { const country = event.target.value; const currency = suggestedCurrencyForCountry(country); setData((current) => ({ ...current, billingCountry: country, preferredCurrency: currency, budgetCurrency: currency })); setErrors((current) => ({ ...current, billingCountry: undefined, preferredCurrency: undefined })) }} className={inputClass}><option value="">Select country</option>{COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></Field>
          <Field label="Preferred currency" hint="You can change the suggested currency." error={errors.preferredCurrency}><input required aria-invalid={Boolean(errors.preferredCurrency)} value={data.preferredCurrency} onChange={(event) => { const currency = event.target.value.toUpperCase(); update("preferredCurrency", currency); update("budgetCurrency", currency) }} maxLength={3} className={inputClass} /></Field>
          <Field label="Proposed budget (optional)" hint="An indicative amount, not a quotation."><div className="mt-2 flex min-w-0"><span className="flex min-h-11 items-center rounded-l-xl border border-r-0 border-[#143b28] bg-white/5 px-3 text-xs text-white/45">{data.preferredCurrency}</span><input type="number" min="0" step="0.01" value={data.budgetAmount} onChange={(event) => update("budgetAmount", event.target.value)} className={`${inputClass} mt-0 min-w-0 rounded-l-none`} /></div></Field>
          <Field label="Urgency (optional)"><select value={data.urgency} onChange={(event) => update("urgency", event.target.value)} className={inputClass}><option value="">No preference</option><option value="flexible">Flexible</option><option value="standard">Standard</option><option value="urgent">Urgent review requested</option></select></Field>
        </div>
      </div>
    )

    return (
      <div className="space-y-5">
        {[
          { title: "Service overview", step: 1, items: [["Title", data.title], ["Category", data.serviceCategory], ["Objective", data.objective], ["Context", data.context]] },
          { title: "Requirements", step: 2, items: [["Deliverables", data.deliverables], ["Goals", data.goals], ["Requirements", data.technicalRequirements], ["Audience", data.audience], ["Existing environment", data.existingEnvironment]] },
          { title: "Supporting materials", step: 3, items: [["Links", data.supportingLinks.filter(Boolean).join("\n")], ["Files", data.files.map((file) => file.name).join("\n")], ["Existing references", data.existingReferences], ["Additional notes", data.additionalNotes]] },
          { title: "Schedule and budget", step: 4, items: [["Preferred dates", [data.preferredStartDate, data.preferredEndDate].filter(Boolean).join(" to ")], ["Schedule", data.schedulePreference], ["Country", COUNTRIES.find(([code]) => code === data.billingCountry)?.[1]], ["Budget", data.budgetAmount ? `${data.preferredCurrency} ${data.budgetAmount}` : ""], ["Urgency", data.urgency]] },
          { title: "Communication preference", step: 2, items: [["Channel", data.communicationMethod.replaceAll("_", " ")], ["Email", data.communicationEmail], ["WhatsApp", data.communicationWhatsapp]] },
        ].map((section) => <section key={section.title} className={panelClass}><div className="flex items-center justify-between gap-4"><h3 className="font-semibold">{section.title}</h3><button type="button" onClick={() => goTo(section.step)} className="min-h-11 px-2 text-sm font-medium text-[#20dc73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73]">Edit</button></div><dl className="mt-3 grid gap-4 sm:grid-cols-2">{section.items.map(([label, item]) => <SummaryItem key={label || "summary-item"} label={label || "Detail"} value={item} />)}</dl>{!section.items.some(([, item]) => item) && <p className="mt-3 text-sm text-white/35">No optional information supplied.</p>}</section>)}
        <section className="rounded-xl border border-[#24563d] bg-[#071a13] p-4 sm:p-5">
          <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#20dc73]" aria-hidden="true" /><div><h3 className="font-semibold">Authorization and review</h3><p className="mt-1 text-xs leading-5 text-white/45">Information is handled according to the applicable privacy and confidentiality requirements. Submission is a request for review and does not guarantee acceptance, availability, pricing or delivery dates. An administrator reviews the request and a super administrator makes the final acceptance or rejection decision.</p></div></div>
          <label className="mt-5 flex min-h-11 items-start gap-3 text-sm leading-6 text-white/70"><input type="checkbox" aria-invalid={Boolean(errors.authorizationConfirmed)} checked={data.authorizationConfirmed} onChange={(event) => update("authorizationConfirmed", event.target.checked)} className="mt-1 h-4 w-4 accent-[#20dc73]" />I confirm that I am authorized to submit this lawful request and that the information is accurate to the best of my knowledge.</label>
          {errors.authorizationConfirmed && <p role="alert" className="ml-7 mt-1 text-xs text-red-300">{errors.authorizationConfirmed}</p>}
          <label className="mt-3 flex min-h-11 items-start gap-3 text-sm leading-6 text-white/70"><input type="checkbox" aria-invalid={Boolean(errors.termsAccepted)} checked={data.termsAccepted} onChange={(event) => update("termsAccepted", event.target.checked)} className="mt-1 h-4 w-4 accent-[#20dc73]" />I accept the applicable terms and understand that submission does not create an engagement, quotation, invoice or payment obligation.</label>
          {errors.termsAccepted && <p role="alert" className="ml-7 mt-1 text-xs text-red-300">{errors.termsAccepted}</p>}
        </section>
      </div>
    )
  }

  const CurrentIcon = currentStep.icon
  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 py-6 text-white sm:px-6 sm:py-8">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Bureau Services</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Custom Service Request</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">Request lawful remote consulting, development, research, security advisory, technical assistance or other custom work.</p>
      </header>

      <div ref={formTop} className="scroll-mt-20 pt-5">
        <button type="button" aria-expanded={mobileStepsOpen} aria-controls="custom-mobile-steps" onClick={() => setMobileStepsOpen((open) => !open)} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-[#143b28] bg-[#06110f] px-4 text-left lg:hidden"><CurrentIcon className="h-5 w-5 text-[#20dc73]" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-xs uppercase text-white/35">Step {step} of {STEPS.length}</span><span className="block truncate text-sm font-semibold">{currentStep.label}</span></span><span className="text-xs text-white/40">{Math.round(progress)}%</span></button>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5 lg:hidden"><div className="h-full bg-[#20dc73] motion-safe:transition-[width]" style={{ width: `${progress}%` }} /></div>
        {mobileStepsOpen && <nav id="custom-mobile-steps" aria-label="Request steps" className="mt-3 grid gap-2 rounded-xl border border-[#143b28] bg-[#06110f] p-3 lg:hidden">{STEPS.map((item) => <button key={item.id} type="button" onClick={() => item.id <= step && goTo(item.id)} disabled={item.id > step} aria-current={item.id === step ? "step" : undefined} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm disabled:opacity-35"><span className={`flex h-7 w-7 items-center justify-center rounded-full border ${item.id === step ? "border-[#20dc73] text-[#20dc73]" : "border-white/15 text-white/45"}`}>{item.id < step ? <Check className="h-4 w-4" /> : item.id}</span>{item.label}</button>)}</nav>}
      </div>

      <div className="mt-5 grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="Request steps" className="sticky top-6 rounded-xl border border-[#143b28] bg-[#06110f] p-3">
            {STEPS.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => item.id <= step && goTo(item.id)} disabled={item.id > step} aria-current={item.id === step ? "step" : undefined} className={`mb-1 flex min-h-14 w-full items-center gap-3 rounded-lg px-3 text-left transition last:mb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73] disabled:cursor-not-allowed disabled:opacity-35 ${item.id === step ? "bg-[#20dc73]/10 text-white" : "text-white/50 hover:bg-white/[0.03] hover:text-white/75"}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${item.id === step ? "border-[#20dc73]/50 text-[#20dc73]" : "border-white/10"}`}>{item.id < step ? <CheckCircle2 className="h-4 w-4 text-[#20dc73]" /> : <Icon className="h-4 w-4" />}</span><span><span className="block text-xs text-white/30">Step {item.id}</span><span className="block text-sm font-medium">{item.short}</span></span></button> })}
            <div className="mt-4 border-t border-white/5 pt-4"><div className="flex justify-between text-xs text-white/35"><span>Progress</span><span>{Math.round(progress)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-[#20dc73] motion-safe:transition-[width]" style={{ width: `${progress}%` }} /></div></div>
          </nav>
        </aside>

        <form onSubmit={handleSubmit} noValidate className="min-w-0 overflow-hidden rounded-xl border border-[#143b28] bg-[#06110f]">
          <div className="border-b border-[#143b28] px-4 py-5 sm:px-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"><CurrentIcon className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><p className="text-xs uppercase text-white/35">Stage {String(step).padStart(2, "0")}</p><h2 className="mt-1 text-lg font-semibold">{currentStep.label}</h2><p className="mt-1 text-sm leading-5 text-white/45">{currentStep.description}</p></div></div></div>
          <div className="p-4 sm:p-6">{renderStep()}</div>
          <div className="flex flex-col-reverse gap-3 border-t border-[#143b28] bg-black/15 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button type="button" onClick={() => goTo(step - 1)} disabled={step === 1 || submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-medium text-white/65 hover:text-white disabled:invisible"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back</button>
            {uploadStatus && <p role="status" className="text-center text-xs text-white/50">{uploadStatus}</p>}
            {step < STEPS.length ? <button type="button" onClick={nextStep} disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#20dc73] px-5 text-sm font-semibold text-black hover:bg-[#37e684] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Continue<ArrowRight className="h-4 w-4" aria-hidden="true" /></button> : <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#20dc73] px-5 text-sm font-semibold text-black hover:bg-[#37e684] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60">{submitting ? <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Submitting securely...</> : <><MessageSquareText className="h-4 w-4" aria-hidden="true" />Submit for review</>}</button>}
          </div>
        </form>
      </div>
    </main>
  )
}
