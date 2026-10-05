import { NextRequest, NextResponse } from "next/server"
import { auditLog } from "@/lib/auth"
import { createCanonicalApplicationUrl } from "@/lib/app-origin"
import { query } from "@/lib/db"
import { requireCaseOperationalAccess } from "@/lib/investigation-workspace"
import { isSameOriginMutation } from "@/lib/security-center"
import { normalizeDomainInput } from "@/lib/sdia"
import { failSdiaJob, parseSdiaJobPayload, SDIA_ANALYSIS_TYPE, signSdiaJob } from "@/lib/sdia-analysis-jobs"

const HEADERS = { "Cache-Control": "private, no-store" }
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: HEADERS })
  const body = await request.json().catch(() => null)
  const caseId = typeof body?.case_id === "string" ? body.case_id : ""
  const domain = normalizeDomainInput(body?.domain)
  if (!caseId) return NextResponse.json({ error: "Select an authorized case before analysis." }, { status: 400, headers: HEADERS })
  if (!domain) return NextResponse.json({ error: "Enter a valid domain name without a URL, path or IP address." }, { status: 400, headers: HEADERS })
  const access = await requireCaseOperationalAccess(request, caseId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status, headers: HEADERS })

  const profile = await query<{ id: string }>("SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1", [access.user.id])
  if (!profile.rows[0]) return NextResponse.json({ error: "Your authorized profile could not be resolved." }, { status: 409, headers: HEADERS })
  const existing = await query<{ id: string; severity: string; findings: string }>(
    `SELECT id, severity, findings FROM analysis_results
     WHERE case_id=$1 AND created_by=$2 AND analysis_type=$3
       AND findings::jsonb->>'domain'=$4 AND severity IN ('queued','processing','completed')
       AND created_at > NOW() - INTERVAL '10 minutes'
     ORDER BY created_at DESC LIMIT 1`,
    [access.caseId, profile.rows[0].id, SDIA_ANALYSIS_TYPE, domain],
  )
  const previous = existing.rows[0]
  const previousPayload = parseSdiaJobPayload(previous?.findings)
  if (previous && previousPayload) return NextResponse.json({ job_id: previous.id, status: previous.severity }, { status: previous.severity === "completed" ? 200 : 202, headers: HEADERS })

  const payload = { status: "queued", domain, requested_by: access.user.id }
  const inserted = await query<{ id: string }>(
    `INSERT INTO analysis_results (case_id, analysis_type, findings, severity, created_by)
     VALUES ($1,$2,$3,'queued',$4) RETURNING id`,
    [access.caseId, SDIA_ANALYSIS_TYPE, JSON.stringify(payload), profile.rows[0].id],
  )
  const jobId = inserted.rows[0].id
  try {
    const workerUrl = createCanonicalApplicationUrl("/.netlify/functions/sdia-analysis-background")
    const dispatched = await fetch(workerUrl, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${signSdiaJob(jobId)}` }, body: JSON.stringify({ job_id: jobId }), cache: "no-store" })
    if (!dispatched.ok) throw new Error("dispatch_failed")
  } catch {
    await failSdiaJob(jobId)
    return NextResponse.json({ error: "Domain analysis could not be queued. Please try again later." }, { status: 503, headers: HEADERS })
  }
  await auditLog(access.user.id, "sdia_domain_analysis_queued", request, { case_id: access.caseId, domain, job_id: jobId })
  return NextResponse.json({ job_id: jobId, status: "queued" }, { status: 202, headers: HEADERS })
}

export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get("case_id") || ""
  const jobId = request.nextUrl.searchParams.get("job_id") || ""
  if (!caseId || !/^[0-9a-f-]{36}$/i.test(jobId)) return NextResponse.json({ error: "Invalid analysis job." }, { status: 400, headers: HEADERS })
  const access = await requireCaseOperationalAccess(request, caseId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status, headers: HEADERS })
  const result = await query<{ severity: string; findings: string }>(
    "SELECT severity, findings FROM analysis_results WHERE id=$1 AND case_id=$2 AND analysis_type=$3 LIMIT 1",
    [jobId, access.caseId, SDIA_ANALYSIS_TYPE],
  )
  const row = result.rows[0]
  const payload = parseSdiaJobPayload(row?.findings)
  if (!row || !payload) return NextResponse.json({ error: "Analysis job was not found." }, { status: 404, headers: HEADERS })
  return NextResponse.json({ job_id: jobId, status: payload.status, domain: payload.domain, analysis: payload.status === "completed" ? payload.result : undefined, error: payload.status === "failed" ? "Domain analysis service could not complete the request." : undefined }, { headers: HEADERS })
}
