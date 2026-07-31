"use client"

import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  MessageSquareText,
  Phone,
  Search,
  Shield,
  User,
} from "lucide-react"

import { useCallback, useState } from "react"

/* ============================================================
   SERVICE OPTIONS
============================================================ */

const CYBERSECURITY_SERVICES = [
  "Cybersecurity Training Programs",
  "Security Awareness Training",
  "Digital Safety Education",
  "Security Assessment Guidance",
]

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  Nigeria: "NGN",
  "United States": "USD",
  Canada: "CAD",
  India: "INR",
  Ghana: "GHS",
  Kenya: "KES",
  Germany: "EUR",
  France: "EUR",
  Italy: "EUR",
  Spain: "EUR",
  Australia: "AUD",
  Japan: "JPY",
  China: "CNY",
  Singapore: "SGD",
}

const COUNTRY_OPTIONS = Object.keys(COUNTRY_CURRENCY_MAP).sort()

function getCurrency(country: string) {
  return COUNTRY_CURRENCY_MAP[country] || "USD"
}

/* ============================================================
   FORM DATA
============================================================ */

export type CybersecurityTrainingFormData = {
  category: string
  service_type: string

  training_organization_name: string
  training_client_type: string
  training_participant_count: string
  training_skill_level: string
  training_goal: string
  training_topics: string
  training_preferred_dates: string
  training_additional_requirements: string

  communication_method: string
  communication_email: string
  communication_country_code: string
  communication_phone: string
  communication_whatsapp: string
  communication_signal: string

  client_country: string
  preferred_currency: string

  authorization_confirmed: boolean
}

const EMPTY_FORM: CybersecurityTrainingFormData = {
  category: "cybersecurity",
  service_type: "",

  training_organization_name: "",
  training_client_type: "organization",
  training_participant_count: "",
  training_skill_level: "beginner",
  training_goal: "",
  training_topics: "",
  training_preferred_dates: "",
  training_additional_requirements: "",

  communication_method: "portal_notification",
  communication_email: "",
  communication_country_code: "",
  communication_phone: "",
  communication_whatsapp: "",
  communication_signal: "",

  client_country: "",
  preferred_currency: "",

  authorization_confirmed: false,
}

/* ============================================================
   STEPS
============================================================ */

const STEPS = [
  {
    id: 1,
    label: "Training Service",
  },
  {
    id: 2,
    label: "Training Details",
  },
  {
    id: 3,
    label: "Communication",
  },
  {
    id: 4,
    label: "Review & Authorization",
  },
]

/* ============================================================
   PROPS
============================================================ */

type Props = {
  submitting: boolean
  onSubmit: (data: CybersecurityTrainingFormData) => Promise<void>
}

/* ============================================================
   SMALL INPUT COMPONENT
============================================================ */

function FormInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#20dc73]/50"
      />
    </div>
  )
}

/* ============================================================
   COMPONENT
============================================================ */

