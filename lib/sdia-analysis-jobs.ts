import crypto from "node:crypto"
import { query } from "./db"

export const SDIA_ANALYSIS_TYPE = "sdia_domain_analysis"

export type SdiaJobPayload = {
  status: "queued" | "processing" | "completed" | "failed"
  domain: string
  requested_by: string
  result?: Record<string, unknown>
  error?: "unavailable" | "invalid_response"
}

function signingKey() {
  const key = process.env.AUTH_ENCRYPTION_KEY
  if (!key || key.length < 32) throw new Error("Background job signing is not configured")
  return key
}

export function signSdiaJob(jobId: string) {
  return crypto.createHmac("sha256", signingKey()).update(`sdia-domain:${jobId}`).digest("base64url")
}

export function verifySdiaJobSignature(jobId: string, signature: string) {
  const expected = Buffer.from(signSdiaJob(jobId))
  const supplied = Buffer.from(signature)
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied)
}

export function parseSdiaJobPayload(value: unknown): SdiaJobPayload | null {
  try {
    const data = typeof value === "string" ? JSON.parse(value) : value
    if (!data || typeof data !== "object" || Array.isArray(data)) return null
    const item = data as Partial<SdiaJobPayload>
    if (!["queued", "processing", "completed", "failed"].includes(item.status || "")) return null
    if (typeof item.domain !== "string" || typeof item.requested_by !== "string") return null
    return item as SdiaJobPayload
  } catch { return null }
}

export async function failSdiaJob(jobId: string, error: SdiaJobPayload["error"] = "unavailable") {
  await query(
    `UPDATE analysis_results
     SET severity='failed', findings=jsonb_set(jsonb_set(findings::jsonb, '{status}', '"failed"'), '{error}', to_jsonb($2::text))::text
     WHERE id=$1 AND analysis_type=$3`,
    [jobId, error, SDIA_ANALYSIS_TYPE],
  )
}
