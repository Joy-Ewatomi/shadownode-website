"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type TrackKey = "osint" | "forensics" | "hacking" | "gov" | "correctional" | "legal" | "research" | "opsec"

type Track = {
  title: string
  description: string
  status?: string
  serviceKey?: string
  notifyLabel?: string
  clarification?: string
  groups: Array<{ heading: string; items: string[] }>
}

const TRACKS: Record<TrackKey, Track> = {
  osint: {
    title: "Open Source Intelligence",
    description: "Lawful research using public sources to verify information, map digital footprints, identify connections and document findings.",
    clarification: "OSINT does not include unauthorized account access, hacking or private-device extraction.",
    groups: [
      { heading: "People and identity research", items: ["Identity and background verification", "Username and social-media research", "Phone and email research using lawful sources", "Employment, business and professional-history research", "Location and timeline verification where information is available"] },
      { heading: "Website and infrastructure research", items: ["Domain, DNS and website investigation", "Publicly visible network-infrastructure research", "Website and organization relationship mapping", "Scam, fraud and suspicious-domain research"] },
      { heading: "Reports and evidence", items: ["Source capture and documentation", "Timestamped and hash-verified evidence", "Relationship and timeline mapping", "Clear investigation reports", "Technical litigation-support packages"] },
    ],
  },
  forensics: {
    title: "Digital Forensics", status: "Planned for January 2027", serviceKey: "digital_forensics",
    notifyLabel: "Notify me when Digital Forensics becomes available",
    description: "Documented examination and preservation of digital devices, files and account data for authorized investigations.",
    clarification: "Evidence is prepared in line with applicable requirements; admissibility is determined by the relevant legal process.",
    groups: [
      { heading: "Devices and files", items: ["Mobile-device examination", "Computer and storage-drive examination", "Forensic imaging", "Deleted-file recovery where technically possible", "File and metadata analysis"] },
      { heading: "Accounts and communications", items: ["Authorized cloud-storage examination", "Email and communication analysis", "Activity and event reconstruction", "Cryptocurrency-wallet artifact examination"] },
      { heading: "Evidence handling", items: ["Evidence hashing", "Chain-of-custody documentation", "Incident and compromise timelines", "Technical forensic reports", "Evidence preparation aligned with applicable legal requirements"] },
    ],
  },
  hacking: {
    title: "Ethical Hacking", status: "Target launch: April 2027", serviceKey: "ethical_hacking",
    notifyLabel: "Notify me when Ethical Hacking launches",
    description: "Authorized security testing that helps organizations identify weaknesses and improve their defenses.",
    clarification: "Testing requires written authorization and an agreed scope.",
    groups: [
      { heading: "Security testing", items: ["Network security testing", "Web and application security testing", "Vulnerability identification", "Risk and severity classification", "Controlled attack simulations"] },
      { heading: "Defensive readiness", items: ["Detection and response testing", "Security-architecture reviews", "Secure-code reviews", "Phishing-awareness exercises", "Incident-response simulations"] },
      { heading: "Remediation", items: ["Prioritized remediation guidance"] },
    ],
  },
  gov: {
    title: "Government Consulting", status: "In development", serviceKey: "government_consulting",
    notifyLabel: "Notify me when Government Consulting becomes available",
    description: "Cybersecurity, digital-investigation and intelligence-support services for authorized public-sector institutions.",
    clarification: "Services are limited to authorized, lawful institutional work and do not include unrestricted surveillance.",
    groups: [
      { heading: "Training and capacity", items: ["OSINT and digital-investigation training", "Cybersecurity training", "Digital-evidence fundamentals", "Threat-intelligence capacity building"] },
      { heading: "Investigation support", items: ["Investigation-workflow development", "Evidence-collection procedures", "Digital-risk assessment", "Security-policy support"] },
      { heading: "Preparedness", items: ["Intelligence briefings", "Incident-preparedness planning"] },
    ],
  },
  correctional: {
    title: "Correctional Intelligence", status: "Planned service", serviceKey: "correctional_intelligence",
    notifyLabel: "Notify me when Correctional Intelligence becomes available",
    description: "Future intelligence and security support for authorized correctional institutions.",
    groups: [
      { heading: "Authorized intelligence support", items: ["Authorized communication-pattern analysis", "Visitor and contact-network analysis", "Contraband and organized-activity intelligence", "Threat assessment", "Incident-pattern analysis"] },
      { heading: "Institutional security", items: ["Facility-security reviews", "Staff-safety intelligence", "Internal security reviews", "Intelligence-report preparation", "Correctional security-policy support"] },
    ],
  },
  legal: {
    title: "Legal Advisory", status: "Planned service", serviceKey: "legal_advisory",
    notifyLabel: "Notify me when Legal Advisory becomes available",
    description: "Technical investigation and digital-evidence support for legal professionals, investigators and clients.",
    clarification: "ShadowNode provides technical investigative support and does not provide legal representation or replace independent legal advice.",
    groups: [
      { heading: "Digital evidence support", items: ["Digital-evidence review", "Evidence-integrity verification", "Chain-of-custody documentation", "Metadata and timeline reconstruction", "Technical investigation reports", "Court-presentation materials"] },
      { heading: "Financial and business research", items: ["Public-source financial-crime research", "Sanctions and PEP screening", "Business and beneficial-ownership research", "Transaction and relationship mapping"] },
      { heading: "Professional collaboration", items: ["Collaboration with retained legal counsel"] },
    ],
  },
  research: {
    title: "Research & Threat Intelligence", status: "Planned service", serviceKey: "research_threat_intelligence",
    notifyLabel: "Notify me when Research & Threat Intelligence becomes available",
    description: "Research and monitoring that help organizations understand digital threats, suspicious activity and emerging risks.",
    groups: [
      { heading: "Threat research", items: ["Threat-actor research", "Fraud and criminal-network mapping", "Stolen-asset and scam-network research", "Malicious-domain and infrastructure analysis", "Emerging-threat monitoring"] },
      { heading: "Organizational risk", items: ["Sanctions-list screening", "Supply-chain risk research", "Brand and executive exposure monitoring", "Strategic intelligence briefings"] },
    ],
  },
  opsec: {
    title: "OPSEC Consulting", status: "Planned service", serviceKey: "opsec_consulting",
    notifyLabel: "Notify me when OPSEC Consulting becomes available",
    description: "Practical guidance for reducing digital exposure and protecting sensitive organizational activities.",
    groups: [
      { heading: "Exposure and privacy", items: ["Digital-footprint reviews", "Privacy and exposure assessments", "Threat modelling", "Executive digital-safety reviews", "Sensitive-information exposure reviews"] },
      { heading: "Organizational resilience", items: ["Information-handling guidance", "Organization-wide security-gap analysis", "Crisis-response planning", "Prioritized security recommendations"] },
    ],
  },
}

