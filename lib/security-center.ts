import type { NextRequest } from "next/server"
import crypto from "crypto"

export function isSameOriginMutation(request: NextRequest) {
  const requestOrigin = request.nextUrl.origin
  const origin = request.headers.get("origin")
  if (origin) {
    try {
      return new URL(origin).origin === requestOrigin
    } catch {
      return false
    }
  }
  return request.headers.get("sec-fetch-site") === "same-origin"
}

export function approximateIp(value: string | null) {
  if (!value) return "Unavailable"
  const ip = value.trim()
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split(".")
    return `${parts[0]}.${parts[1]}.${parts[2]}.x`
  }
  if (ip.includes(":")) {
    return `${ip.split(":").filter(Boolean).slice(0, 4).join(":")}::`
  }
  return "Unavailable"
}

export function approximateDevice(
  userAgent: string | null,
  stored?: {
    browser?: string | null
    operatingSystem?: string | null
    device?: string | null
  },
) {
  const ua = userAgent || ""
  const browser = stored?.browser ||
    (/Edg\//.test(ua) ? "Microsoft Edge" :
      /Firefox\//.test(ua) ? "Firefox" :
        /Chrome\//.test(ua) ? "Chrome" :
          /Safari\//.test(ua) ? "Safari" : "Unknown browser")
  const operatingSystem = stored?.operatingSystem ||
    (/Windows/.test(ua) ? "Windows" :
      /Android/.test(ua) ? "Android" :
        /iPhone|iPad/.test(ua) ? "iOS/iPadOS" :
          /Mac OS X/.test(ua) ? "macOS" :
            /Linux/.test(ua) ? "Linux" : "Unknown operating system")
  const device = stored?.device ||
    (/Mobile|Android|iPhone/.test(ua) ? "Mobile device" :
      /iPad|Tablet/.test(ua) ? "Tablet" : "Desktop or laptop")
  return { browser, operatingSystem, device }
}

export function clampHistoryPage(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 10_000) : 1
}


export async function performLogoutAll(
  authenticatedUserId: string,
  audit: (userId: string) => Promise<void>,
  revoke: (userId: string) => Promise<void>,
) {
  await audit(authenticatedUserId)
  await revoke(authenticatedUserId)
  return { currentSessionRevoked: true }
}

export function canConfirmTwoFactorSetup(
  alreadyEnabled: boolean,
  codeValid: boolean,
) {
  return !alreadyEnabled && codeValid
}


const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const bytes = crypto.randomBytes(8)
    const value = Array.from(bytes, (byte) => RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length]).join("")
    return `${value.slice(0, 4)}-${value.slice(4)}`
  })
}

export function normalizeRecoveryCode(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
}

export function hashRecoveryCode(value: string) {
  return crypto.createHash("sha256").update(normalizeRecoveryCode(value)).digest("hex")
}

export function serializeRecoveryCodeHashes(codes: string[]) {
  return JSON.stringify(codes.map(hashRecoveryCode))
}

export function consumeRecoveryCode(stored: string | null, candidate: string) {
  if (!stored || !candidate) return { valid: false, remaining: stored }
  try {
    const hashes: unknown = JSON.parse(stored)
    if (!Array.isArray(hashes) || !hashes.every((value) => typeof value === "string")) return { valid: false, remaining: stored }
    const candidateHash = hashRecoveryCode(candidate)
    const index = hashes.findIndex((value) => {
      const left = Buffer.from(value)
      const right = Buffer.from(candidateHash)
      return left.length === right.length && crypto.timingSafeEqual(left, right)
    })
    if (index < 0) return { valid: false, remaining: stored }
    return { valid: true, remaining: JSON.stringify(hashes.filter((_, itemIndex) => itemIndex !== index)) }
  } catch {
    return { valid: false, remaining: stored }
  }
}

export function deletionCoolingOffDate(now = new Date(), days = 30) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}
