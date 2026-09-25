import crypto from "crypto"

import type { DatabasePoolClient } from "@/lib/db"

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const CODE_CHARACTERS = 16
export const RECOVERY_CODE_COUNT = 10

function randomAlphabetCharacter() {
  const rejectionLimit = 256 - (256 % ALPHABET.length)
  while (true) {
    const value = crypto.randomBytes(1)[0]
    if (value < rejectionLimit) return ALPHABET[value % ALPHABET.length]
  }
}

export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT) {
  return Array.from({ length: count }, () => {
    const raw = Array.from({ length: CODE_CHARACTERS }, randomAlphabetCharacter).join("")
    return raw.match(/.{1,4}/g)?.join("-") || raw
  })
}

export function normalizeRecoveryCode(value: string) {
  if (!/^[A-Za-z0-9 -]+$/.test(value)) return null
  const normalized = value.replace(/[ -]/g, "").toUpperCase()
  return normalized.length === CODE_CHARACTERS && /^[A-Z2-9]+$/.test(normalized)
    ? normalized
    : null
}

export function hashRecoveryCode(value: string) {
  const normalized = normalizeRecoveryCode(value)
  if (!normalized) return null
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex")
}

export async function replaceRecoveryCodes(
  client: DatabasePoolClient,
  userId: string,
  codes: string[],
) {
  const generationId = crypto.randomUUID()
  const hashes = codes.map(hashRecoveryCode)
  if (hashes.some((hash) => !hash)) throw new Error("Recovery code generation failed")

  await client.query("DELETE FROM two_factor_recovery_codes WHERE user_id = $1", [userId])
  for (const hash of hashes) {
    await client.query(
      `INSERT INTO two_factor_recovery_codes (user_id, generation_id, code_hash)
       VALUES ($1, $2, $3)`,
      [userId, generationId, hash],
    )
  }
}

export async function consumeRecoveryCode(
  client: DatabasePoolClient,
  userId: string,
  candidate: string,
) {
  const hash = hashRecoveryCode(candidate)
  if (!hash) return false

  const result = await client.query<{ id: string }>(
    `SELECT id
     FROM two_factor_recovery_codes
     WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL
     LIMIT 1
     FOR UPDATE`,
    [userId, hash],
  )
  const row = result.rows[0]
  if (!row) return false

  const consumed = await client.query<{ id: string }>(
    `UPDATE two_factor_recovery_codes
     SET used_at = now()
     WHERE id = $1 AND used_at IS NULL
     RETURNING id`,
    [row.id],
  )
  return Boolean(consumed.rows[0])
}