function LaunchInterestForm({ track }: { track: Track }) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || !track.serviceKey) return
    setSubmitting(true)
    setError("")
    const form = new FormData(event.currentTarget)
    const email = form.get("email")
    try {
      const response = await fetch("/api/public/service-launch-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_key: track.serviceKey, email }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "We could not save your request. Please try again.")
      setSuccess(data.message)
      event.currentTarget.reset()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not save your request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) return <p className="font-bold text-primary" role="status">{success}</p>

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor={`launch-email-${track.serviceKey}`} className="block text-xs font-bold text-white/70">{track.notifyLabel}</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id={`launch-email-${track.serviceKey}`} name="email" type="email" autoComplete="email" required placeholder="Email address" className="h-11 bg-background text-xs text-white" />
        <Button type="submit" disabled={submitting} className="h-11 shrink-0 bg-primary px-4 text-xs font-bold text-background hover:bg-primary/80 disabled:opacity-60">{submitting ? "Saving..." : "Notify me"}</Button>
      </div>
      <p className="text-[11px] leading-5 text-white/45">Email me when this service becomes available. This address will be used only for this service-launch notification.</p>
      {error && <p className="text-sm text-red-300" role="alert">{error}</p>}
    </form>
  )
}

export default function ServiceTrackDetails({ trackKey }: { trackKey: string }) {
  const track = TRACKS[trackKey as TrackKey]
  if (!track) return null

  return (
    <>
      <div className="flex flex-col justify-between gap-4 border-b border-primary/10 pb-4 pr-20 sm:flex-row sm:items-center">
        <div>
          <h4 className="text-base font-bold uppercase text-primary">{track.title}</h4>
          <p className="mt-1 text-white/50">{track.description}</p>
        </div>
        {trackKey === "osint" ? (
          <Link href="/request"><Button className="h-10 rounded-sm bg-primary px-5 text-xs font-bold uppercase tracking-wider text-background hover:bg-primary/85">Request Consultation</Button></Link>
        ) : (
          <span className="self-start rounded border border-primary/30 bg-primary/5 px-2 py-1 text-[10px] font-bold uppercase text-primary sm:self-center">{track.status}</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-6 text-white/70 sm:grid-cols-2 lg:grid-cols-3">
        {track.groups.map((group) => (
          <div key={group.heading}>
            <span className="mb-1.5 block font-bold uppercase text-primary">// {group.heading}</span>
            <ul className="space-y-1 text-white/55">{group.items.map((item) => <li key={item}>• {item}</li>)}</ul>
          </div>
        ))}
      </div>
      {track.clarification && <p className="rounded border border-primary/15 bg-primary/[0.03] p-3 text-[11px] leading-5 text-white/60">{track.clarification}</p>}
      {track.serviceKey && <div className="max-w-xl rounded border border-primary/20 bg-primary/[0.03] p-4"><LaunchInterestForm track={track} /></div>}
    </>
  )
}
