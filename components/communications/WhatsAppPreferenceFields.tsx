"use client"

import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"

export const WHATSAPP_CONSENT_EXPLANATION = "I consent to transactional request, quotation, payment, case, report, training and certificate messages. Passwords, authentication secrets and sensitive evidence are not sent. I can change this later; data charges may apply. During Phase 1, replies are handled manually and are not automatically added to the portal."

export default function WhatsAppPreferenceFields({ value, consent, onValueChange, onConsentChange, numberError, consentError }: {
  value: string
  consent: boolean
  onValueChange: (value: string) => void
  onConsentChange: (value: boolean) => void
  numberError?: string
  consentError?: string
}) {
  return <div className="space-y-4">
    <label className="block text-sm font-medium text-white/75">WhatsApp number<span className="mt-2 block"><PhoneInput international value={value} onChange={(next) => onValueChange(next || "")} /></span>{numberError && <span role="alert" className="mt-2 block text-xs text-red-300">{numberError}</span>}</label>
    <label className="flex items-start gap-3 text-xs leading-5 text-white/60"><input type="checkbox" checked={consent} onChange={(event) => onConsentChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" /><span>{WHATSAPP_CONSENT_EXPLANATION}</span></label>
    {consentError && <p role="alert" className="text-xs text-red-300">{consentError}</p>}
  </div>
}
