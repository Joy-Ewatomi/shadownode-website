import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await query(
    `SELECT id, ip, user_agent, created_at, expires_at, last_activity
     FROM sessions
     WHERE user_id = $1
     ORDER BY last_activity DESC`,
    [user.id],
  );
  return NextResponse.json({ sessions: rows });
}
