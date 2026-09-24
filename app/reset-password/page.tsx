"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  evaluatePassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
  readNewPasswordFormValues,
} from "@/lib/password-policy"

function ResetPasswordForm() {
  const token = useSearchParams().get("token") || ""
  const [passwordForChecklist, setPasswordForChecklist] = useState("")
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)
  const passwordPolicy = useMemo(() => evaluatePassword(passwordForChecklist), [passwordForChecklist])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const { password, confirmPassword } = readNewPasswordFormValues(formData)
    setPasswordForChecklist(password)
    setMessage("")
    setIsError(false)

    if (!token) {
      setIsError(true)
      setMessage("Reset link is missing or invalid. Please request a new password reset link.")
      return
    }
    if (password !== confirmPassword) {
      setIsError(true)
      setMessage("Passwords do not match")
      return
    }
    const policy = evaluatePassword(password)
    if (!policy.valid) {
      setIsError(true)
      setMessage(policy.message || "Password does not meet the security requirements.")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      })
      const data = await response.json()
      if (!response.ok) {
        setIsError(true)
        setMessage(data.error || "Password reset could not be completed.")
        return
      }
      window.location.assign("/login?passwordReset=1")
    } catch {
      setIsError(true)
      setMessage("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent px-4 py-8 text-white">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded border border-white/10 bg-[#08110c] p-6" noValidate>
        <div>
          <h1 className="text-2xl font-semibold">Set New Password</h1>
          <p className="mt-2 text-sm text-white/55">Choose a new password for your ShadowNode account.</p>
        </div>

        <label htmlFor="new-password" className="block text-sm font-medium">
          New password
          <Input
            id="new-password"
            type="password"
            name="newPassword"
            autoComplete="new-password"
            onInput={(event) => setPasswordForChecklist(event.currentTarget.value)}
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            className="mt-2"
          />
        </label>

        <label htmlFor="confirm-new-password" className="block text-sm font-medium">
          Confirm new password
          <Input
            id="confirm-new-password"
            type="password"
            name="confirmNewPassword"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            className="mt-2"
          />
        </label>

        <div aria-live="polite" aria-label="Password requirements" className="rounded border border-white/10 bg-black/15 p-3">
          <p className="text-xs font-semibold uppercase text-white/60">Password requirements</p>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {PASSWORD_REQUIREMENTS.map((requirement) => {
              const satisfied = passwordPolicy.checks[requirement.id]
              const Icon = satisfied ? Check : Circle
              return <li key={requirement.id} className={satisfied ? "flex items-center gap-2 text-[#7dffb0]" : "flex items-center gap-2 text-white/50"}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{requirement.label}</li>
            })}
          </ul>
        </div>

        <Button type="submit" className="w-full" disabled={loading || !token}>
          {loading ? "Updating..." : "Update password"}
        </Button>

        {!token && !message ? <p role="alert" className="rounded border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 px-3 py-2 text-sm text-[#ffd1d1]">Reset link is missing or invalid. Please request a new password reset link.</p> : null}
        {message ? <p role={isError ? "alert" : "status"} aria-live="polite" className={`rounded border px-3 py-2 text-sm ${isError ? "border-[#ff6b6b]/30 bg-[#ff6b6b]/10 text-[#ffd1d1]" : "border-[#20dc73]/35 bg-[#20dc73]/10 text-[#c7ffe6]"}`}>{message}</p> : null}
      </form>
    </main>
  )
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-transparent text-white">Loading...</main>}><ResetPasswordForm /></Suspense>
}
