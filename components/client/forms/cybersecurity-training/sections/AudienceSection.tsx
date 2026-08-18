"use client"

import OptionButton from "../OptionButton"

import {
  TRAINING_AUDIENCE_OPTIONS,
  INDUSTRIES,
} from "../constants"


type Props = {

  audience: string

  customAudience: string

  industry: string

  customIndustry: string


  onAudienceChange:(value:string)=>void

  onCustomAudienceChange:(value:string)=>void

  onIndustryChange:(value:string)=>void

  onCustomIndustryChange:(value:string)=>void

}



export default function AudienceSection({
  audience,
  customAudience,
  industry,
  customIndustry,

  onAudienceChange,
  onCustomAudienceChange,
  onIndustryChange,
  onCustomIndustryChange,

}: Props) {


  return (

    <div className="space-y-6">


      {/* TRAINING AUDIENCE */}

      <div>

        <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
          Training Audience
        </label>


        <div className="grid gap-3 sm:grid-cols-3">

          {TRAINING_AUDIENCE_OPTIONS.map((item)=>(

            <OptionButton

              key={item}

              label={item}

              active={audience === item}

              onClick={() =>
                onAudienceChange(item)
              }

            />

          ))}

        </div>


        {audience === "Custom" && (

          <textarea

            value={customAudience}

            onChange={(e)=>
              onCustomAudienceChange(
                e.target.value
              )
            }

            rows={5}

            placeholder="Describe your target training audience..."

            className="
              mt-4
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

        )}

      </div>



      {/* INDUSTRY */}

      <div>

        <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
          Industry
        </label>


        <select

          value={industry}

          onChange={(e)=>
            onIndustryChange(
              e.target.value
            )
          }

          className="
            h-10 w-full rounded
            border border-[#143b28]
            bg-black
            px-3
            text-sm
            text-white
          "

        >

          <option value="">
            Select Industry
          </option>


          {INDUSTRIES.map((item)=>(

            <option
              key={item}
              value={item}
            >
              {item}
            </option>

          ))}


        </select>



        {industry === "Other" && (

          <textarea

            value={customIndustry}

            onChange={(e)=>
              onCustomIndustryChange(
                e.target.value
              )
            }

            rows={5}

            placeholder="Describe your industry..."

            className="
              mt-4
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

        )}

      </div>


    </div>

  )

}