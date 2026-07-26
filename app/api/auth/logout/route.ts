import { NextResponse } from "next/server";
import { clearSession, deleteCurrentSession } from "@/lib/auth";

export async function POST() {
  await deleteCurrentSession();
  return clearSession(NextResponse.json({ success: true, message: "Logged out successfully" }));
}
