"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json();
    setMessage(data.message || data.error || "Request processed.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent px-4 text-white">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded border border-white/10 bg-[#08110c] p-6">
        <h1 className="text-2xl font-semibold">Resend Verification</h1>
        <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
        <Button className="w-full">Send verification link</Button>
        {message ? <p className="text-sm text-[#c7ffe6]">{message}</p> : null}
      </form>
    </main>
  );
}
