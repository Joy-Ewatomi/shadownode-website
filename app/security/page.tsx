"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Session = {
  id: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  last_activity: string;
};

export default function SecurityPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/sessions", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(() => setMessage("Could not load active sessions."));
  }, []);

  async function logoutAll() {
    await fetch("/api/auth/logout-all", { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-transparent px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#7bf69f]">Security Center</p>
            <h1 className="mt-3 text-3xl font-semibold">Account Protection</h1>
          </div>
          <Button onClick={logoutAll}>Logout all devices</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {["Change Password", "Enable 2FA", "Disable 2FA", "Login History", "Devices", "Recovery Codes", "Delete Account Request"].map((item) => (
            <section key={item} className="rounded border border-white/10 bg-[#08110c] p-5">
              <h2 className="font-semibold">{item}</h2>
              <p className="mt-2 text-sm text-white/55">Managed through secured account controls.</p>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded border border-white/10 bg-[#08110c] p-5">
          <h2 className="text-xl font-semibold">Active Sessions</h2>
          <div className="mt-4 space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="rounded border border-white/10 p-4 text-sm text-white/70">
                <p className="font-mono text-white">{session.ip || "Unknown IP"}</p>
                <p className="mt-1 break-words">{session.user_agent || "Unknown device"}</p>
                <p className="mt-2">Last activity: {new Date(session.last_activity).toLocaleString()}</p>
              </div>
            ))}
            {!sessions.length ? <p className="text-sm text-white/50">No active sessions found.</p> : null}
          </div>
        </section>
        {message ? <p className="mt-4 text-sm text-[#c7ffe6]">{message}</p> : null}
      </div>
    </main>
  );
}
