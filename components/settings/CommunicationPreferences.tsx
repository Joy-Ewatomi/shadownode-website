"use client"

import { FormEvent, useEffect, useState } from "react"
import WhatsAppPreferenceFields from "@/components/communications/WhatsAppPreferenceFields"

type Preference = "portal" | "email" | "whatsapp"

export default function CommunicationPreferences() {
  const [preference, setPreference] = useState<Preference>("portal")
  const [email, setEmail] = useState<string | null>(null)
  const [number, setNumber] = useState("")
  const [consent, setConsent] = useState(false)
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void fetch("/api/account/communication-preferences", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (["portal", "email", "whatsapp"].includes(data.preference)) setPreference(data.preference)
        setEmail(data.verifiedEmail || null)
        setNumber(data.whatsappNumber || "")
        setConsent(data.whatsappConsent === true)
      })
      .catch(() => setMessage("Communication preferences are currently unavailable."))
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage("")
    const response = await fetch("/api/account/communication-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preference, whatsappNumber: number, whatsappConsent: consent }),
    }).catch(() => null)
    const data = response ? await response.json().catch(() => ({})) : {}
    setMessage(response?.ok ? "Communication preferences updated." : data.error || "Unable to update communication preferences.")
    setSaving(false)
  }

  const choices: Array<[Preference, string, string]> = [
    ["portal", "Portal", "Receive updates in your secure ShadowNode dashboard."],
    ["email", "Email", "Receive permitted service updates at your verified email address."],
    ["whatsapp", "WhatsApp", "Receive service updates through WhatsApp. Replies are handled manually and are not added to the portal."],
  ]

  return <form onSubmit={submit} className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
    <h2 className="font-semibold text-white">Communication preferences</h2>
    <p className="mt-1 text-sm text-white/50">Portal notifications remain your secure record.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">{choices.map(([value, label, description]) => <button key={value} type="button" aria-pressed={preference === value} onClick={() => setPreference(value)} className={`min-h-24 rounded-md border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73] ${preference === value ? "border-[#20dc73] bg-[#20dc73]/10" : "border-[#143b28]"}`}><span className="block font-medium text-white">{label}</span><span className="mt-1 block text-xs leading-5 text-white/50">{description}</span></button>)}</div>
    {preference === "email" && <p className="mt-4 text-sm text-white/65">Verified email: {email || "No verified email is available."}</p>}
    {preference === "whatsapp" && <div className="mt-4"><WhatsAppPreferenceFields value={number} consent={consent} onValueChange={setNumber} onConsentChange={setConsent} /></div>}
    {message && <p role="status" aria-live="polite" className="mt-4 text-sm text-white/70">{message}</p>}
    <button disabled={saving} className="mt-5 min-h-11 rounded-md bg-[#20dc73] px-4 font-semibold text-[#03110a] disabled:opacity-60">{saving ? "Saving..." : "Save preferences"}</button>
  </form>
}
