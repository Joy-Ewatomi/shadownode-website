"use client"

import { Send, Upload } from "lucide-react"
import { type FormEvent, useMemo, useState } from "react"

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
  additionalNotes: string
  authorizationConfirmed: boolean
  termsAccepted: boolean
  files: File[]
}

const fieldClass = "mt-2 min-h-11 w-full rounded-md border border-[#143b28] bg-black/70 px-3 py-2 text-white outline-none placeholder:text-white/25 focus:border-[#20dc73] focus:ring-1 focus:ring-[#20dc73]/30"
const textAreaClass = `${fieldClass} min-h-28 resize-y leading-6`

const CURRENCIES: Record<string, string> = {
  NG: "NGN", GB: "GBP", US: "USD", CA: "CAD", AU: "AUD", DE: "EUR", FR: "EUR", IE: "EUR",
  GH: "GHS", KE: "KES", ZA: "ZAR", AE: "AED", IN: "INR",
}

function value(form: FormData, name: string) {
  return String(form.get(name) || "")
}

export default function CustomRequestForm({
  submitting,
  onSubmit,
}: {
  submitting: boolean
  onSubmit: (data: CustomRequestData) => Promise<void>
}) {
  const submissionKey = useMemo(() => crypto.randomUUID(), [])
  const [country, setCountry] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [method, setMethod] = useState("portal_notification")
  const [files, setFiles] = useState<File[]>([])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await onSubmit({
      submissionKey,
      title: value(form, "title"),
      objective: value(form, "objective"),
      serviceCategory: value(form, "serviceCategory"),
      context: value(form, "context"),
      goals: value(form, "goals"),
      deliverables: value(form, "deliverables"),
      audience: value(form, "audience"),
      existingEnvironment: value(form, "existingEnvironment"),
      supportingLinks: value(form, "supportingLinks").split(/\r?\n/).map((link) => link.trim()).filter(Boolean),
      technicalRequirements: value(form, "technicalRequirements"),
      technologies: value(form, "technologies"),
      integrations: value(form, "integrations"),
      scale: value(form, "scale"),
      preferredStartDate: value(form, "preferredStartDate"),
      preferredEndDate: value(form, "preferredEndDate"),
      schedulePreference: value(form, "schedulePreference"),
      urgency: value(form, "urgency"),
      budgetAmount: value(form, "budgetAmount"),
      budgetCurrency: value(form, "budgetCurrency"),
      billingCountry: value(form, "billingCountry"),
      preferredCurrency: value(form, "preferredCurrency"),
      confidentialityRequirements: value(form, "confidentialityRequirements"),
      complianceRequirements: value(form, "complianceRequirements"),
      accessibilityRequirements: value(form, "accessibilityRequirements"),
      communicationMethod: value(form, "communicationMethod"),
      communicationEmail: value(form, "communicationEmail"),
      communicationWhatsapp: value(form, "communicationWhatsapp"),
      additionalNotes: value(form, "additionalNotes"),
      authorizationConfirmed: form.get("authorizationConfirmed") === "on",
      termsAccepted: form.get("termsAccepted") === "on",
      files,
    })
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 text-white sm:px-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Bureau Services</p>
        <h1 className="mt-2 text-3xl font-bold">Custom Service Request</h1>
        <p className="mt-2 text-sm leading-6 text-white/50">Request a lawful remote service that does not fit the dedicated investigation or training forms. Optional detail helps us assess feasibility.</p>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Core request</h2>
          <div className="mt-4 grid gap-5">
            <label className="text-sm text-white/70">Request title <span className="text-white/35">(optional)</span><input name="title" maxLength={160} className={fieldClass} /></label>
            <label className="text-sm font-medium text-white/80">What would you like ShadowNode to do?<textarea required name="objective" maxLength={10000} className={`${textAreaClass} min-h-48`} placeholder="Describe the service, project, support or outcome you need." /></label>
            <label className="text-sm text-white/70">Service category<select name="serviceCategory" className={fieldClass} defaultValue=""><option value="">Not sure / other</option><option>Software or web development</option><option>Consulting</option><option>Technical support</option><option>Documentation</option><option>Research</option><option>Combined service</option></select></label>
          </div>
        </section>

        <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Scope and outcomes</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="text-sm text-white/70">Context<textarea name="context" className={textAreaClass} /></label>
            <label className="text-sm text-white/70">Goals<textarea name="goals" className={textAreaClass} /></label>
            <label className="text-sm text-white/70">Expected deliverables<textarea name="deliverables" className={textAreaClass} /></label>
            <label className="text-sm text-white/70">Intended audience<textarea name="audience" className={textAreaClass} /></label>
            <label className="text-sm text-white/70 sm:col-span-2">Existing project, system or organization<textarea name="existingEnvironment" className={textAreaClass} /></label>
            <label className="text-sm text-white/70 sm:col-span-2">Relevant URLs <span className="text-white/35">(one absolute URL per line)</span><textarea name="supportingLinks" className={textAreaClass} /></label>
          </div>
        </section>

        <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Technical and delivery detail</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="text-sm text-white/70">Technical requirements<textarea name="technicalRequirements" className={textAreaClass} /></label>
            <label className="text-sm text-white/70">Technologies<textarea name="technologies" className={textAreaClass} /></label>
            <label className="text-sm text-white/70">Integrations<textarea name="integrations" className={textAreaClass} /></label>
            <label className="text-sm text-white/70">Expected scale<textarea name="scale" className={textAreaClass} /></label>
            <label className="text-sm text-white/70">Preferred start date<input type="date" name="preferredStartDate" className={fieldClass} /></label>
            <label className="text-sm text-white/70">Preferred completion date<input type="date" name="preferredEndDate" className={fieldClass} /></label>
            <label className="text-sm text-white/70">Schedule preference<input name="schedulePreference" className={fieldClass} /></label>
            <label className="text-sm text-white/70">Urgency<select name="urgency" className={fieldClass} defaultValue=""><option value="">No preference</option><option value="flexible">Flexible</option><option value="standard">Standard</option><option value="urgent">Urgent</option></select></label>
          </div>
        </section>

        <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Billing and preferences</h2>
          <p className="mt-1 text-xs leading-5 text-white/40">Country is used only to suggest currency and support payment or tax handling. It does not determine service eligibility or legal conclusions.</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="text-sm text-white/70">Billing country<select required name="billingCountry" value={country} onChange={(event) => { const next = event.target.value; setCountry(next); if (CURRENCIES[next]) setCurrency(CURRENCIES[next]) }} className={fieldClass}><option value="">Select country</option>{Object.keys(CURRENCIES).map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
            <label className="text-sm text-white/70">Preferred currency<input required name="preferredCurrency" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} minLength={3} maxLength={3} className={fieldClass} /></label>
            <label className="text-sm text-white/70">Indicative budget<input type="number" min="0" step="0.01" name="budgetAmount" className={fieldClass} /></label>
            <label className="text-sm text-white/70">Budget currency<input name="budgetCurrency" defaultValue={currency} key={currency} minLength={3} maxLength={3} className={fieldClass} /></label>
          </div>
        </section>

        <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Requirements and communication</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="text-sm text-white/70">Confidentiality requirements<textarea name="confidentialityRequirements" className={textAreaClass} /></label>
            <label className="text-sm text-white/70">Compliance requirements<textarea name="complianceRequirements" className={textAreaClass} /></label>
            <label className="text-sm text-white/70 sm:col-span-2">Accessibility requirements<textarea name="accessibilityRequirements" className={textAreaClass} /></label>
            <label className="text-sm text-white/70">Preferred communication<select name="communicationMethod" value={method} onChange={(event) => setMethod(event.target.value)} className={fieldClass}><option value="portal_notification">Portal notification</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></label>
            {method === "email" && <label className="text-sm text-white/70">Communication email<input type="email" required name="communicationEmail" autoComplete="email" className={fieldClass} /></label>}
            {method === "whatsapp" && <label className="text-sm text-white/70">WhatsApp number<input type="tel" required name="communicationWhatsapp" autoComplete="tel" className={fieldClass} /></label>}
            <label className="text-sm text-white/70 sm:col-span-2">Additional notes<textarea name="additionalNotes" className={textAreaClass} /></label>
            <label className="text-sm text-white/70 sm:col-span-2">Supporting files <span className="text-white/35">(up to 10 files, 50MB each)</span><span className="mt-2 flex min-h-12 items-center gap-3 rounded-md border border-dashed border-[#24563d] px-4"><Upload className="h-4 w-4" aria-hidden="true" /><input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 10))} className="min-w-0 text-sm" /></span></label>
          </div>
        </section>

        <section className="space-y-4 rounded-md border border-[#143b28] bg-[#06110f] p-5 sm:p-6">
          <label className="flex items-start gap-3 text-sm leading-6 text-white/65"><input required name="authorizationConfirmed" type="checkbox" className="mt-1 h-4 w-4 accent-[#20dc73]" />I confirm that I am authorized to submit this lawful request and that the information supplied is accurate to the best of my knowledge.</label>
          <label className="flex items-start gap-3 text-sm leading-6 text-white/65"><input required name="termsAccepted" type="checkbox" className="mt-1 h-4 w-4 accent-[#20dc73]" />I accept the applicable terms and understand that submission is for feasibility review and is not an acceptance, quote or engagement.</label>
          <button type="submit" disabled={submitting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#20dc73] px-5 font-semibold text-black transition hover:bg-[#37e684] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"><Send className="h-4 w-4" aria-hidden="true" />{submitting ? "Submitting..." : "Submit for Bureau Review"}</button>
        </section>
      </form>
    </main>
  )
}
