import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  ensureAccess,
  requireTrainingOperatorForEngagement,
} from "@/lib/services/training-operations-service"
import {
  issueTrainingCertificate,
} from "@/lib/services/training-completion-service"

function isSuperAdminRole(role: string | null | undefined) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>
  },
) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    )
  }

  try {
    const { id } = await context.params

    /*
     * First confirm that the engagement exists and that
     * the authenticated user has access to it.
     */
    const access = await ensureAccess(
      id,
      user,
      false,
    )

    /*
     * Super Administrator has system-level training
     * authority.
     *
     * Everyone else must actually be the approved
     * trainer for this specific engagement.
     */
    if (!isSuperAdminRole(user.role)) {
      await requireTrainingOperatorForEngagement(
        id,
        user,
        access.profileId,
      )
    }

    /*
     * The completion service remains authoritative for
     * certificate issuance.
     *
     * Do not generate certificates directly here.
     */
    const result =
      await issueTrainingCertificate(id)

    return NextResponse.json({
      success: true,
      certificate_id:
        result.certificate_id,
      certificate_number:
        result.certificate_number,
    })
  } catch (err: unknown) {
    console.error(
      "TRAINING CERTIFICATE ERROR:",
      err,
    )

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to issue training certificate",
      },
      { status: 400 },
    )
  }
}