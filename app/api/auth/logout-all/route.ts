import { NextResponse } from "next/server";
import { auditLog, clearSession, deleteAllSessions, getCurrentUser } from "@/lib/auth";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deleteAllSessions(user.id);
  await auditLog(user.id, "logout_all");
  return clearSession(NextResponse.json({ success: true }));
}
