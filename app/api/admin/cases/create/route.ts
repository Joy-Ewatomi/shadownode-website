import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser, getIp } from "@/lib/auth"
import { withTransaction } from "@/lib/db"
import { isSuperAdministratorRole } from "@/lib/role-access"
import { isSameOriginMutation } from "@/lib/security-center"

export const dynamic = "force-dynamic"

const NO_STORE = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

const PRIORITIES = new Set(["low", "normal", "high", "critical"])

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : ""
}

function validCompletionDate(value: string) {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "Request could not be verified." },
      { status: 403, headers: NO_STORE },
    )
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: NO_STORE },
    )
  }

  if (!isSuperAdministratorRole(user.role)) {
    return NextResponse.json(
      { error: "This action requires super-administrator access." },
      { status: 403, headers: NO_STORE },
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { error: "Enter valid case details." },
      { status: 400, headers: NO_STORE },
    )
  }

  const title = cleanText(body.title, 160)
  const description = cleanText(body.description, 5000)
  const priority = cleanText(body.priority, 20).toLowerCase() || "normal"
  const estimatedCompletion = cleanText(body.estimated_completion, 10)
  const acknowledged = body.acknowledged === true

  if (title.length < 3) {
    return NextResponse.json(
      { error: "Case title must contain at least 3 characters." },
      { status: 400, headers: NO_STORE },
    )
  }

  if (description.length < 10) {
    return NextResponse.json(
      { error: "Case objective must contain at least 10 characters." },
      { status: 400, headers: NO_STORE },
    )
  }

  if (!PRIORITIES.has(priority)) {
    return NextResponse.json(
      { error: "Select a valid case priority." },
      { status: 400, headers: NO_STORE },
    )
  }

  if (!validCompletionDate(estimatedCompletion)) {
    return NextResponse.json(
      { error: "Enter a valid completion date." },
      { status: 400, headers: NO_STORE },
    )
  }

  if (!acknowledged) {
    return NextResponse.json(
      { error: "Confirm that this is an authorized internal case." },
      { status: 400, headers: NO_STORE },
    )
  }

  try {
    const created = await withTransaction(async (client) => {
      const profileResult = await client.query<{
        id: string
        organization_id: string | null
      }>(
        `
          SELECT id, organization_id
          FROM user_profiles
          WHERE user_id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [user.id],
      )

      const profile = profileResult.rows[0]
      if (!profile) throw new Error("CREATOR_PROFILE_MISSING")

      let organizationId = profile.organization_id
      if (!organizationId) {
        const organization = await client.query<{ id: string }>(
          `SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1`,
        )
        organizationId = organization.rows[0]?.id || null
      }
      if (!organizationId) throw new Error("ORGANIZATION_MISSING")

      const caseNumber = `SOB-CASE-${new Date().getFullYear()}-${randomUUID()
        .slice(0, 8)
        .toUpperCase()}`

      const caseResult = await client.query<{ id: string }>(
        `
          INSERT INTO cases (
            organization_id, case_number, title, description, service_type,
            status, priority, assigned_to, estimated_completion, progress,
            payment_status, started_at, created_at, updated_at
          )
          VALUES (
            $1, $2, $3, $4, 'osint',
            'active', $5, $6, $7::date, 0,
            'waived', NOW(), NOW(), NOW()
          )
          RETURNING id
        `,
        [
          organizationId,
          caseNumber,
          title,
          description,
          priority,
          profile.id,
          estimatedCompletion || null,
        ],
      )

      const caseId = caseResult.rows[0]?.id
      if (!caseId) throw new Error("CASE_CREATION_FAILED")

      await client.query(
        `
          INSERT INTO case_assignments (
            case_id, assigned_to, assigned_by, assignment_role, status,
            assigned_at, accepted_at, deadline, notes
          )
          VALUES ($1, $2, $2, 'lead_investigator', 'approved', NOW(), NOW(), $3::date,
            'Created and self-assigned by the super administrator as an internal case.')
        `,
        [caseId, profile.id, estimatedCompletion || null],
      )

      await client.query(
        `
          INSERT INTO case_updates (
            case_id, updated_by, update_type, title, content
          )
          VALUES (
            $1, $2, 'internal_case_created', 'Internal Case Created',
            'Authorized internal case created without a client request or payment transaction.'
          )
        `,
        [caseId, profile.id],
      )

      await client.query(
        `
          INSERT INTO audit_logs (user_id, action, ip, user_agent, metadata)
          VALUES ($1, 'internal_case_created', $2, $3, $4::jsonb)
        `,
        [
          user.id,
          getIp(request),
          request.headers.get("user-agent"),
          JSON.stringify({
            case_id: caseId,
            case_number: caseNumber,
            service_type: "osint",
            payment_status: "waived",
          }),
        ],
      )

      return { caseId, caseNumber }
    })

    return NextResponse.json(
      {
        success: true,
        case_id: created.caseId,
        case_number: created.caseNumber,
        destination: `/dashboard/cases/${created.caseId}`,
      },
      { status: 201, headers: NO_STORE },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message === "CREATOR_PROFILE_MISSING" || message === "ORGANIZATION_MISSING") {
      return NextResponse.json(
        { error: "The internal case workspace is not configured for this account." },
        { status: 409, headers: NO_STORE },
      )
    }

    console.error("Internal case creation failed", {
      actorUserId: user.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
    return NextResponse.json(
      { error: "The case could not be created. Please try again." },
      { status: 500, headers: NO_STORE },
    )
  }
}
