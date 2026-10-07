import crypto from "crypto"

export function sha256Buffer(value: Buffer | Uint8Array) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

export function sha256Text(value: string) {
  return sha256Buffer(Buffer.from(value, "utf8"))
}

export function hashesMatch(recorded: string | null | undefined, actual: string | null | undefined) {
  if (!recorded || !actual || !/^[a-f0-9]{64}$/i.test(recorded) || !/^[a-f0-9]{64}$/i.test(actual)) return false
  return crypto.timingSafeEqual(Buffer.from(recorded.toLowerCase(), "hex"), Buffer.from(actual.toLowerCase(), "hex"))
}
