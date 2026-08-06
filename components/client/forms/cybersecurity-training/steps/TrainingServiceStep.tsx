"use client"

type Props = {
  training_objective: string
  custom_training_objective: string
  onSelect: (value: string) => void
  onCustomChange: (value: string) => void
}

export default function TrainingObjectiveStep({
  training_objective,
  custom_training_objective,
  onSelect,
  onCustomChange,
}: Props) {

  const isCustom = training_objective === "custom"

  const objectives = [
    {
      id: "awareness",
      title: "Cybersecurity Awareness",
      description: "Improve employee security awareness."
    },
    {
      id: "technical",
      title: "Technical Skills Development",
      description: "Train technical teams."
    },
    {
      id: "custom",
      title: "Custom Objective",
      description: "Describe your own training objective."
    }
  ]


  return (
    <div className="space-y-5">

      <div className="grid gap-3 sm:grid-cols-2">

        {objectives.map((item)=>(
          <button
            key={item.id}
            type="button"
            onClick={()=>onSelect(item.id)}
            className={`
              rounded-md border p-5 text-left
              ${
                training_objective === item.id
                ? "border-[#20dc73] bg-[#20dc73]/10"
                : "border-[#143b28]"
              }
            `}
          >

            <h3 className="font-semibold text-white">
              {item.title}
            </h3>

            <p className="text-sm text-white/60 mt-2">
              {item.description}
            </p>

          </button>
        ))}

      </div>


      {isCustom && (

        <div>

          <label className="mb-2 block text-xs uppercase text-white/50">
            Custom Training Objective
          </label>


          <textarea
            rows={5}
            value={custom_training_objective}
            onChange={(e)=>
              onCustomChange(e.target.value)
            }
            placeholder="
Example: Train staff on phishing detection, incident reporting and safe handling of company data.
"
            className="
              w-full rounded-md
              border border-[#143b28]
              bg-black
              p-4
              text-white
              focus:border-[#20dc73]
              focus:outline-none
            "
          />

        </div>

      )}

    </div>
  )
}