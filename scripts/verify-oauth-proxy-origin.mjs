import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { rmSync } from "node:fs"
import { pathToFileURL } from "node:url"

const output = "/tmp/shadownode-oauth-origin-test"
rmSync(output, { recursive: true, force: true })
execFileSync("npm", ["exec", "tsc", "--", "lib/oauth-origin.ts", "--outDir", output, "--module", "commonjs", "--target", "es2022", "--skipLibCheck"], { stdio: "inherit" })
const { oauthRequestUsesCanonicalHost } = await import(pathToFileURL(`${output}/oauth-origin.js`))

const canonicalOrigin = "https://shadownodebureau.com"
assert.equal(oauthRequestUsesCanonicalHost({ canonicalOrigin, forwardedHost: "shadownodebureau.com", host: "shadownodebureau.netlify.app", requestHost: "shadownodebureau.netlify.app" }), true)
assert.equal(oauthRequestUsesCanonicalHost({ canonicalOrigin, forwardedHost: "shadownodebureau.com, proxy.internal", host: "proxy.internal", requestHost: "proxy.internal" }), true)
assert.equal(oauthRequestUsesCanonicalHost({ canonicalOrigin, host: "shadownodebureau.com", requestHost: "shadownodebureau.com" }), true)
assert.equal(oauthRequestUsesCanonicalHost({ canonicalOrigin, host: "shadownodebureau.netlify.app", requestHost: "shadownodebureau.netlify.app" }), false)
assert.equal(oauthRequestUsesCanonicalHost({ canonicalOrigin, host: "deploy-preview-42--shadownodebureau.netlify.app", requestHost: "deploy-preview-42--shadownodebureau.netlify.app" }), false)

console.log("OAuth proxy-origin verification passed.")
