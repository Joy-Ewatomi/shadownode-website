"use client"

import { Mail, MessageCircle, Send } from "lucide-react"
import { type FormEvent, useState } from "react"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"

export type CustomRequestData = {
  category: "custom"
  service_type: "custom"
  custom_description: string
  description: string
  communication_method: "email" | "whatsapp"
  communication_email: string
  communication_whatsapp: string
  authorization_confirmed: boolean
}

export default function CustomRequestForm({
  submitting,
  onSubmit,
}: {
  submitting: boolean
  onSubmit: (data: CustomRequestData) => Promise<void>
}) {
  const [description, setDescription] = useState("")
  const [email, setEmail] = useState("")
  const [method, setMethod] = useState<"email" | "whatsapp">("email")
  const [whatsapp, setWhatsapp] = useState("")
  const [authorized, setAuthorized] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await onSubmit({
      category: "custom",
      service_type: "custom",
      custom_description: description,
      description,
      communication_method: method,
      communication_email: method === "email" ? email : "",
      communication_whatsapp: method === "whatsapp" ? whatsapp : "",
      authorization_confirmed: authorized,
    })
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 text-white sm:px-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Bureau Services</p>
        <h1 className="mt-2 text-3xl font-bold">Custom Request</h1>
        <p className="mt-2 text-sm leading-6 text-white/50">
          Present your requirement for feasibility review. An administrator will contact you if a service-specific information form is required.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 overflow-hidden rounded-md border border-[#143b28] bg-[#06110f]">
        <div className="space-y-5 border-b border-[#143b28] p-5 sm:p-6">
          <label className="block text-sm font-medium text-white/75">
            Describe Your Service Requirement
            <textarea required minLength={20} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Outline the service or project you require, its purpose, intended users, expected deliverables, and any technical, operational, or time constraints." className="mt-2 min-h-56 w-full resize-y rounded-md border border-[#143b28] bg-black/70 px-4 py-3 leading-6 text-white outline-none placeholder:text-white/25 focus:border-[#20dc73] focus:ring-1 focus:ring-[#20dc73]/30" />
          </label>
          <p className="text-xs leading-5 text-white/35">Provide enough context for the bureau to assess feasibility and determine whether a detailed follow-up form is required.</p>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <fieldset>
            <legend className="text-sm font-medium text-white/75">Preferred Communication Channel</legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {([
                { value: "email" as const, label: "Email", icon: Mail },
                { value: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle },
              ]).map((option) => {
                const Icon = option.icon
                const active = method === option.value
                return (
                  <button key={option.value} type="button" aria-pressed={active} onClick={() => { setMethod(option.value); setEmail(""); setWhatsapp("") }} className={`flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73] ${active ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]" : "border-[#143b28] bg-black/30 text-white/50 hover:border-white/20 hover:text-white/75"}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {method === "email" ? (
            <label className="block text-sm text-white/70">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 h-11 w-full rounded-md border border-[#143b28] bg-black/70 px-3 text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]" /></label>
          ) : (
            <label className="block text-sm text-white/70">WhatsApp number<PhoneInput required international defaultCountry="GB" value={whatsapp} onChange={(value) => setWhatsapp(value || "")} className="mt-2 min-h-11 rounded-md border border-[#143b28] bg-black/70 px-3 text-white focus-within:border-[#20dc73]" /></label>
          )}

          <div className="border-t border-[#143b28] pt-5">
            <label className="flex items-start gap-3 text-sm leading-5 text-white/55"><input required type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} className="mt-1 h-4 w-4 accent-[#20dc73]" />I confirm that I am authorized to submit this request and that the information is lawful and accurate.</label>
          </div>

          <button type="submit" disabled={submitting} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#20dc73] px-5 font-semibold text-black transition hover:bg-[#37e684] disabled:opacity-50"><Send className="h-4 w-4" aria-hidden="true" />{submitting ? "Submitting..." : "Submit for Bureau Review"}</button>
        </div>
      </form>
    </main>
  )
}
