import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"

const root = new URL("../", import.meta.url)
const read = (path) => readFileSync(new URL(path, root), "utf8")

const references = execFileSync(
  "rg",
  [
    "-n", "-i", "--hidden",
    "--glob", "!node_modules/**",
    "--glob", "!.next/**",
    "--glob", "!.git/**",
    "request/anonymous|anonymous submission|anonymous service request",
    ".",
  ],
  { cwd: root, encoding: "utf8" },
)

const allowedReferenceFiles = new Set([
  "app/api/requests/anonymous/route.ts",
  "scripts/verify-anonymous-retirement.mjs",
])

for (const line of references.trim().split("\n").filter(Boolean)) {
  const file = line.replace(/^\.\//, "").split(":")[0]
  assert.ok(allowedReferenceFiles.has(file), `Unexpected client-facing anonymous reference: ${line}`)
}

assert.equal(existsSync(new URL("app/request/anonymous/page.tsx", root)), false)
assert.equal(existsSync(new URL("app/request/anonymous/[service]/page.tsx", root)), false)

const retiredApi = read("app/api/requests/anonymous/route.ts")
assert.match(retiredApi, /export async function POST\(\)/)
assert.match(retiredApi, /status: 410/)
assert.match(retiredApi, /ANONYMOUS_REQUESTS_RETIRED/)
assert.match(retiredApi, /no-store/)
assert.doesNotMatch(retiredApi, /INSERT INTO requests|notifyAdmins|query\(/)
assert.doesNotMatch(retiredApi, /export async function GET|export async function PUT|export async function DELETE/)

const tokenApi = read("app/api/requests/[token]/route.ts")
assert.match(tokenApi, /export async function GET/)
assert.match(tokenApi, /\^\[A-Za-z0-9_-\]\{32\}\$/)
assert.match(tokenApi, /\.eq\("is_anonymous", true\)/)
assert.match(tokenApi, /no-store/)
assert.doesNotMatch(tokenApi, /console\./)
assert.doesNotMatch(tokenApi, /\btoken,\s*\n\s*request_id/)
assert.doesNotMatch(tokenApi, /export async function POST/)

const publicRequest = read("app/request/page.tsx")
for (const service of [
  "OSINT / Investigation Request",
  "Cybersecurity Training Request",
  "Custom Service Request",
]) {
  assert.match(publicRequest, new RegExp(service.replace("/", "\\/")))
}
assert.doesNotMatch(publicRequest, /anonymous/i)

for (const file of [
  "components/client/forms/OsintRequestForm.tsx",
  "components/client/forms/CybersecurityTrainingForm.tsx",
  "components/client/forms/cybersecurity-training/steps/CommunicationStep.tsx",
]) {
  assert.doesNotMatch(read(file), /anonymous/i)
}

const schema = read("scripts/schema.md")
assert.match(schema, /is_anonymous boolean DEFAULT false/)
assert.match(read("app/admin/page.tsx"), /request\.is_anonymous/)
assert.match(read("app/admin/cases/page.tsx"), /selectedCase\.is_anonymous/)

console.log("Anonymous request retirement verification passed.")
