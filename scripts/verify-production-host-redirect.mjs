import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

const config = readFileSync("netlify.toml", "utf8");
assert.match(config, /Host = \["shadownodebureau\.netlify\.app"\]/);
assert.match(config, /Host = \["www\.shadownodebureau\.com"\]/);
assert.equal((config.match(/status = 301/g) || []).length, 2);
assert.equal((config.match(/to = "https:\/\/shadownodebureau\.com\/:splat"/g) || []).length, 2);
assert.doesNotMatch(config, /--shadownodebureau\.netlify\.app/);
assert.doesNotMatch(config, /Host = \["shadownodebureau\.com"\]/);

function redirectFor(input) {
  const url = new URL(input);
  if (!["shadownodebureau.netlify.app", "www.shadownodebureau.com"].includes(url.hostname)) return null;
  return new URL(`${url.pathname}${url.search}`, "https://shadownodebureau.com").toString();
}

assert.equal(
  redirectFor("https://shadownodebureau.netlify.app/login?next=%2Fdashboard"),
  "https://shadownodebureau.com/login?next=%2Fdashboard",
);
assert.equal(redirectFor("https://shadownodebureau.com/login?next=%2Fdashboard"), null);
assert.equal(redirectFor("https://www.shadownodebureau.com/services/osint"), "https://shadownodebureau.com/services/osint");
assert.equal(redirectFor("https://6abba444d2d86800082abab0--shadownodebureau.netlify.app/login"), null);
assert.equal(redirectFor("https://deploy-preview-42--shadownodebureau.netlify.app/login"), null);

const out = "/tmp/shadownode-host-redirect-test";
rmSync(out, { recursive: true, force: true });
execFileSync("npm", ["exec", "tsc", "--", "lib/app-origin.ts", "--outDir", out, "--module", "commonjs", "--target", "es2022", "--esModuleInterop", "--skipLibCheck"], { stdio: "inherit" });
const origins = await import(pathToFileURL(`${out}/app-origin.js`));
assert.deepEqual(
  origins.resolveTrustedApplicationOrigin({ APP_URL: "https://shadownodebureau.com", URL: "https://shadownodebureau.netlify.app", DEPLOY_PRIME_URL: "https://preview.example" }, true),
  { origin: "https://shadownodebureau.com", source: "APP_URL" },
);
assert.equal(
  origins.resolveTrustedApplicationOrigin({ URL: "https://shadownodebureau.netlify.app", DEPLOY_PRIME_URL: "https://preview.example" }, true),
  null,
);

for (const file of [
  "lib/oauth.ts",
  "lib/email-template.ts",
  "lib/certificate-document.ts",
  "lib/services/training-completion-service.ts",
  "app/api/client/payments/initialize/route.ts",
  "app/api/client/payments/callback/route.ts",
  "app/api/client/payments/flutterwave/initialize/route.ts",
  "app/api/client/payments/flutterwave/callback/route.ts",
  "app/sitemap.ts",
  "app/layout.tsx",
]) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(source, /process\.env\.(?:URL|DEPLOY_PRIME_URL)/, `${file} must not use a Netlify deployment origin`);
}

for (const file of [
  "app/dashboard/client/certificates/page.tsx",
  "app/api/training/[id]/certificate/route.ts",
]) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /createCanonicalApplicationUrl/);
  assert.match(source, /verification_token/);
  assert.doesNotMatch(source, /row\.verification_url|certificate\.verification_url/);
}

console.log("Production host redirect verifier passed.");
