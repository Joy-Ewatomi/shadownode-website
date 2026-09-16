import { NextRequest, NextResponse } from "next/server"

import {
  auditLog,
  getCurrentUser,
  hashPassword,
  isAdminRole,
} from "@/lib/auth"
import { query } from "@/lib/db"
import {
  isLegacyStaffRole,
  isSuperAdministratorRole,
  normalizePermanentRole,
} from "@/lib/role-access"

const CREATABLE_EMPLOYEE_ROLES = [
  "staff",
  "administrator",
] as const

const UPDATABLE_EMPLOYEE_ROLES = [
  "staff",
  "administrator",
] as const

const UPDATABLE_STATUSES = [
  "active",
  "inactive",
  "disabled",
  "suspended",
] as const

type CreatableEmployeeRole =
  (typeof CREATABLE_EMPLOYEE_ROLES)[number]

type UpdatableEmployeeRole =
  (typeof UPDATABLE_EMPLOYEE_ROLES)[number]

type UpdatableStatus =
  (typeof UPDATABLE_STATUSES)[number]

type TargetAccount = {
  id: string
  username: string
  email: string
  role: string
  status: string | null
}

function isCreatableEmployeeRole(
  value: unknown,
): value is CreatableEmployeeRole {
  return (
    typeof value === "string" &&
    CREATABLE_EMPLOYEE_ROLES.includes(
      value as CreatableEmployeeRole,
    )
  )
}

function isUpdatableEmployeeRole(
  value: unknown,
): value is UpdatableEmployeeRole {
  return (
    typeof value === "string" &&
    UPDATABLE_EMPLOYEE_ROLES.includes(
      value as UpdatableEmployeeRole,
    )
  )
}

function isUpdatableStatus(
  value: unknown,
): value is UpdatableStatus {
  return (
    typeof value === "string" &&
    UPDATABLE_STATUSES.includes(
      value as UpdatableStatus,
    )
  )
}

function isProtectedRole(
  role: string | null | undefined,
) {
  const normalized = normalizePermanentRole(role)
  return (
    normalized === "client" ||
    normalized === "super_administrator" ||
    isLegacyStaffRole(role)
  )
}

async function requireAdminUser() {
  const user = await getCurrentUser()

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      ),
    }
  }

  if (!isAdminRole(user.role)) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      ),
    }
  }

  return {
    user,
    response: null,
  }
}

async function logSecurityAttempt(
  actorId: string | null | undefined,
  action: string,
  request: NextRequest,
  metadata: Record<string, unknown>,
) {
  await auditLog(
    actorId ?? null,
    action,
    request,
    metadata,
  ).catch((error) => {
    console.error("ADMIN USER AUDIT LOG ERROR", error)
  })
}

