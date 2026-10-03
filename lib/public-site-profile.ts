import { query } from "@/lib/db"

export const PUBLIC_SITE_BUCKET = "public-site"
export const DEFAULT_FOUNDER_NAME = "Joy Ewatomi"
export const DEFAULT_LINKEDIN_URL = "https://www.linkedin.com/in/joy-ewatomi-559250366/"
export const DEFAULT_CONTACT_EMAIL = "joy.ewatomi@shadownodebureau.com"

export type PublicSiteProfile = {
  founder_name: string
  biography: string | null
  location: string | null
  linkedin_url: string
  contact_email: string
  booking_url: string | null
  has_portrait: boolean
  has_sample_report: boolean
  sample_report_name: string | null
}

export function safePublicUrl(value: unknown, allowedHost?: string) {
  if (typeof value !== "string" || /[\r\n]/.test(value)) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== "https:" || url.username || url.password) return null
    if (allowedHost && url.hostname !== allowedHost) return null
    return url.toString()
  } catch { return null }
}

export async function getPublicSiteProfile(): Promise<PublicSiteProfile> {
  try {
    const result = await query<{
      founder_name: string; biography: string | null; location: string | null
      linkedin_url: string; contact_email: string; booking_url: string | null
      portrait_path: string | null; sample_report_path: string | null; sample_report_name: string | null
    }>(`SELECT founder_name, biography, location, linkedin_url, contact_email, booking_url,
               portrait_path, sample_report_path, sample_report_name
        FROM public_site_profile WHERE singleton = true LIMIT 1`)
    const row = result.rows[0]
    if (row) return {
      founder_name: row.founder_name || DEFAULT_FOUNDER_NAME,
      biography: row.biography,
      location: row.location,
      linkedin_url: safePublicUrl(row.linkedin_url, "www.linkedin.com") || DEFAULT_LINKEDIN_URL,
      contact_email: row.contact_email || DEFAULT_CONTACT_EMAIL,
      booking_url: safePublicUrl(row.booking_url),
      has_portrait: Boolean(row.portrait_path),
      has_sample_report: Boolean(row.sample_report_path),
      sample_report_name: row.sample_report_name,
    }
  } catch { /* Migration may not yet be applied. */ }
  return { founder_name: DEFAULT_FOUNDER_NAME, biography: null, location: null,
    linkedin_url: DEFAULT_LINKEDIN_URL, contact_email: DEFAULT_CONTACT_EMAIL,
    booking_url: null, has_portrait: false, has_sample_report: false, sample_report_name: null }
}
