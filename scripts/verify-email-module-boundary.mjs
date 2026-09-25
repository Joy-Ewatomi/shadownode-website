import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import ts from "typescript"

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), "utf8")
const mailboxSource = read("lib/email-address.ts")
const emailSource = read("lib/email.ts")
const channelsSource = read("lib/communication-channels.ts")

function evaluateTypeScript(source, requireModule = () => {
  throw new Error("The pure mailbox module must not import dependencies")
}) {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const module = { exports: {} }
  const wrapper = vm.runInNewContext(
    `(function (exports, require, module) { ${output}\n})`,
    { process },
  )
  wrapper(module.exports, requireModule, module)
  return module.exports
}

const mailbox = evaluateTypeScript(mailboxSource)

assert.equal(mailbox.validMailbox("sender@example.com"), "sender@example.com")
assert.equal(
  mailbox.validMailbox("ShadowNode Operations <sender@example.com>"),
  "ShadowNode Operations <sender@example.com>",
)
for (const invalid of [
  "not-an-address",
  "Display <missing-domain@>",
  "Display <sender@example.com",
  "sender@example.com\r\nBcc: hidden@example.com",
]) {
  assert.equal(mailbox.validMailbox(invalid), null)
}
assert.equal(
  mailbox.validReplyTo("Client Services <services@example.com>"),
  "services@example.com",
)

const previousOperational = process.env.CLIENT_SERVICES_EMAIL_FROM
const previousSecurity = process.env.EMAIL_FROM
try {
  process.env.CLIENT_SERVICES_EMAIL_FROM = "Operations <ops@example.com>"
  process.env.EMAIL_FROM = "Security <security@example.com>"
  assert.equal(mailbox.operationalEmailFrom(), "Operations <ops@example.com>")

  delete process.env.CLIENT_SERVICES_EMAIL_FROM
  assert.equal(mailbox.operationalEmailFrom(), "Security <security@example.com>")

  process.env.CLIENT_SERVICES_EMAIL_FROM = "invalid"
  assert.equal(mailbox.operationalEmailFrom(), "Security <security@example.com>")
} finally {
  if (previousOperational === undefined) delete process.env.CLIENT_SERVICES_EMAIL_FROM
  else process.env.CLIENT_SERVICES_EMAIL_FROM = previousOperational
  if (previousSecurity === undefined) delete process.env.EMAIL_FROM
  else process.env.EMAIL_FROM = previousSecurity
}

const evaluatedImports = []
evaluateTypeScript(emailSource, (specifier) => {
  evaluatedImports.push(specifier)
  if (specifier === "@/lib/email-address") return mailbox
  if (specifier === "@/lib/app-origin") {
    return { createPasswordResetActionUrl: () => null }
  }
  if (specifier === "@/lib/email-template") {
    return {
      createEmailActionUrl: () => null,
      renderShadowNodeEmail: () => ({ html: "", text: "" }),
    }
  }
  throw new Error(`Unexpected email module dependency: ${specifier}`)
})

assert.deepEqual(evaluatedImports.sort(), [
  "@/lib/app-origin",
  "@/lib/email-address",
  "@/lib/email-template",
])
assert.doesNotMatch(emailSource, /communication-channels|notification-delivery|whatsapp|phone-number/)
assert.doesNotMatch(mailboxSource, /^\s*import\s/m)
assert.match(channelsSource, /from "@\/lib\/email-address"/)
assert.match(channelsSource, /from "libphonenumber-js\/min"/)
assert.doesNotMatch(channelsSource, /from "@\/lib\/(email|services\/notification-delivery-service)"/)
assert.match(emailSource, /options\.from \|\| process\.env\.EMAIL_FROM/)
assert.doesNotMatch(mailboxSource + emailSource, /console\./)

console.log("Email module boundary verification passed.")
