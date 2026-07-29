export default function RequestStatusBadge({ status }: { status: string }) {
  const label = status.replaceAll("_", " ")
  return <span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs capitalize text-[#20dc73]">{label}</span>
}
