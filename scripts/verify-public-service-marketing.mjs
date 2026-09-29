import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const files = {
  home: "app/page.tsx",
  request: "app/request/page.tsx",
  osint: "app/services/osint/page.tsx",
  training: "app/services/cybersecurity-training/page.tsx",
  shared: "components/public/PublicServicePage.tsx",
  sitemap: "app/sitemap.ts",
  robots: "app/robots.ts",
};

for (const path of Object.values(files)) assert.ok(existsSync(path), `missing ${path}`);

const home = read(files.home);
const request = read(files.request);
const osint = read(files.osint);
const training = read(files.training);
const shared = read(files.shared);
const sitemap = read(files.sitemap);
const robots = read(files.robots);

assert.ok((home.match(/Available now/g) || []).length >= 2);
assert.match(home, /href="\/services\/osint"/);
assert.match(home, /href="\/services\/cybersecurity-training"/);
assert.match(home, /href="\/services\/osint" className="block rounded-md/);
assert.match(home, /href="\/services\/cybersecurity-training" className="block rounded-md/);
assert.match(home, /DIGITAL FORENSICS \/\/ PLANNED/);
assert.match(home, /ETHICAL HACKING \/\/ PLANNED/);
assert.doesNotMatch(request, /Custom Service Request/);

for (const [source, path, requestPath] of [
  [osint, "/services/osint", "/dashboard/client/requests/osint"],
  [training, "/services/cybersecurity-training", "/dashboard/client/requests/cybersecurity"],
]) {
  assert.match(source, /export const metadata/);
  assert.match(source, /openGraph/);
  assert.ok(source.includes(`new URL("${path}", origin)`));
  assert.ok(source.includes(`requestHref="${requestPath}"`));
  assert.match(source, /"@type": "Service"/);
  assert.match(source, /"@type": "Organization"/);
  assert.ok(sitemap.includes(`"${path}"`));
  assert.ok(robots.includes(`"${path}"`));
}

for (const path of ["/privacy", "/terms", "/security", "/contact"]) {
  assert.ok(shared.includes(`href="${path}"`));
}
assert.match(shared, /authenticated portal, not ordinary email/i);
assert.match(shared, /min-h-12/);
assert.doesNotMatch(`${home}\n${osint}\n${training}`, /clientservices@shadownodebureau\.com/i);

for (const claim of [
  /court[- ]admissible/i,
  /court-ready/i,
  /guaranteed identification/i,
  /guaranteed recovery/i,
]) {
  assert.doesNotMatch(`${home}\n${osint}\n${training}`, claim);
}

assert.match(osint, /correlation between records is not automatic proof/i);
assert.match(training, /individuals, students, professionals, organizations and authorized institutions/i);
assert.match(shared, /Administrative review/);
assert.match(shared, /Acceptance and payment/);

console.log("Public service marketing verifier passed.");
