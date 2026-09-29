import { NextRequest, NextResponse } from "next/server";
import { auditLog, getCurrentUser } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { validateProfileInput } from "@/lib/profile-settings";
import { isSameOriginMutation } from "@/lib/security-center";

const NO_STORE = { "Cache-Control": "private, no-store" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: NO_STORE });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });

  const body = await request.json().catch(() => null);
  const input = validateProfileInput({
    username: body?.username,
    displayName: body?.displayName,
  });
  if (!input.valid) {
    return NextResponse.json({ error: input.error }, { status: 400, headers: NO_STORE });
  }

  try {
    await withTransaction(async (client) => {
      const collision = await client.query<{ id: string }>(
        `SELECT id FROM app_users WHERE LOWER(username) = LOWER($1) AND id <> $2 LIMIT 1`,
        [input.username, user.id],
      );
      if (collision.rows[0]) {
        const error = new Error("USERNAME_UNAVAILABLE");
        error.name = "UsernameUnavailableError";
        throw error;
      }

      await client.query(
        `UPDATE app_users SET username = $1, updated_at = NOW() WHERE id = $2`,
        [input.username, user.id],
      );
      const profile = await client.query(
        `UPDATE user_profiles SET full_name = $1, updated_at = NOW() WHERE user_id = $2`,
        [input.displayName, user.id],
      );
      if (!profile.rowCount) {
        await client.query(
          `INSERT INTO user_profiles (id, user_id, full_name, is_anonymous) VALUES ($1, $1, $2, false)`,
          [user.id, input.displayName],
        );
      }
    });
    await auditLog(user.id, "account_profile_updated", request, { username_changed: input.username !== user.username });
    return NextResponse.json(
      { message: "Profile updated.", profile: { username: input.username, displayName: input.displayName } },
      { headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof Error && (error.name === "UsernameUnavailableError" || (error as Error & { code?: string }).code === "23505")) {
      return NextResponse.json({ error: "That username is unavailable." }, { status: 409, headers: NO_STORE });
    }
    return NextResponse.json({ error: "Profile could not be updated. Please try again." }, { status: 500, headers: NO_STORE });
  }
}
