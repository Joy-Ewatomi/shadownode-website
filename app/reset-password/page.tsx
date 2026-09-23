"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    if (!token) {
      setIsError(true);
      setMessage("Reset link is missing a token. Please request a new password reset link.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        password,
        confirmPassword,
      }),
    });

    const data = await response.json();
    setIsError(!response.ok);
    setMessage(data.message || data.error || "Request processed.");
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent px-4 text-white">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded border border-white/10 bg-[#08110c] p-6"
      >
        <h1 className="text-2xl font-semibold">Set New Password</h1>

        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="New password"
          required
          minLength={12}
        />

        <Input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm password"
          required
          minLength={12}
        />

        <Button className="w-full" disabled={loading || !token}>
          {loading ? "Updating..." : "Update password"}
        </Button>

        {!token && !message ? (
          <p className="rounded border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 px-3 py-2 text-sm text-[#ffd1d1]">
            Reset link is missing a token. Please request a new password reset link.
          </p>
        ) : null}

        {message ? (
          <p className={`rounded border px-3 py-2 text-sm ${isError ? "border-[#ff6b6b]/30 bg-[#ff6b6b]/10 text-[#ffd1d1]" : "border-[#20dc73]/35 bg-[#20dc73]/10 text-[#c7ffe6]"}`}>
            {message}
          </p>
        ) : null}
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-transparent text-white">
          Loading...
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
