import { NextRequest, NextResponse } from "next/server";
import { auditLog, hashToken } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing verification token" }, { status: 400 });
  const { rows } = await query<{ id: string; user_id: string; expires_at: string }>(
    "SELECT id, user_id, expires_at FROM email_verifications WHERE token_hash = $1 AND used_at IS NULL LIMIT 1",
    [hashToken(token)],
  );
  const data = rows[0];
  if (!data || new Date(data.expires_at) < new Date()) return NextResponse.json({ error: "This verification link is invalid or expired" }, { status: 400 });
  await query("UPDATE app_users SET email_verified_at = NOW(), status = 'active', updated_at = NOW() WHERE id = $1", [data.user_id]);
  await query("UPDATE email_verifications SET used_at = NOW() WHERE id = $1", [data.id]);
  await auditLog(data.user_id, "email_verified", request);
  return NextResponse.redirect(new URL("/login?verified=1", request.url));
}
