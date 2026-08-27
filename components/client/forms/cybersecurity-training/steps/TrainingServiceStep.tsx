"use client"

import { Shield } from "lucide-react"

import { CYBERSECURITY_SERVICES } from "../constants"

type Props = {
  service_type: string
  custom_description: string
  onSelect: (service: string) => void
  onCustomDescriptionChange: (value: string) => void
}

export default function TrainingServiceStep({
  service_type,
  custom_description,
  onSelect,
  onCustomDescriptionChange,
}: Props) {

 const isCustom =
  service_type === "custom_training"

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


          {CYBERSECURITY_SERVICES.map((service)=>(
            <button
              key={service.id}
              type="button"
              onClick={() => onSelect(service.id)}
              className={`rounded-md border p-5 text-left transition ${
                service_type === service.id
                  ? "border-[#20dc73] bg-[#20dc73]/10"
                  : "border-[#143b28] hover:border-[#20dc73]/40"
              }`}
            >

              <h3 className="font-semibold text-white">
                {service.title}
              </h3>

              <p className="mt-2 text-sm text-white/60">
                {service.description}
              </p>

            </button>
          ))}



          {/* CUSTOM OPTION */}

      <button
  type="button"
  onClick={() => onSelect("custom_training")}
  className={`rounded-md border p-5 text-left transition ${
    service_type === "custom_training"
      ? "border-[#20dc73] bg-[#20dc73]/10"
      : "border-[#143b28] hover:border-[#20dc73]/40"
  }`}
>
  <h3 className="font-semibold text-white">
    Custom Requirement
  </h3>

  <p className="mt-2 text-sm text-white/60">
    Describe a cybersecurity training programme you need.
  </p>
</button>


        </div>


        {/* CUSTOM TEXTAREA */}

        {isCustom && (
          <div className="mt-5">

            <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
              Describe Your Custom Training Requirement
            </label>


            <textarea
              value={custom_description}
              onChange={(e)=>
                onCustomDescriptionChange(e.target.value)
              }
              rows={5}
              placeholder="Example: We need a cybersecurity awareness training covering phishing, password security, and incident reporting."
              className="
                w-full rounded-md
                border border-[#143b28]
                bg-black
                p-4
                text-white
                placeholder:text-white/30
                focus:border-[#20dc73]
                focus:outline-none
              "
            />

          </div>
        )}

      </div>

    </div>
  )
}