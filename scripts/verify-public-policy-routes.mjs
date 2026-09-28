import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const privacy = read("app/privacy/page.tsx");
const terms = read("app/terms/page.tsx");
const security = read("app/security/page.tsx");
const contact = read("app/contact/page.tsx");
const legacySecurity = read("app/security-policy/page.tsx");
const shell = read("components/public/PublicPolicyLayout.tsx");
const home = read("app/page.tsx");
const sitemap = read("app/sitemap.ts");
const robots = read("app/robots.ts");
const proxy = read("proxy.ts");
const userMenu = read("components/dashboard/UserMenu.tsx");
const rootLayout = read("app/layout.tsx");

for (const source of [privacy, terms, security, contact]) {
  assert.match(source, /export const metadata/);
  assert.match(source, /PublicPolicyLayout/);
  assert.match(source, /ShadowNode Operations Bureau Limited/i);
}

for (const route of ["/privacy", "/terms", "/security", "/contact"]) {
  assert.ok(shell.includes(`href: "${route}"`));
  assert.ok(home.includes(`href="${route}"`));
  assert.ok(sitemap.includes(`"${route}"`));
  assert.ok(robots.includes(`"${route}"`));
}

for (const topic of [
  "Account and contact information",
  "Service requests and submitted materials",
  "Communications",
  "Authentication and security information",
  "Payment references",
  "Google OAuth information",
  "Google Calendar information",
  "Retention and security",
  "Deletion requests and user rights",
]) assert.ok(privacy.includes(topic), `Privacy policy missing ${topic}`);
assert.match(privacy, /Google data is used only/);
assert.match(privacy, /No online service can guarantee absolute security/);
assert.doesNotMatch(privacy, /automatically court admissible|regulatory certified/i);

for (const topic of [
  "Lawful and authorized use",
  "Accounts and service requests",
  "Quotations, payments, and cancellations",
  "Evidence and submitted materials",
  "Intellectual property and permitted use",
  "Technical support, not legal representation",
  "Availability, limitations, and termination",
]) assert.ok(terms.includes(topic), `Terms missing ${topic}`);

for (const prohibited of [
  "destructive testing",
  "denial-of-service",
  "social engineering",
  "privacy violations",
  "bulk data extraction",
  "access to another person",
]) assert.match(security, new RegExp(prohibited, "i"));
assert.match(security, /not immunity, legal advice, or a promise/i);
assert.match(security, /validReplyTo\(process\.env\.CLIENT_SERVICES_REPLY_TO\)/);

assert.match(contact, /validReplyTo\(process\.env\.CLIENT_SERVICES_REPLY_TO\)/);
assert.doesNotMatch(contact, /process\.env\.(?:RESEND_API_KEY|DATABASE_URL|AUTH_ENCRYPTION_KEY)/);
assert.match(legacySecurity, /permanentRedirect\("\/security"\)/);
assert.match(userMenu, /href="\/account\/security"/);
assert.ok(proxy.includes('"\/account"'));
assert.ok(!proxy.includes('"\/security",'));
assert.match(rootLayout, /<ThreatNodeNetwork \/>/);
assert.match(shell, /min-h-screen bg-transparent/);
assert.doesNotMatch(shell, /min-h-screen bg-\[#050808\]/);

console.log("Public policy route verifier passed.");
