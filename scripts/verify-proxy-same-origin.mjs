import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const security = readFileSync("lib/security-center.ts", "utf8");
const settings = readFileSync("app/dashboard/settings/page.tsx", "utf8");
const profile = readFileSync("app/api/account/profile/route.ts", "utf8");
const avatar = readFileSync("app/api/account/profile/avatar/route.ts", "utf8");

assert.match(security, /x-forwarded-host/);
assert.match(security, /x-forwarded-proto/);
assert.match(security, /headers\.get\("host"\)/);
assert.match(security, /getTrustedApplicationOrigin/);
assert.match(security, /fetchSite !== "cross-site"/);
assert.match(security, /allowedOrigins\.has\(suppliedOrigin\)/);
assert.doesNotMatch(security, /return true/);

assert.match(profile, /isSameOriginMutation/);
assert.match(avatar, /isSameOriginMutation/);
assert.doesNotMatch(settings, /CommunicationPreferences/);

console.log("Proxy-aware same-origin verifier passed.");
