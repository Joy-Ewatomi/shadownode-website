import { query } from "../../lib/db"
import { sdiaDomainEndpoint } from "../../lib/sdia"
import { failSdiaJob, parseSdiaJobPayload, SDIA_ANALYSIS_TYPE, verifySdiaJobSignature } from "../../lib/sdia-analysis-jobs"

export const config = { background: true }

export default async function handler(request: Request) {
  if (request.method !== "POST") return new Response(null, { status: 405 })
  const body = await request.json().catch(() => null) as { job_id?: unknown } | null
  const jobId = typeof body?.job_id === "string" ? body.job_id : ""
  const authorization = request.headers.get("authorization") || ""
  const signature = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""
  if (!jobId || !signature || !verifySdiaJobSignature(jobId, signature)) return new Response(null, { status: 401 })

  const claimed = await query<{ case_id: string; findings: string }>(
    `UPDATE analysis_results
     SET severity='processing', findings=jsonb_set(findings::jsonb, '{status}', '"processing"')::text
     WHERE id=$1 AND analysis_type=$2 AND severity='queued'
     RETURNING case_id, findings`,
    [jobId, SDIA_ANALYSIS_TYPE],
  )
  const row = claimed.rows[0]
  const payload = parseSdiaJobPayload(row?.findings)
  if (!row || !payload) return new Response(null, { status: 204 })

  try {
    const endpoint = sdiaDomainEndpoint()
    if (!endpoint) throw new Error("unavailable")
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" }
    if (process.env.SDIA_API_KEY) headers.Authorization = `Bearer ${process.env.SDIA_API_KEY}`
    const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ domain: payload.domain }), cache: "no-store" })
    const analysis: unknown = await response.json().catch(() => null)
    if (!response.ok) throw new Error("unavailable")
    if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) {
      await failSdiaJob(jobId, "invalid_response")
      return new Response(null, { status: 204 })
    }
    await query(
      `UPDATE analysis_results
       SET severity='completed', findings=$2
       WHERE id=$1 AND analysis_type=$3 AND severity='processing'`,
      [jobId, JSON.stringify({ ...payload, status: "completed", result: analysis }), SDIA_ANALYSIS_TYPE],
    )
    await query(
      "INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1,'sdia_domain_analysis_completed',$2::jsonb)",
      [payload.requested_by, JSON.stringify({ case_id: row.case_id, domain: payload.domain, job_id: jobId })],
    )
  } catch {
    await failSdiaJob(jobId)
  }
  return new Response(null, { status: 204 })
}