export default function CybersecurityTrainingForm({
  submitting,
  onSubmit,
}: Props) {
  const [form, setForm] =
    useState<CybersecurityTrainingFormData>(EMPTY_FORM)

  const [step, setStep] = useState(1)

  const set = useCallback(
    (patch: Partial<CybersecurityTrainingFormData>) => {
      setForm((prev) => ({
        ...prev,
        ...patch,
      }))
    },
    []
  )

  function nextStep() {
    if (step < STEPS.length) {
      setStep(step + 1)
    }
  }

  function prevStep() {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  function handleCountry(country: string) {
    set({
      client_country: country,
      preferred_currency: getCurrency(country),
    })
  }

  function canProceed() {
    switch (step) {
      case 1:
        return Boolean(form.service_type)

      case 2:
        return (
          form.training_goal.trim().length >= 5 &&
          form.training_topics.trim().length >= 3
        )

case 3:
  if (!form.client_country || !form.communication_method) {
    return false
  }

  if (form.communication_method === "email") {
    return Boolean(form.communication_email)
  }

  if (form.communication_method === "whatsapp") {
    return Boolean(
      form.communication_country_code &&
      form.communication_whatsapp
    )
  }

  if (form.communication_method === "signal") {
    return Boolean(form.communication_signal)
  }

  return true

      case 4:
        return form.authorization_confirmed

      default:
        return false
    }
  }

  async function handleSubmit() {
    await onSubmit(form)
  }
    /* ============================================================
     STEP 1 — TRAINING SERVICE
  ============================================================ */

  function renderStep1() {
    return (
      <div className="space-y-6">
        <p className="text-sm text-white/60">
          Select the cybersecurity training service you require.
        </p>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            Service Division
          </label>

          <div className="rounded-md border border-[#20dc73] bg-[#20dc73]/10 p-5">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-[#20dc73]" />

              <div>
                <p className="font-semibold text-[#20dc73]">
                  Cybersecurity Services
                </p>

                <p className="text-sm text-white/60">
                  Professional cybersecurity education and awareness
                  programmes.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
            Select Service
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            {CYBERSECURITY_SERVICES.map((service) => (
              <button
                key={service}
                type="button"
                onClick={() =>
                  set({
                    service_type: service,
                  })
                }
                className={`rounded-md border p-4 text-left transition ${
                  form.service_type === service
                    ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                    : "border-[#143b28] text-white/70 hover:border-white/20"
                }`}
              >
                {service}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ============================================================
     STEP 2 — TRAINING DETAILS
  ============================================================ */

  function renderStep2() {
    return (
      <div className="space-y-6">
        <p className="text-sm text-white/60">
          Tell us about your training requirements.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Organization Name"
            value={form.training_organization_name}
            onChange={(v) =>
              set({
                training_organization_name: v,
              })
            }
          />

          <FormInput
            label="Participants"
            value={form.training_participant_count}
            onChange={(v) =>
              set({
                training_participant_count: v,
              })
            }
            placeholder="e.g. 25"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            Client Type
          </label>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "individual",
                label: "Individual",
                icon: User,
              },
              {
                value: "organization",
                label: "Organization",
                icon: Building2,
              },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  set({
                    training_client_type: item.value,
                  })
                }
                className={`flex items-center justify-center gap-2 rounded-md border p-3 transition ${
                  form.training_client_type === item.value
                    ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                    : "border-[#143b28] text-white/70"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            Current Skill Level
          </label>

          <div className="grid grid-cols-3 gap-3">
            {["beginner", "intermediate", "advanced"].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() =>
                  set({
                    training_skill_level: level,
                  })
                }
                className={`rounded-md border p-3 capitalize transition ${
                  form.training_skill_level === level
                    ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                    : "border-[#143b28] text-white/70"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            Training Goal
          </label>

          <textarea
            value={form.training_goal}
            onChange={(e) =>
              set({
                training_goal: e.target.value,
              })
            }
            className="min-h-28 w-full rounded-md border border-[#143b28] bg-black p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#20dc73]/50"
            placeholder="Describe the purpose of this training..."
          />
        </div>

        <FormInput
          label="Topics of Interest"
          value={form.training_topics}
          onChange={(v) =>
            set({
              training_topics: v,
            })
          }
          placeholder="Network Security, OSINT, DFIR..."
        />

        <FormInput
          label="Preferred Training Dates"
          value={form.training_preferred_dates}
          onChange={(v) =>
            set({
              training_preferred_dates: v,
            })
          }
          placeholder="July 2027"
        />

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            Additional Requirements
          </label>

          <textarea
            value={form.training_additional_requirements}
            onChange={(e) =>
              set({
                training_additional_requirements: e.target.value,
              })
            }
            className="min-h-24 w-full rounded-md border border-[#143b28] bg-black p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#20dc73]/50"
            placeholder="Any extra requirements..."
          />
        </div>
      </div>

    )
  }
    /* ============================================================
     STEP 3 — COMMUNICATION
  ============================================================ */

  function renderStep3() {
    return (
      <div className="space-y-6">
        <p className="text-sm text-white/60">
          Provide your preferred communication details so our team can
          contact you regarding your cybersecurity training request.
        </p>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            Country
          </label>

          <select
            value={form.client_country}
            onChange={(e) =>
              handleCountry(e.target.value)
            }
            className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/50"
          >
            <option value="">
              Select country
            </option>

            {COUNTRY_OPTIONS.map((country) => (
              <option
                key={country}
                value={country}
              >
                {country}
              </option>
            ))}
          </select>
        </div>


        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            Preferred Currency
          </label>

          <div className="flex items-center gap-3 rounded border border-[#143b28] bg-black px-4 py-3 text-sm text-white/70">
            <MapPin className="h-4 w-4 text-[#20dc73]" />

            {form.preferred_currency ||
              "Select country first"}
          </div>
        </div>


        <div>
          <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
            Communication Method
          </label>


          <div className="grid gap-3 sm:grid-cols-3">

            {[
  {
    value: "email",
    label: "Email",
    icon: MessageSquareText,
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    icon: Phone,
  },
  {
    value: "signal",
    label: "Signal",
    icon: MessageSquareText,
  },
  {
    value: "portal_notification",
    label: "Portal",
    icon: Shield,
  },
].map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() =>
                  set({
                    communication_method:
                      method.value,
                  })
                }
                className={`flex items-center justify-center gap-2 rounded-md border p-3 transition ${
                  form.communication_method ===
                  method.value
                    ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                    : "border-[#143b28] text-white/70"
                }`}
              >
                <method.icon className="h-4 w-4" />
                {method.label}
              </button>
            ))}

          </div>
        </div>


        {/* CONDITIONAL CONTACT INPUTS */}

{form.communication_method === "email" && (
  <FormInput
    label="Email Address"
    value={form.communication_email}
    onChange={(v) =>
      set({
        communication_email: v,
      })
    }
    placeholder="name@example.com"
  />
)}


{form.communication_method === "whatsapp" && (
  <div className="grid gap-4 sm:grid-cols-2">

    <FormInput
      label="Country Code"
      value={form.communication_country_code}
      onChange={(v) =>
        set({
          communication_country_code: v,
        })
      }
      placeholder="+234"
    />


    <FormInput
      label="WhatsApp Number"
      value={form.communication_whatsapp}
      onChange={(v) =>
        set({
          communication_whatsapp: v,
        })
      }
      placeholder="8012345678"
    />

  </div>
)}


{form.communication_method === "signal" && (
  <FormInput
    label="Signal Username"
    value={form.communication_signal}
    onChange={(v) =>
      set({
        communication_signal: v,
      })
    }
    placeholder="Signal username"
  />
)}

      </div>
    )
  }
    /* ============================================================
     STEP 4 — REVIEW & AUTHORIZATION
  ============================================================ */

  function renderStep4() {
    return (
      <div className="space-y-6">

        <p className="text-sm text-white/60">
          Review your cybersecurity training request before submission.
        </p>


        <div className="rounded-md border border-[#143b28] bg-black p-5 space-y-4">

          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#20dc73]" />

            <h3 className="font-semibold text-white">
              Training Request Summary
            </h3>
          </div>


          <div className="grid gap-4 text-sm">

            <div>
              <p className="text-white/40">
                Service
              </p>

              <p className="text-white">
                {form.service_type || "Not selected"}
              </p>
            </div>


            <div>
              <p className="text-white/40">
                Organization
              </p>

              <p className="text-white">
                {form.training_organization_name ||
                  "Not provided"}
              </p>
            </div>


            <div>
              <p className="text-white/40">
                Skill Level
              </p>

              <p className="capitalize text-white">
                {form.training_skill_level}
              </p>
            </div>


            <div>
              <p className="text-white/40">
                Training Goal
              </p>

              <p className="text-white">
                {form.training_goal}
              </p>
            </div>


            <div>
              <p className="text-white/40">
                Topics
              </p>

              <p className="text-white">
                {form.training_topics}
              </p>
            </div>


            <div>
              <p className="text-white/40">
                Contact
              </p>

              <p className="text-white">
                {form.communication_email ||
                  form.communication_phone ||
                  "No contact provided"}
              </p>
            </div>

          </div>

        </div>



        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-[#143b28] p-4">

          <input
            type="checkbox"
            checked={
              form.authorization_confirmed
            }
            onChange={(e) =>
              set({
                authorization_confirmed:
                  e.target.checked,
              })
            }
            className="mt-1 h-4 w-4 accent-[#20dc73]"
          />


          <span className="text-sm text-white/70">
            I confirm that the information provided
            is accurate and I authorize ShadowNode
            Intelligence Bureau to review this
            cybersecurity training request.
          </span>

        </label>


      </div>
    )
  }



  /* ============================================================
     STEP RENDERER
  ============================================================ */

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

      default:
        return null
    }
  }



  /* ============================================================
     FINAL RETURN
  ============================================================ */

  return (
    <div className="space-y-8">


      {/* STEP INDICATOR */}

      <div className="flex items-center justify-between">

        {STEPS.map((item) => (

          <div
            key={item.id}
            className="flex flex-1 items-center"
          >

            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${
                step >= item.id
                  ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                  : "border-[#143b28] text-white/40"
              }`}
            >
              {item.id}
            </div>


            <span
              className={`ml-2 hidden text-xs sm:block ${
                step >= item.id
                  ? "text-white"
                  : "text-white/40"
              }`}
            >
              {item.label}
            </span>


            {item.id !== STEPS.length && (
              <div className="mx-3 h-px flex-1 bg-[#143b28]" />
            )}

          </div>

        ))}

      </div>



      {/* FORM CONTENT */}

      <div>
        {renderStep()}
      </div>



      {/* NAVIGATION */}

      <div className="flex justify-between border-t border-[#143b28] pt-6">


        <button
          type="button"
          onClick={prevStep}
          disabled={step === 1}
          className="rounded-md border border-[#143b28] px-5 py-2 text-sm text-white/70 disabled:opacity-40"
        >
          Previous
        </button>



        {step < STEPS.length ? (

          <button
            type="button"
            onClick={nextStep}
            disabled={!canProceed()}
            className="rounded-md bg-[#20dc73] px-6 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            Next
          </button>

        ) : (

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              !canProceed()
            }
            className="flex items-center gap-2 rounded-md bg-[#20dc73] px-6 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >

            {submitting && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            Submit Request

          </button>

        )}

      </div>


    </div>
  )
}
