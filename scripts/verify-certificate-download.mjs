import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"

const read = (path) => readFileSync(path, "utf8")
const actions = read("components/training/CertificateDownloadActions.tsx")
const clientList = read("app/dashboard/client/certificates/ClientCertificateList.tsx")
const management = read("components/training/CertificateManagementList.tsx")
const rolePage = read("app/dashboard/training/[id]/certificates/page.tsx")
const oldPage = read("app/dashboard/training/[id]/certificate/page.tsx")
const downloadRoute = read("app/api/training/[id]/certificate/download/route.ts")
const documentService = read("lib/certificate-document.ts")
const accessService = read("lib/services/training-operations-service.ts")
const routing = read("lib/notification-routing.ts")
const notificationService = read("lib/services/notification-service.ts")
const completionService = read("lib/services/training-completion-service.ts")
const schema = read("scripts/schema.md")

const roleFacingFiles = [
  "app/dashboard/client/certificates/ClientCertificateList.tsx",
  "app/dashboard/client/certificates/page.tsx",
  "app/dashboard/training/[id]/page.tsx",
  "app/dashboard/training/[id]/certificate/page.tsx",
  "app/dashboard/training/[id]/certificates/page.tsx",
  "components/training/CertificateDownloadActions.tsx",
  "components/training/CertificateManagementList.tsx",
]
for (const path of roleFacingFiles) {
  const source = read(path)
  assert.doesNotMatch(source, /View certificate|Print \/ Save as PDF|window\.print\(|print=1/)
  assert.doesNotMatch(source, /(?:import[^{\n]*TrainingCertificate|<TrainingCertificate\b)/)
}
assert.equal(existsSync("components/training/TrainingCertificate.tsx"), false)
assert.match(actions, /Download certificate \(PDF\)/)
assert.match(actions, /Download image \(PNG\)/)
assert.match(actions, /certificate\/download\?format=\$\{format\}&certificateId=/)
assert.match(actions, /cache: "no-store"/)
assert.match(clientList, /CertificateDownloadActions/)
assert.match(management, /CertificateDownloadActions/)

assert.match(downloadRoute, /getCurrentUser\(\)/)
assert.match(downloadRoute, /loadAuthorizedCertificateDocument\(id, certificateId, user\)/)
assert.match(downloadRoute, /Content-Type": format === "pdf" \? "application\/pdf" : "image\/png"/)
assert.match(downloadRoute, /Content-Disposition": `attachment;/)
assert.match(downloadRoute, /private, no-store, no-cache, must-revalidate/)
assert.match(downloadRoute, /X-Content-Type-Options": "nosniff"/)
assert.match(documentService, /ensureAccess\(engagementId, user, false\)/)
assert.ok(documentService.indexOf("ensureAccess(engagementId, user, false)") < documentService.indexOf("FROM training_certificates"))
assert.match(documentService, /WHERE id = \$1 AND training_engagement_id = \$2 AND status = 'issued'/)
assert.match(documentService, /renderCertificatePng[\s\S]*createCertificateSvg\(document\)/)
assert.match(documentService, /renderCertificatePdf[\s\S]*createCertificateSvg\(document\)/)
assert.match(documentService, /\/Count 1/)
assert.match(documentService, /MediaBox \[0 0 841\.89 595\.28\]/)
assert.match(documentService, /getTrustedApplicationOrigin\(\)/)

assert.match(rolePage, /ensureAccess\(id, user, false\)/)
assert.match(rolePage, /isApprovedTrainerForEngagement\(id, user, access\.profileId\)/)
assert.match(accessService, /isSuperAdminRole\([\s\S]*user\.role/)
assert.match(accessService, /user\.role ===[\s\n]*"administrator"/)
assert.match(accessService, /isApprovedTrainerForEngagement/)
assert.match(accessService, /engagement\.client_profile_id ===[\s\n]*profileId/)

assert.match(oldPage, /getCurrentUser\(\)/)
assert.match(oldPage, /ensureAccess\(id, user, false\)/)
assert.match(oldPage, /notFound\(\)/)
assert.match(oldPage, /redirect\("\/dashboard\/client\/certificates"\)/)
assert.doesNotMatch(oldPage, /training_certificates|CertificateDownloadActions|TrainingCertificate/)
for (const source of [routing, notificationService, completionService]) {
  assert.doesNotMatch(source, /\/dashboard\/training\/\$\{[^}]+\}\/certificate(?:[?`"])/)
}
assert.match(completionService, /destination: "\/dashboard\/client\/certificates"/)
assert.match(completionService, /action: "download_certificate"/)

assert.match(schema, /CREATE TABLE public.training_certificates/)
assert.match(schema, /pdf_url/)
assert.doesNotMatch(documentService, /pdf_url/)
console.log("Certificate download checks passed (all-role UI, authorization, compatibility, and output invariants).")
