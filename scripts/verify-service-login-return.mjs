import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const proxy = readFileSync("proxy.ts", "utf8");
const login = readFileSync("app/login/page.tsx", "utf8");
const redirects = readFileSync("lib/safe-login-redirect.ts", "utf8");
const osint = readFileSync("app/services/osint/page.tsx", "utf8");
const training = readFileSync("app/services/cybersecurity-training/page.tsx", "utf8");

assert.match(proxy, /searchParams\.set\("next", pathname\)/);
assert.match(osint, /requestHref="\/dashboard\/client\/requests\/osint"/);
assert.match(training, /requestHref="\/dashboard\/client\/requests\/cybersecurity"/);
assert.match(login, /safeLoginDestination\(params\.get\('next'\)\)/);
assert.match(login, /window\.location\.href = loginDestination/);
assert.match(login, /Sign in to continue to your/);
assert.match(redirects, /value\.startsWith\("\/\/"\)/);
assert.match(redirects, /parsed\.origin !== "https:\/\/shadownode\.invalid"/);
assert.match(redirects, /"\/dashboard"/);
assert.match(redirects, /"\/account"/);

console.log("Service login return verifier passed.");
