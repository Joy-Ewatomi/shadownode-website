export function formatDateForICS(d: string | Date | null) {
  if (!d) return ''
  const dt = new Date(d)
  // UTC format YYYYMMDDTHHMMSSZ
  return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function escapeText(s: string | null | undefined) {
  if (!s) return ''
  return String(s).replace(/\n/g, '\\n').replace(/\r/g, '').replace(/,/g, '\\,')
}

export type ICSAttendee = {
  name?: string
  email: string
  rsvp?: boolean
}

export type ICSOrganizer = {
  name?: string
  email: string
}

export function generateICS(opts: {
  uid: string
  title?: string
  description?: string
  start?: string | Date | null
  end?: string | Date | null
  url?: string | null
  location?: string | null
  method?: 'REQUEST' | 'PUBLISH' | 'CANCEL'
  organizer?: ICSOrganizer
  attendees?: ICSAttendee[]
  sequence?: number
}) {
  const dtstamp = formatDateForICS(new Date())
  const dtstart = formatDateForICS(opts.start || null)
  const dtend = formatDateForICS(opts.end || null)

  const lines: string[] = []
  lines.push('BEGIN:VCALENDAR')
  if (opts.method) lines.push(`METHOD:${opts.method}`)
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//Shadownode//EN')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('BEGIN:VEVENT')
  lines.push(`UID:${opts.uid}`)
  lines.push(`DTSTAMP:${dtstamp}`)
  if (typeof opts.sequence === 'number') lines.push(`SEQUENCE:${opts.sequence}`)

  if (dtstart) lines.push(`DTSTART:${dtstart}`)
  if (dtend) lines.push(`DTEND:${dtend}`)
  if (opts.title) lines.push(`SUMMARY:${escapeText(opts.title)}`)

  const descParts: string[] = []
  if (opts.description) descParts.push(opts.description)
  if (opts.url) descParts.push(`URL: ${opts.url}`)
  if (opts.location) descParts.push(`Location: ${opts.location}`)
  if (descParts.length) lines.push(`DESCRIPTION:${escapeText(descParts.join('\n'))}`)

  if (opts.location) lines.push(`LOCATION:${escapeText(opts.location)}`)
  if (opts.url) lines.push(`URL:${opts.url}`)

  // organizer
  if (opts.organizer && opts.organizer.email) {
    const cn = opts.organizer.name ? `;CN=${escapeText(opts.organizer.name)}` : ''
    lines.push(`ORGANIZER${cn}:mailto:${opts.organizer.email}`)
  }

  // attendees
  if (opts.attendees && opts.attendees.length) {
    for (const a of opts.attendees) {
      const cn = a.name ? `;CN=${escapeText(a.name)}` : ''
      const rsvp = a.rsvp ? ';RSVP=TRUE' : ''
      const part = (a as any).partstat ? `;PARTSTAT=${String((a as any).partstat).toUpperCase()}` : ''
      lines.push(`ATTENDEE${cn}${rsvp}${part}:mailto:${a.email}`)
    }
  }

  lines.push('END:VEVENT')
  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

export default generateICS
