import { NextRequest, NextResponse } from "next/server"
import {
  auditLog,
  clearSession,
  deleteAllSessions,
  getCurrentUser,
} from "@/lib/auth"
import { isSameOriginMutation, performLogoutAll } from "@/lib/security-center"

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Request could not be verified" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = await performLogoutAll(
    user.id,
    async (userId) => auditLog(userId, "logout_all_devices", request, {
      current_session_revoked: true,
    }),
    deleteAllSessions,
  )

  return clearSession(NextResponse.json({
    success: true,
    ...result,
  }))
}
