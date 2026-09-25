import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { generateRecoveryCodes, hashRecoveryCode, normalizeRecoveryCode, RECOVERY_CODE_COUNT } from "../lib/recovery-codes.ts"

const codes = generateRecoveryCodes()
assert.equal(codes.length, RECOVERY_CODE_COUNT)
assert.equal(new Set(codes).size, RECOVERY_CODE_COUNT)
for (const code of codes) {
  assert.match(code, /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/)
  assert.equal(normalizeRecoveryCode(code), code.replaceAll("-", ""))
  assert.match(hashRecoveryCode(code), /^[a-f0-9]{64}$/)
  assert.notEqual(hashRecoveryCode(code), code)
}
assert.equal(normalizeRecoveryCode("bad/value"), null)

const login = readFileSync("app/api/auth/2fa/verify/route.ts", "utf8")
const regenerate = readFileSync("app/api/auth/2fa/recovery-codes/route.ts", "utf8")
const migration = readFileSync("scripts/secure-recovery-codes-and-welcome-email.sql", "utf8")
assert.match(login, /FOR UPDATE/)
assert.match(login, /consumeRecoveryCode\(client, row\.id, code\)/)
assert.match(login, /assessPendingTwoFactorChallenge/)
assert.ok(login.indexOf("consumeRecoveryCode") < login.indexOf("createSession(result.user"))
assert.match(regenerate, /replaceRecoveryCodes\(client, user\.id, codes\)/)
assert.match(regenerate, /password_login_enabled/)
assert.doesNotMatch(regenerate, /recovery_codes_encrypted\s*=/)
assert.match(migration, /UNIQUE \(user_id, code_hash\)/)
assert.match(migration, /WHERE used_at IS NULL/)
console.log("Recovery-code lifecycle checks passed.")
