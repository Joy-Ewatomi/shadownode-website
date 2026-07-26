"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json();
    setMessage(data.message || data.error || "Request processed.");
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded border border-white/10 bg-[#08110c] p-6">
        <h1 className="text-2xl font-semibold">Reset Password</h1>
        <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
        <Button disabled={loading} className="w-full">{loading ? "Sending..." : "Send reset link"}</Button>
        {message ? <p className="text-sm text-[#c7ffe6]">{message}</p> : null}
      </form>
    </main>
  );
}
