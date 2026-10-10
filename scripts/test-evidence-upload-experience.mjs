import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")

const [dropzone, upload, panel, previewRoute, graph] = await Promise.all([
  read("components/evidence/EvidenceDropzone.tsx"),
  read("components/evidence/EvidenceUpload.tsx"),
  read("components/evidence/EvidencePanel.tsx"),
  read("app/api/cases/[id]/evidence/[evidenceId]/preview/route.ts"),
  read("app/cases/[id]/graph/page.tsx"),
])

assert.match(dropzone, /onDrop=/, "Evidence selection must support file drops.")
assert.match(dropzone, /type="file"/, "Evidence selection must retain file browsing.")
assert.match(dropzone, /onFileChange\(next\)/, "The selected file must remain controlled by its caller.")
assert.match(upload, /<EvidenceDropzone/, "The Evidence Vault uploader must use the dropzone.")
assert.match(upload, /\/api\/cases\/\$\{caseId\}\/evidence/, "The Evidence Vault must keep using its case-scoped upload API.")
assert.match(panel, /View authorized evidence image/, "Image evidence must have an explicit opt-in view action.")
assert.match(panel, /Authorized case-evidence preview/, "Image previews must explain that viewing is not verification.")
assert.match(previewRoute, /requireCaseReadAccess/, "Image preview must enforce case-read access.")
assert.match(previewRoute, /downloadEvidenceFile/, "Image preview must stream from private evidence storage.")
assert.match(previewRoute, /PREVIEWABLE_IMAGE_TYPES/, "Image preview must use a MIME whitelist.")
assert.match(previewRoute, /private, no-store/, "Image previews must not be shared-cacheable.")
assert.doesNotMatch(previewRoute, /createSignedEvidenceUrl/, "Image preview must not expose a signed storage URL.")
assert.match(graph, /uploadAndLinkEvidence/, "Graph creation must support upload and association.")
assert.match(graph, /target_type: targetType/, "Graph uploads must use the existing typed provenance association API.")
assert.match(graph, /A link records relevance; it does not verify/, "Graph UI must not imply that evidence links verify a record.")
assert.match(graph, /Drop evidence for this entity/, "Entity creation must expose evidence upload.")
assert.match(graph, /Drop evidence for this relationship/, "Relationship creation must expose evidence upload.")

console.log("Evidence upload experience checks passed.")
