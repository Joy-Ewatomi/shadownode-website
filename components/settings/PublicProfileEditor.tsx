"use client"

import { useEffect, useState, type FormEvent } from "react"

type Profile = { founder_name: string; biography: string | null; location: string | null; linkedin_url: string; contact_email: string; booking_url: string | null; has_portrait: boolean; has_sample_report: boolean; sample_report_name: string | null }
const empty: Profile = { founder_name: "Joy Ewatomi", biography: null, location: null, linkedin_url: "https://www.linkedin.com/in/joy-ewatomi-559250366/", contact_email: "joy.ewatomi@shadownodebureau.com", booking_url: null, has_portrait: false, has_sample_report: false, sample_report_name: null }

export default function PublicProfileEditor() {
  const [profile, setProfile] = useState<Profile>(empty)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  async function load() { const response = await fetch("/api/admin/public-profile", { cache: "no-store" }); if (response.ok) setProfile(await response.json()) }
  useEffect(() => { void load() }, [])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("")
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const response = await fetch("/api/admin/public-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) })
    const data = await response.json().catch(() => null); setMessage(response.ok ? data.message : data?.error || "Update failed."); setBusy(false); if (response.ok) void load()
  }
  async function upload(asset: "portrait" | "sample-report", file: File | undefined) {
    if (!file) return; setBusy(true); const form = new FormData(); form.set("file", file)
    const response = await fetch(`/api/admin/public-profile/${asset}`, { method: "POST", body: form }); const data = await response.json().catch(() => null)
    setMessage(response.ok ? data.message : data?.error || "Upload failed."); setBusy(false); if (response.ok) void load()
  }
  async function remove(asset: "portrait" | "sample-report") { setBusy(true); const response = await fetch(`/api/admin/public-profile/${asset}`, { method: "DELETE" }); const data = await response.json().catch(() => null); setMessage(response.ok ? data.message : data?.error || "Removal failed."); setBusy(false); if (response.ok) void load() }
  const field = "mt-2 h-11 w-full rounded border border-[#24563d] bg-black/35 px-3 text-white outline-none focus:border-[#20dc73]"
  return <div className="space-y-6">
    <header className="border-b border-[#143b28] pb-6"><p className="font-mono text-xs uppercase text-[#20dc73]">Website content</p><h1 className="mt-2 text-3xl font-bold">Public Founder Profile</h1><p className="mt-2 text-white/55">Manage the public biography, portrait, contact and proof-of-work links.</p></header>
    <form onSubmit={save} className="grid gap-5 rounded-md border border-[#143b28] bg-[#06110f] p-5 md:grid-cols-2">
      <label className="text-sm text-white/70">Founder name<input className={field} name="founder_name" required maxLength={100} value={profile.founder_name} onChange={e => setProfile({ ...profile, founder_name: e.target.value })} /></label>
      <label className="text-sm text-white/70">General location<input className={field} name="location" maxLength={120} value={profile.location || ""} onChange={e => setProfile({ ...profile, location: e.target.value })} placeholder="City, country or region" /></label>
      <label className="text-sm text-white/70 md:col-span-2">Biography<textarea className={`${field} h-40 py-3`} name="biography" maxLength={3000} value={profile.biography || ""} onChange={e => setProfile({ ...profile, biography: e.target.value })} /></label>
      <label className="text-sm text-white/70">LinkedIn URL<input className={field} name="linkedin_url" type="url" required value={profile.linkedin_url} onChange={e => setProfile({ ...profile, linkedin_url: e.target.value })} /></label>
      <label className="text-sm text-white/70">Public contact email<input className={field} name="contact_email" type="email" required value={profile.contact_email} onChange={e => setProfile({ ...profile, contact_email: e.target.value })} /></label>
      <label className="text-sm text-white/70 md:col-span-2">Booking URL<input className={field} name="booking_url" type="url" value={profile.booking_url || ""} onChange={e => setProfile({ ...profile, booking_url: e.target.value })} placeholder="https://..." /></label>
      <button disabled={busy} className="min-h-11 rounded bg-[#20dc73] px-5 font-semibold text-black disabled:opacity-50">{busy ? "Saving..." : "Save public profile"}</button>
    </form>
    <div className="grid gap-5 md:grid-cols-2">
      <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5"><h2 className="font-semibold">Founder portrait</h2><p className="mt-2 text-sm text-white/50">JPEG, PNG or WebP, up to 5 MB.</p><input className="mt-4 block text-sm" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => void upload("portrait", e.target.files?.[0])} />{profile.has_portrait && <button onClick={() => void remove("portrait")} className="mt-4 min-h-11 text-red-300">Remove portrait</button>}</section>
      <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5"><h2 className="font-semibold">Anonymized sample report</h2><p className="mt-2 text-sm text-white/50">Approved PDF only, up to 10 MB. Confirm it contains no client identifiers before upload.</p><input className="mt-4 block text-sm" type="file" accept="application/pdf" disabled={busy} onChange={e => void upload("sample-report", e.target.files?.[0])} />{profile.has_sample_report && <button onClick={() => void remove("sample-report")} className="mt-4 min-h-11 text-red-300">Remove sample report</button>}</section>
    </div>
    {message && <p role="status" className="rounded border border-[#24563d] p-4 text-sm">{message}</p>}
  </div>
}
