import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"
import sharp from "sharp"

const require = createRequire(import.meta.url)
const source = fs.readFileSync("lib/certificate-document.ts", "utf8")
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText
const module = { exports: {} }
const wrapper = vm.runInNewContext(
  `(function (exports, require, module, __filename, __dirname) { ${output}\n})`,
  { Buffer, URL, process, console, Intl, setTimeout, clearTimeout },
)
const guardedRequire = (specifier) => {
  if (specifier === "@/lib/app-origin") return { getTrustedApplicationOrigin: () => "https://shadownodebureau.netlify.app" }
  if (specifier === "@/lib/db") return { query: () => { throw new Error("Database must not be used by renderer tests") } }
  if (specifier === "@/lib/services/training-operations-service") return { ensureAccess: () => { throw new Error("Access service must not be used by renderer tests") } }
  if (specifier === "@/lib/auth") return {}
  return require(specifier)
}
wrapper(module.exports, guardedRequire, module, path.resolve("lib/certificate-document.ts"), path.resolve("lib"))
const renderer = module.exports

assert.equal(renderer.CERTIFICATE_WIDTH, 3508)
assert.equal(renderer.CERTIFICATE_HEIGHT, 2480)
assert.doesNotMatch(source, /density\s*:\s*300/)
assert.match(source, /Geist-Regular\.ttf/)
assert.match(source, /@font-face/)

const outputDir = "/tmp/shadownode-certificate-tests"
fs.mkdirSync(outputDir, { recursive: true })
const fixtures = [
  { slug: "short", recipientName: "Ada Cole", trainingTitle: "Operational Security Fundamentals" },
  { slug: "long", recipientName: "Alexandria Catherine Montgomery-Wellington", trainingTitle: "Advanced Cybersecurity Incident Response, Digital Evidence Preservation and Operational Readiness" },
  { slug: "unicode", recipientName: "José Chloë O’Connor & 李明", trainingTitle: "Sécurité numérique: Analyse, réponse & résilience" },
]
const base = {
  id: "11111111-1111-4111-8111-111111111111",
  engagementId: "22222222-2222-4222-8222-222222222222",
  certificateNumber: "SNOB-CERT-2026-000123",
  organizationName: "ShadowNode Client Organisation",
  trainingType: "Professional training programme",
  trainerName: "Joy Ewatomi, Chief Executive Officer",
  completionDate: "2026-09-25T12:00:00.000Z",
  issueDate: "2026-09-26T12:00:00.000Z",
  verificationUrl: "https://shadownodebureau.netlify.app/verify/certificate/test-verification-token",
}
for (const fixture of fixtures) {
  const document = { ...base, ...fixture }
  const png = await renderer.renderCertificatePng(document)
  const pdf = await renderer.renderCertificatePdf(document)
  const pngPath = path.join(outputDir, fixture.slug + ".png")
  const pdfPath = path.join(outputDir, fixture.slug + ".pdf")
  fs.writeFileSync(pngPath, png)
  fs.writeFileSync(pdfPath, pdf)
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG")
  const metadata = await sharp(png).metadata()
  assert.equal(metadata.width, 3508)
  assert.equal(metadata.height, 2480)
  const stats = await sharp(png).stats()
  assert.ok(stats.channels.some((channel) => channel.min < 30 && channel.max > 220), "PNG must contain meaningful contrast")
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-")
  assert.match(pdf.toString("latin1"), /\/Count 1\b/)
  assert.match(pdf.toString("latin1"), /\/MediaBox \[0 0 841\.89 595\.28\]/)
  assert.ok(png.length > 50_000 && png.length < 15_000_000)
  assert.ok(pdf.length > 50_000 && pdf.length < 15_000_000)
  console.log(JSON.stringify({ fixture: fixture.slug, pngPath, pngBytes: png.length, pdfPath, pdfBytes: pdf.length }))
}
console.log("Certificate generator verification passed.")
