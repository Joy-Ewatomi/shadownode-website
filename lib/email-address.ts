export function validMailbox(value: string | undefined) {
  const mailbox = value?.trim() || ""
  if (!mailbox || /[\r\n]/.test(mailbox)) return null

  const match = mailbox.match(
    /^(?:[^<>]{1,100}\s*)?<([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>$/,
  )
  const address = match?.[1] || mailbox

  return /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(address)
    ? mailbox
    : null
}

export function validReplyTo(value: string | undefined) {
  const mailbox = validMailbox(value)
  if (!mailbox) return null

  const match = mailbox.match(/<([^<>]+)>$/)
  return match?.[1] || mailbox
}

export function operationalEmailFrom() {
  return (
    validMailbox(process.env.CLIENT_SERVICES_EMAIL_FROM) ||
    validMailbox(process.env.EMAIL_FROM)
  )
}
