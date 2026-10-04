import { NextRequest, NextResponse } from "next/server"
import { auditLog } from "@/lib/auth"
import { requireCaseOperationalAccess } from "@/lib/investigation-workspace"
import { isSameOriginMutation } from "@/lib/security-center"
import { normalizeDomainInput, sdiaDomainEndpoint } from "@/lib/sdia"

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
  const endpoint = sdiaDomainEndpoint()
  if (!endpoint) return NextResponse.json({ error: "Domain analysis is not configured." }, { status: 503, headers: HEADERS })
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" }
    if (process.env.SDIA_API_KEY) headers.Authorization = `Bearer ${process.env.SDIA_API_KEY}`
    const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ domain }), signal: controller.signal, cache: "no-store" })
    const data: unknown = await response.json().catch(() => null)
    if (!response.ok) return NextResponse.json({ error: response.status === 429 ? "Domain analysis is temporarily rate limited." : "Domain analysis service could not complete the request." }, { status: response.status === 429 ? 429 : 502, headers: HEADERS })
    if (!data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ error: "Domain analysis returned an unavailable response." }, { status: 502, headers: HEADERS })
    await auditLog(access.user.id, "sdia_domain_analysis_completed", request, { case_id: access.caseId, domain })
    return NextResponse.json({ case_id: access.caseId, domain, persisted: false, analysis: data }, { headers: HEADERS })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError"
    return NextResponse.json({ error: timedOut ? "Domain analysis timed out. Try again later." : "Domain analysis service is unavailable." }, { status: timedOut ? 504 : 502, headers: HEADERS })
  } finally { clearTimeout(timeout) }
}
