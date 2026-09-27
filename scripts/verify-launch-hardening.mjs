import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");

for (const file of [
  "app/not-found.tsx",
  "app/global-error.tsx",
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "app/security-policy/page.tsx",
  "app/contact/page.tsx",
  "app/robots.ts",
  "app/sitemap.ts",
]) {
  assert.ok(existsSync(file), file);
}

const home = read("app/page.tsx");
assert.match(home, /ShadowNode Operations Bureau Limited/i);
assert.doesNotMatch(
  home,
  /guarantee absolute courtroom admissibility|Strictly compliant|Zero-knowledge/i,
);
for (const href of ["/privacy", "/terms", "/security-policy", "/contact"]) {
  assert.ok(home.includes("href=\"" + href + "\""));
}

const layout = read("app/layout.tsx");
for (const expected of ["getTrustedApplicationOrigin", "openGraph", "twitter"]) {
  assert.ok(layout.includes(expected));
}

const robots = read("app/robots.ts");
for (const expected of ["disallow", "dashboard", "test-login"]) {
  assert.ok(robots.includes(expected));
}
const sitemap = read("app/sitemap.ts");
assert.doesNotMatch(sitemap, /dashboard|admin|cases/);

for (const file of ["app/test/layout.tsx", "app/test-login/layout.tsx"]) {
  const source = read(file);
  assert.ok(source.includes('NODE_ENV === "production"'));
  assert.ok(source.includes("notFound()"));
}

const upload = read("app/api/client/requests/[id]/evidence/route.ts");
for (const expected of [
  "getCurrentUser",
  'user.role !== "client"',
  "r.user_id = $2",
  "isSameOriginMutation",
  "UUID_PATTERN",
  "MAX_FILE_SIZE",
  "MAX_TOTAL_SIZE",
  "MAX_FILES",
  "ALLOWED_FILE_TYPES",
  "file.size <= 0",
  "crypto.randomUUID()",
  "storage_path",
]) {
  assert.ok(upload.includes(expected), "missing upload protection: " + expected);
}
assert.ok(
  upload.includes("createSignedEvidenceUrl") || upload.includes("storage_path"),
);
assert.ok(!upload.includes("safeFileName(file.name)"));
assert.ok(!upload.includes('console.error("REQUEST EVIDENCE UPLOAD ERROR:", error)'));

for (const doc of [
  "docs/production-launch-runbook.md",
  "docs/launch-record-template.md",
]) {
  assert.ok(existsSync(doc), doc);
}

console.log("Final launch hardening verifier passed.");
