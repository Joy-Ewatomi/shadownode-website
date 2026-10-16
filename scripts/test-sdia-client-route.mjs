import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)

function compile(source, mocks = {}) {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  const mockedRequire = (id) => id in mocks ? mocks[id] : require(id)
  new Function("require", "module", "exports", output)(mockedRequire, module, module.exports)
  return module.exports
}

const rawReport = {
  evidence: [{
    artifact_id: "artifact-rdap",
    artifact_type: "rdap_source_response",
    sha256: "a".repeat(64),
    data: { body_base64: "client-secret", nested: { response_body: "nested-client-secret" }, body_sha256: "b".repeat(64) },
  }],
}
const storedPayload = { status: "completed", domain: "example.com", result: rawReport }
const route = compile(fs.readFileSync("app/api/intelligence/domains/analyze/route.ts", "utf8"), {
  "next/server": { NextResponse: { json: (body, init = {}) => ({ status: init.status || 200, json: async () => body }) } },
  "@/lib/auth": { auditLog: async () => {} },
  "@/lib/app-origin": { createCanonicalApplicationUrl: (path) => `http://client.test${path}` },
  "@/lib/db": { query: async () => ({ rows: [{ severity: "completed", findings: JSON.stringify(storedPayload) }] }) },
  "@/lib/investigation-workspace": { requireCaseOperationalAccess: async () => ({ ok: true, caseId: "case-1", user: { id: "user-1" } }) },
  "@/lib/security-center": { isSameOriginMutation: () => true },
  "@/lib/sdia": { normalizeDomainInput: (value) => value },
  "@/lib/sdia-analysis-jobs": { failSdiaJob: async () => {}, parseSdiaJobPayload: (value) => JSON.parse(value), SDIA_ANALYSIS_TYPE: "domain_intelligence", signSdiaJob: async () => "signed" },
  "@/lib/sdia-evidence-bridge": compile(fs.readFileSync("lib/sdia-evidence-bridge.ts", "utf8")),
})

const request = { nextUrl: new URL("http://client.test/api/intelligence/domains/analyze?case_id=case-1&job_id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), headers: new Headers() }
const response = await route.GET(request, { params: Promise.resolve({ id: "case-1" }) })
const body = await response.json()
assert.equal(response.status, 200)
assert.equal(body.analysis.evidence[0].artifact_id, "artifact-rdap")
assert.equal(body.analysis.evidence[0].sha256, "a".repeat(64))
assert.equal(body.analysis.evidence[0].data.body_base64, undefined)
assert.equal(body.analysis.evidence[0].data.response_body, undefined)
assert.equal(body.analysis.evidence[0].data.body_sha256, "b".repeat(64))
assert.equal(JSON.stringify(body).includes("client-secret"), false)
assert.deepEqual(storedPayload.result, rawReport)

console.log("SDIA client-route redaction tests passed.")
