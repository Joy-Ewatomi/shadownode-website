import type { NextRequest } from "next/server"
import { getTrustedApplicationOrigin } from "@/lib/app-origin"

function headerOrigin(protocol: string, host: string | null) {
  if (!host) return null
  const firstHost = host.split(",")[0]?.trim()
  if (!firstHost || /[\s\\/]/.test(firstHost)) return null
  try {
    return new URL(`${protocol}://${firstHost}`).origin
  } catch {
    return null
  }
}

export function isSameOriginMutation(request: NextRequest) {
  const origin = request.headers.get("origin")
  if (origin) {
    try {
      const suppliedOrigin = new URL(origin).origin
      const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
      const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
        ? forwardedProtocol
        : request.nextUrl.protocol.replace(":", "")
      const allowedOrigins = new Set([
        request.nextUrl.origin,
        headerOrigin(protocol, request.headers.get("x-forwarded-host")),
        headerOrigin(protocol, request.headers.get("host")),
        getTrustedApplicationOrigin(),
      ].filter((value): value is string => Boolean(value)))
      const fetchSite = request.headers.get("sec-fetch-site")
      return fetchSite !== "cross-site" && allowedOrigins.has(suppliedOrigin)
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


export function deletionCoolingOffDate(now = new Date(), days = 30) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}
