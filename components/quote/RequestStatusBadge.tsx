const STATUS_LABELS: Record<
  string,
  string
> = {
  submitted: "Submitted",

  pending_review: "Pending Review",

  pending_admin_review:
    "Pending Administrator Review",

  admin_reviewed:
    "Administrator Reviewed",

  pending_super_admin_review:
    "Pending Final Review",

  super_admin_approved:
    "Approved",

  quote_sent:
    "Quote Sent",

  revised_quote_sent:
    "Revised Quote Sent",

  awaiting_client_acceptance:
    "Awaiting Your Decision",

  negotiation_requested:
    "Quote Review Requested",

  negotiation_in_progress:
    "Negotiation In Progress",

  accepted:
    "Accepted",

  converted:
    "Case Activated",

  declined:
    "Declined",

  rejected:
    "Rejected",

  cancelled:
    "Cancelled",

  completed:
    "Completed",
}

export default function RequestStatusBadge({
  status,
}: {
  status: string
}) {
  const normalizedStatus =
    status || "pending_review"

  const label =
    STATUS_LABELS[
      normalizedStatus
    ] ||
    normalizedStatus
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      )

  const isActionRequired = [
    "quote_sent",
    "revised_quote_sent",
    "awaiting_client_acceptance",
  ].includes(normalizedStatus)

  const isNegative = [
    "declined",
    "rejected",
    "cancelled",
  ].includes(normalizedStatus)

  const className = isNegative
    ? "border-red-400/30 bg-red-400/10 text-red-200"
    : isActionRequired
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : "border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"

  return (
    <span
      className={`inline-flex shrink-0 rounded border px-2 py-1 text-xs ${className}`}
    >
      {label}
    </span>
  )
}