async function getTargetAccount(
  userId: string,
) {
  const result = await query<TargetAccount>(
    `
      SELECT
        id,
        username,
        email,
        role,
        status
      FROM app_users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  )

  return result.rows[0] ?? null
}

function forbidden(
  message: string,
) {
  return NextResponse.json(
    { error: message },
    { status: 403 },
  )
}

export async function GET(
  req: NextRequest,
) {
  try {
    const auth = await requireAdminUser()

    if (auth.response) {
      return auth.response
    }

    const result = await query(
      `
        SELECT
          u.id,
          u.username,
          u.email,
          u.status,
          u.role,
          u.created_at,
          r.display_name
        FROM app_users u
        LEFT JOIN roles r
          ON r.name = u.role
        WHERE u.role IN (
          'staff',
          'administrator',
          'super_administrator',
          'super-administrator',
          'investigator',
          'analyst'
        )
        ORDER BY u.created_at DESC
      `,
    )

    await auditLog(
      auth.user?.id ?? null,
      "employee_accounts_viewed",
      req,
      { count: result.rows.length },
    ).catch(() => undefined)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("GET USERS ERROR:", error)

    return NextResponse.json(
      { error: "Failed loading users" },
      { status: 500 },
    )
  }
}

export async function POST(
  req: NextRequest,
) {
  try {
    const auth = await requireAdminUser()

    if (auth.response) {
      return auth.response
    }

    const actorIsSuperAdmin =
      isSuperAdministratorRole(auth.user?.role)

    const body = await req.json()
    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : ""
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : ""
    const password = body.password
    const requestedRoleRaw =
      typeof body.role === "string" && body.role.trim()
        ? body.role.trim()
        : "staff"

    if (!isCreatableEmployeeRole(requestedRoleRaw)) {
      await logSecurityAttempt(
        auth.user?.id,
        "employee_create_invalid_role_attempt",
        req,
        {
          requested_role: requestedRoleRaw,
        },
      )

      return NextResponse.json(
        { error: "Invalid employee role" },
        { status: 400 },
      )
    }

    const requestedRole = requestedRoleRaw

    if (
      requestedRole === "administrator" &&
      !actorIsSuperAdmin
    ) {
      await logSecurityAttempt(
        auth.user?.id,
        "employee_create_privilege_denied",
        req,
        {
          requested_role: requestedRole,
        },
      )

      return forbidden(
        "Only a Super Administrator can create administrator accounts",
      )
    }

    if (!username || !email || typeof password !== "string") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      )
    }

    const existing = await query(
      `
        SELECT id
        FROM app_users
        WHERE email = $1
           OR username = $2
      `,
      [email, username],
    )

    if (existing.rows.length) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 },
      )
    }

    const passwordHash = await hashPassword(password)

    await query("BEGIN")

    try {
      const userResult = await query<{
        id: string
        username: string
        email: string
        role: string
        status: string
      }>(
        `
          INSERT INTO app_users (
            username,
            email,
            password_hash,
            status,
            role
          )
          VALUES (
            $1,
            $2,
            $3,
            'active',
            $4
          )
          RETURNING
            id,
            username,
            email,
            role,
            status
        `,
        [
          username,
          email,
          passwordHash,
          requestedRole,
        ],
      )

      const user = userResult.rows[0]

      const roleResult = await query<{ id: string }>(
        `
          SELECT id
          FROM roles
          WHERE name = $1
          LIMIT 1
        `,
        [requestedRole],
      )

      if (roleResult.rows.length) {
        await query(
          `
            INSERT INTO user_roles (
              user_id,
              role_id
            )
            VALUES (
              $1,
              $2
            )
            ON CONFLICT DO NOTHING
          `,
          [
            user.id,
            roleResult.rows[0].id,
          ],
        )
      }

      await query(
        `
          INSERT INTO user_profiles (
            id,
            user_id,
            full_name,
            is_anonymous
          )
          VALUES (
            $1,
            $1,
            $2,
            false
          )
          ON CONFLICT (user_id) DO NOTHING
        `,
        [user.id, username],
      )

      await auditLog(
        auth.user?.id ?? null,
        "employee_account_created",
        req,
        {
          target_user_id: user.id,
          new_role: requestedRole,
          new_status: "active",
        },
      )

      await query("COMMIT")

      return NextResponse.json(
        {
          message: "User created successfully",
          user,
        },
        { status: 201 },
      )
    } catch (error) {
      await query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("CREATE USER ERROR:", error)

    return NextResponse.json(
      { error: "Failed creating user" },
      { status: 500 },
    )
  }
}

export async function PATCH(
  req: NextRequest,
) {
  try {
    const auth = await requireAdminUser()

    if (auth.response) {
      return auth.response
    }

    const actorIsSuperAdmin =
      isSuperAdministratorRole(auth.user?.role)

    const body = await req.json()
    const userId =
      typeof body.user_id === "string"
        ? body.user_id.trim()
        : ""
    const hasRoleUpdate =
      Object.prototype.hasOwnProperty.call(body, "role")
    const hasStatusUpdate =
      Object.prototype.hasOwnProperty.call(body, "status")

    if (!userId) {
      return NextResponse.json(
        { error: "User id required" },
        { status: 400 },
      )
    }

    if (userId === auth.user?.id) {
      await logSecurityAttempt(
        auth.user?.id,
        "employee_self_role_status_change_attempt",
        req,
        { target_user_id: userId },
      )

      return forbidden(
        "You cannot change your own role or employment status through this endpoint",
      )
    }

    const target = await getTargetAccount(userId)

    if (!target) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      )
    }

    if (isProtectedRole(target.role)) {
      await logSecurityAttempt(
        auth.user?.id,
        "employee_protected_account_change_attempt",
        req,
        {
          target_user_id: target.id,
          previous_role: target.role,
          requested_role: body.role ?? null,
          requested_status: body.status ?? null,
        },
      )

      return forbidden(
        "This account is protected from ordinary employee role changes",
      )
    }

    if (
      normalizePermanentRole(target.role) === "administrator" &&
      !actorIsSuperAdmin
    ) {
      await logSecurityAttempt(
        auth.user?.id,
        "employee_admin_account_change_denied",
        req,
        {
          target_user_id: target.id,
          previous_role: target.role,
        },
      )

      return forbidden(
        "Only a Super Administrator can modify administrator accounts",
      )
    }

    const nextRole = hasRoleUpdate
      ? typeof body.role === "string"
        ? body.role.trim()
        : ""
      : null

    if (
      nextRole !== null &&
      !isUpdatableEmployeeRole(nextRole)
    ) {
      await logSecurityAttempt(
        auth.user?.id,
        "employee_role_change_invalid_role_attempt",
        req,
        {
          target_user_id: target.id,
          previous_role: target.role,
          requested_role: nextRole,
        },
      )

      return NextResponse.json(
        { error: "Invalid employee role" },
        { status: 400 },
      )
    }

    if (
      nextRole === "administrator" &&
      !actorIsSuperAdmin
    ) {
      await logSecurityAttempt(
        auth.user?.id,
        "employee_promotion_denied",
        req,
        {
          target_user_id: target.id,
          previous_role: target.role,
          requested_role: nextRole,
        },
      )

      return forbidden(
        "Only a Super Administrator can promote users to administrator roles",
      )
    }

    const nextStatus = hasStatusUpdate
      ? typeof body.status === "string"
        ? body.status.trim()
        : ""
      : null

    if (
      nextStatus !== null &&
      !isUpdatableStatus(nextStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid employee status" },
        { status: 400 },
      )
    }

    if (
      !hasRoleUpdate &&
      !hasStatusUpdate
    ) {
      return NextResponse.json(
        { error: "No editable fields supplied" },
        { status: 400 },
      )
    }

    await query("BEGIN")

    try {
      if (
        nextRole &&
        nextRole !== target.role
      ) {
        await query(
          `
            UPDATE app_users
            SET role = $1,
                updated_at = NOW()
            WHERE id = $2
          `,
          [nextRole, userId],
        )

        const roleData = await query<{ id: string }>(
          `
            SELECT id
            FROM roles
            WHERE name = $1
          `,
          [nextRole],
        )

        if (roleData.rows.length) {
          await query(
            `
              DELETE FROM user_roles
              WHERE user_id = $1
            `,
            [userId],
          )

          await query(
            `
              INSERT INTO user_roles (
                user_id,
                role_id
              )
              VALUES (
                $1,
                $2
              )
            `,
            [
              userId,
              roleData.rows[0].id,
            ],
          )
        }

        await auditLog(
          auth.user?.id ?? null,
          "employee_role_changed",
          req,
          {
            target_user_id: userId,
            previous_role: target.role,
            new_role: nextRole,
          },
        )
      }

      if (
        nextStatus &&
        nextStatus !== target.status
      ) {
        await query(
          `
            UPDATE app_users
            SET status = $1,
                updated_at = NOW()
            WHERE id = $2
          `,
          [nextStatus, userId],
        )

        await auditLog(
          auth.user?.id ?? null,
          "employee_status_changed",
          req,
          {
            target_user_id: userId,
            previous_status: target.status,
            new_status: nextStatus,
            target_role: target.role,
          },
        )
      }

      await query("COMMIT")

      return NextResponse.json({
        message: "User updated",
      })
    } catch (error) {
      await query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("UPDATE USER ERROR:", error)

    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 },
    )
  }
}
