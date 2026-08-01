import type { LucideIcon } from "lucide-react"

type DashboardMetricCardProps = {
  label: string
  value: string | number
  helper: string
  icon: LucideIcon
}

export default function DashboardMetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: DashboardMetricCardProps) {
  return (
    <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">

      <div className="flex items-center justify-between">

        <p className="text-sm text-white/50">
          {label}
        </p>

        <Icon className="h-5 w-5 text-[#20dc73]" />

      </div>


      <p className="mt-4 text-3xl font-bold text-[#20dc73]">
        {value}
      </p>


      <p className="mt-2 text-xs text-white/40">
        {helper}
      </p>


    </div>
  )
}