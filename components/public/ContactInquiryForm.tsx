"use client"
import { useState, type FormEvent } from "react"

export default function ContactInquiryForm() {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("")
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("")
    const form = event.currentTarget; const data = Object.fromEntries(new FormData(form))
    const response = await fetch("/api/public/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    const result = await response.json().catch(() => null); setBusy(false)
    if (!response.ok) return setError(result?.error || "Your enquiry could not be submitted.")
    setMessage(result.message); form.reset()
  }
  const input = "mt-2 h-11 w-full rounded border border-[#24563d] bg-black/30 px-3 text-white outline-none focus:border-[#76f0a3]"
  return <form onSubmit={submit} className="grid gap-4 rounded-md border border-[#24563d] bg-[#06110f]/90 p-5 sm:grid-cols-2">
    <label className="text-sm text-white/75">Name<input className={input} name="name" autoComplete="name" required maxLength={100} /></label>
    <label className="text-sm text-white/75">Email<input className={input} name="email" type="email" autoComplete="email" required /></label>
    <label className="text-sm text-white/75 sm:col-span-2">Organization (optional)<input className={input} name="organization" autoComplete="organization" maxLength={160} /></label>
    <label className="text-sm text-white/75 sm:col-span-2">Subject<input className={input} name="subject" required minLength={3} maxLength={160} /></label>
    <label className="hidden" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <label className="text-sm text-white/75 sm:col-span-2">How can we help?<textarea className={`${input} h-36 py-3`} name="message" required minLength={20} maxLength={5000} /></label>
    <p className="text-xs leading-5 text-white/50 sm:col-span-2">Do not include passwords, payment details, sensitive evidence or confidential case material. Use the secure portal after an engagement is established.</p>
    <button disabled={busy} className="min-h-11 rounded bg-[#20dc73] px-5 font-semibold text-black disabled:opacity-50">{busy ? "Sending..." : "Send enquiry"}</button>
    {message && <p role="status" className="self-center text-sm text-[#76f0a3]">{message}</p>}{error && <p role="alert" className="self-center text-sm text-red-300">{error}</p>}
  </form>
}
