"use client"

import { useEffect, useRef, useState } from "react"
import {
  Clock3,
  KeyRound,
  Laptop,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  evaluatePassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
  readChangePasswordFormValues,
} from "@/lib/password-policy"

type View = "history" | "devices" | "twoFactor" | "password" | "disableTwoFactor" | "recovery" | "deletion" | null

type Session = {
  id: string
  createdAt: string
  expiresAt: string
  lastActivity: string
  current: boolean
  approximateIp: string
  browser: string
  operatingSystem: string
  device: string
}

type HistoryItem = {
  id: string
  timestamp: string
  authenticationMethod: string
  outcome: string
  approximateIp: string
  location: string | null
  browser: string
  operatingSystem: string
  device: string
}

type TwoFactorSetup = {
  secret: string
  qrCodeDataUrl: string
}

export default function SecurityPage() {
  const [view, setView] = useState<View>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPages, setHistoryPages] = useState(1)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null)
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [confirmLogout, setConfirmLogout] = useState(false)
  const panelRef = useRef<HTMLElement | null>(null)
  const [form, setForm] = useState({ password: "", authCode: "", confirmation: "", reason: "" })
  const [newPasswordForChecklist, setNewPasswordForChecklist] = useState("")
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [deletionRequest, setDeletionRequest] = useState<{ status: string; requested_at: string; cooling_off_ends_at: string } | null>(null)

  useEffect(() => {
    if (view) window.setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
  }, [view])

  function selectView(next: View) {
    setView(next)
    setError("")
    setMessage("")
    if (next !== "recovery") setRecoveryCodes([])
  }

  function updateForm(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setTwoFactorEnabled(Boolean(data.user?.twoFactorEnabled)))
      .catch(() => setError("Could not load account security status."))
  }, [])

  async function loadSessions() {
    selectView("devices")
    setLoading("devices")
    setError("")
    try {
      const response = await fetch("/api/auth/sessions", {
        credentials: "include",
        cache: "no-store",
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not load sessions.")
      setSessions(data.sessions || [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load sessions.")
    } finally {
      setLoading(null)
    }
  }

  async function loadHistory(page = 1) {
    selectView("history")
    setLoading("history")
    setError("")
    try {
      const response = await fetch(`/api/auth/login-history?page=${page}`, {
        credentials: "include",
        cache: "no-store",
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not load login history.")
      setHistory(data.history || [])
      setHistoryPage(data.pagination?.page || 1)
      setHistoryPages(data.pagination?.totalPages || 1)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load login history.")
    } finally {
      setLoading(null)
    }
  }

  async function beginTwoFactorSetup() {
    selectView("twoFactor")
    setLoading("twoFactor")
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not begin 2FA setup.")
      setSetup(data)
      setCode("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not begin 2FA setup.")
    } finally {
      setLoading(null)
    }
  }

  async function confirmTwoFactor() {
    setLoading("confirmTwoFactor")
    setError("")
    try {
      const response = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not enable 2FA.")
      setTwoFactorEnabled(true)
      setSetup(null)
      setCode("")
      setMessage("Two-factor authentication is now enabled.")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not enable 2FA.")
    } finally {
      setLoading(null)
    }
  }

  async function logoutAll() {
    setLoading("logout")
    setError("")
    try {
      const response = await fetch("/api/auth/logout-all", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not log out devices.")
      window.location.href = "/login?loggedOut=all"
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not log out devices.")
      setConfirmLogout(false)
      setLoading(null)
    }
  }

  async function submitSecurityAction(endpoint: string, body: object, loadingKey: string) {
    setLoading(loadingKey)
    setError("")
    setMessage("")
    try {
      const response = await fetch(endpoint, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "The security action could not be completed.")
      setMessage(data.message || "Security settings updated.")
      return data
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The security action could not be completed.")
      return null
    } finally { setLoading(null) }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const values = readChangePasswordFormValues(new FormData(formElement))
    setNewPasswordForChecklist(values.newPassword)
    setError("")
    setMessage("")
    if (values.newPassword !== values.confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    const policy = evaluatePassword(values.newPassword)
    if (!policy.valid) {
      setError(policy.message || "Password does not meet the security requirements.")
      return
    }
    const data = await submitSecurityAction("/api/auth/change-password", values, "password")
    if (data) {
      formElement.reset()
      setNewPasswordForChecklist("")
    }
  }

  async function disableTwoFactor() {
    const data = await submitSecurityAction("/api/auth/2fa/disable", { password: form.password, code: form.authCode }, "disableTwoFactor")
    if (data) { setTwoFactorEnabled(false); setForm((current) => ({ ...current, password: "", authCode: "" })) }
  }

  async function regenerateRecoveryCodes() {
    const data = await submitSecurityAction("/api/auth/2fa/recovery-codes", { password: form.password, code: form.authCode }, "recovery")
    if (data?.codes) { setRecoveryCodes(data.codes); setForm((current) => ({ ...current, password: "", authCode: "" })) }
  }

  async function loadDeletion() {
    selectView("deletion")
    setLoading("deletion")
    try {
      const response = await fetch("/api/auth/account-deletion", { credentials: "include", cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not load deletion request status.")
      setDeletionRequest(data.request)
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load deletion request status.") }
    finally { setLoading(null) }
  }

  async function requestDeletion() {
    const data = await submitSecurityAction("/api/auth/account-deletion", { password: form.password, confirmation: form.confirmation, reason: form.reason }, "deletion")
    if (data?.request) { setDeletionRequest(data.request); setForm((current) => ({ ...current, password: "", confirmation: "", reason: "" })) }
  }

  async function cancelDeletion() {
    setLoading("deletion")
    setError("")
    try {
      const response = await fetch("/api/auth/account-deletion", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" } })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not cancel deletion request.")
      setDeletionRequest(null); setMessage(data.message)
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not cancel deletion request.") }
    finally { setLoading(null) }
  }

  const cards = [
    { id: "history" as View, title: "Login History", description: "Review successful and failed password sign-in attempts.", icon: Clock3, action: () => loadHistory(1), disabled: false },
    { id: "devices" as View, title: "Devices", description: "Review active sessions. Device descriptions are approximate.", icon: Laptop, action: loadSessions, disabled: false },
    { id: "twoFactor" as View, title: twoFactorEnabled ? "2FA Enabled" : "Enable 2FA", description: twoFactorEnabled ? "Your account requires an authenticator code at sign-in." : "Protect sign-in with a time-based authenticator code.", icon: ShieldCheck, action: beginTwoFactorSetup, disabled: twoFactorEnabled !== false },
    { id: "password" as View, title: "Change Password", description: "Verify your current password and choose a stronger replacement.", icon: LockKeyhole, action: () => selectView("password"), disabled: false },
    { id: "disableTwoFactor" as View, title: "Disable 2FA", description: twoFactorEnabled ? "Requires your password and an authenticator or recovery code." : "Two-factor authentication is not enabled.", icon: ShieldCheck, action: () => selectView("disableTwoFactor"), disabled: twoFactorEnabled !== true },
    { id: "recovery" as View, title: "Recovery Codes", description: twoFactorEnabled ? "Regenerate one-time recovery codes after reauthentication." : "Enable two-factor authentication first.", icon: KeyRound, action: () => selectView("recovery"), disabled: twoFactorEnabled !== true },
    { id: "deletion" as View, title: "Delete Account Request", description: "Submit a reviewable request with a 30-day cooling-off period.", icon: Trash2, action: loadDeletion, disabled: false },
  ]

  return (
    <main className="min-h-screen px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase text-[#7bf69f]">Security Center</p>
            <h1 className="mt-2 text-3xl font-semibold">Account protection</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Review sign-in activity, active sessions, and two-factor authentication.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmLogout(true)}
            disabled={loading === "logout"}
          >
            {loading === "logout" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
            Logout all devices
          </Button>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ id, title, description, icon: Icon, action, disabled }) => (
            <button
              key={title}
              type="button"
              onClick={action}
              disabled={disabled}
              aria-pressed={view === id}
              className={`min-h-36 rounded border bg-[#08110c] p-5 text-left transition hover:border-[#20dc73]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73] disabled:cursor-not-allowed disabled:opacity-60 ${view === id ? "border-[#20dc73] bg-[#0d1b13] ring-1 ring-[#20dc73]/35" : "border-white/10"}`}
            >
              <Icon className="h-5 w-5 text-[#7bf69f]" />
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-white/55">{description}</p>
            </button>
          ))}
        </div>

        {error ? <p role="alert" className="mt-6 rounded border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
        {message ? <p role="status" className="mt-6 rounded border border-[#20dc73]/30 bg-[#20dc73]/10 p-3 text-sm text-[#c7ffe6]">{message}</p> : null}

        {view === "devices" ? (
          <section ref={panelRef} className="mt-8 scroll-mt-6 border-t border-white/10 pt-6" aria-labelledby="devices-heading">
            <h2 id="devices-heading" className="text-xl font-semibold">Active sessions</h2>
            <p className="mt-2 text-sm text-white/55">
              Device and browser descriptions are approximate and do not uniquely identify a physical device. Individual revocation is not available in Phase 1.
            </p>
            <div className="mt-4 space-y-3">
              {loading === "devices" ? <Loader2 className="h-5 w-5 animate-spin" /> : sessions.map((session) => (
                <article key={session.id} className="rounded border border-white/10 bg-[#08110c] p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{session.browser} on {session.operatingSystem}</strong>
                    {session.current ? <span className="text-[#7bf69f]">Current session</span> : null}
                  </div>
                  <p className="mt-2 text-white/60">{session.device} | IP {session.approximateIp}</p>
                  <p className="mt-1 text-white/50">Created {new Date(session.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-white/50">Last active {new Date(session.lastActivity).toLocaleString()}</p>
                </article>
              ))}
              {!loading && !sessions.length ? <p className="text-sm text-white/50">No active sessions found.</p> : null}
            </div>
          </section>
        ) : null}

        {view === "history" ? (
          <section ref={panelRef} className="mt-8 scroll-mt-6 border-t border-white/10 pt-6" aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-xl font-semibold">Login history</h2>
            <p className="mt-2 text-sm text-white/55">Browser, device, location, and IP descriptions are approximate.</p>
            <div className="mt-4 space-y-3">
              {loading === "history" ? <Loader2 className="h-5 w-5 animate-spin" /> : history.map((item) => (
                <article key={item.id} className="rounded border border-white/10 bg-[#08110c] p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{item.authenticationMethod}</strong>
                    <span className={item.outcome === "Successful" ? "text-[#7bf69f]" : "text-red-200"}>{item.outcome}</span>
                  </div>
                  <p className="mt-2 text-white/60">{item.browser} on {item.operatingSystem} | {item.device}</p>
                  <p className="mt-1 text-white/50">IP {item.approximateIp}{item.location ? ` | ${item.location}` : ""}</p>
                  <p className="mt-1 text-white/50">{new Date(item.timestamp).toLocaleString()}</p>
                </article>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button type="button" variant="outline" disabled={historyPage <= 1 || loading === "history"} onClick={() => loadHistory(historyPage - 1)}>Previous</Button>
              <span className="text-sm text-white/60">Page {historyPage} of {historyPages}</span>
              <Button type="button" variant="outline" disabled={historyPage >= historyPages || loading === "history"} onClick={() => loadHistory(historyPage + 1)}>Next</Button>
            </div>
          </section>
        ) : null}

        {view === "twoFactor" && !twoFactorEnabled ? (
          <section ref={panelRef} className="mt-8 scroll-mt-6 border-t border-white/10 pt-6" aria-labelledby="two-factor-heading">
            <h2 id="two-factor-heading" className="text-xl font-semibold">Enable two-factor authentication</h2>
            {loading === "twoFactor" ? <Loader2 className="mt-4 h-5 w-5 animate-spin" /> : setup ? (
              <div className="mt-4 max-w-xl">
                <p className="text-sm text-white/65">Scan this QR code with your authenticator app, or enter the manual secret. The secret is shown only during this setup view.</p>
                <img src={setup.qrCodeDataUrl} alt="Authenticator setup QR code" className="mt-4 h-60 w-60 bg-white p-2" />
                <p className="mt-4 text-sm text-white/60">Manual setup secret</p>
                <code className="mt-2 block break-all rounded bg-black/30 p-3 text-sm text-[#c7ffe6]">{setup.secret}</code>
                <label htmlFor="totp-code" className="mt-5 block text-sm font-medium">Six-digit authentication code</label>
                <Input id="totp-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="mt-2 max-w-xs" />
                <Button type="button" onClick={confirmTwoFactor} disabled={code.length !== 6 || loading === "confirmTwoFactor"} className="mt-4">
                  {loading === "confirmTwoFactor" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirm and enable
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}

        {view === "password" ? (
          <section ref={panelRef} className="mt-8 scroll-mt-6 border-t border-white/10 pt-6" aria-labelledby="password-heading">
            <h2 id="password-heading" className="text-xl font-semibold">Change password</h2>
            <p className="mt-2 text-sm text-white/55">OAuth-only accounts should use password reset first to establish a password they can verify.</p>
            <form onSubmit={changePassword} className="mt-4 grid max-w-xl gap-4" noValidate>
              <label className="text-sm">Current password<Input type="password" name="currentPassword" autoComplete="current-password" required className="mt-2" /></label>
              <label className="text-sm">New password<Input type="password" name="newPassword" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} onInput={(event) => setNewPasswordForChecklist(event.currentTarget.value)} className="mt-2" /></label>
              <label className="text-sm">Confirm new password<Input type="password" name="confirmPassword" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} className="mt-2" /></label>
              <div aria-live="polite" aria-label="Password requirements" className="rounded border border-white/10 bg-black/15 p-3">
                <p className="text-xs font-semibold uppercase text-white/60">Password requirements</p>
                <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  {PASSWORD_REQUIREMENTS.map((requirement) => {
                    const satisfied = evaluatePassword(newPasswordForChecklist).checks[requirement.id]
                    return <li key={requirement.id} className={satisfied ? "text-[#7dffb0]" : "text-white/50"}>{satisfied ? "✓" : "○"} {requirement.label}</li>
                  })}
                </ul>
              </div>
              <Button type="submit" disabled={loading === "password"}>{loading === "password" ? <Loader2 className="animate-spin" /> : null}Change password</Button>
            </form>
          </section>
        ) : null}

        {view === "disableTwoFactor" ? (
          <section ref={panelRef} className="mt-8 scroll-mt-6 border-t border-white/10 pt-6" aria-labelledby="disable-heading">
            <h2 id="disable-heading" className="text-xl font-semibold">Disable two-factor authentication</h2>
            <p className="mt-2 text-sm text-white/55">Confirm with your password and a current authenticator code or unused recovery code.</p>
            <div className="mt-4 grid max-w-xl gap-4">
              <label className="text-sm">Current password<Input type="password" autoComplete="current-password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} className="mt-2" /></label>
              <label className="text-sm">Authentication or recovery code<Input autoComplete="one-time-code" value={form.authCode} onChange={(event) => updateForm("authCode", event.target.value)} className="mt-2" /></label>
              <Button type="button" variant="destructive" onClick={disableTwoFactor} disabled={loading === "disableTwoFactor" || !form.password || !form.authCode}>{loading === "disableTwoFactor" ? <Loader2 className="animate-spin" /> : null}Disable 2FA</Button>
            </div>
          </section>
        ) : null}

        {view === "recovery" ? (
          <section ref={panelRef} className="mt-8 scroll-mt-6 border-t border-white/10 pt-6" aria-labelledby="recovery-heading">
            <h2 id="recovery-heading" className="text-xl font-semibold">Recovery codes</h2>
            {recoveryCodes.length ? <div className="mt-4 max-w-xl rounded border border-[#20dc73]/30 bg-[#20dc73]/10 p-4"><p className="text-sm">Store these codes securely. Each works once and they will not be shown again.</p><div className="mt-3 grid grid-cols-2 gap-2 font-mono">{recoveryCodes.map((item) => <code key={item}>{item}</code>)}</div><Button type="button" variant="outline" className="mt-4" onClick={() => setRecoveryCodes([])}>I have stored these codes</Button></div> : <div className="mt-4 grid max-w-xl gap-4"><label className="text-sm">Current password<Input type="password" autoComplete="current-password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} className="mt-2" /></label><label className="text-sm">Current authenticator code<Input inputMode="numeric" autoComplete="one-time-code" value={form.authCode} onChange={(event) => updateForm("authCode", event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2" /></label><Button type="button" onClick={regenerateRecoveryCodes} disabled={loading === "recovery" || !form.password || form.authCode.length !== 6}>{loading === "recovery" ? <Loader2 className="animate-spin" /> : null}Regenerate recovery codes</Button></div>}
          </section>
        ) : null}

        {view === "deletion" ? (
          <section ref={panelRef} className="mt-8 scroll-mt-6 border-t border-white/10 pt-6" aria-labelledby="deletion-heading">
            <h2 id="deletion-heading" className="text-xl font-semibold">Delete account request</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/55">This submits a review request with a 30-day cooling-off period. It does not immediately destroy investigation, evidence, financial, audit, or legally retained records.</p>
            {deletionRequest?.status === "pending" ? <div className="mt-4 max-w-xl rounded border border-amber-300/30 bg-amber-300/10 p-4 text-sm"><p>Pending review. Cooling-off ends {new Date(deletionRequest.cooling_off_ends_at).toLocaleString()}.</p><Button type="button" variant="outline" className="mt-4" onClick={cancelDeletion} disabled={loading === "deletion"}>Cancel request</Button></div> : <div className="mt-4 grid max-w-xl gap-4"><label className="text-sm">Current password<Input type="password" autoComplete="current-password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} className="mt-2" /></label><label className="text-sm">Reason (optional)<Input value={form.reason} onChange={(event) => updateForm("reason", event.target.value)} className="mt-2" maxLength={1000} /></label><label className="text-sm">Type DELETE to confirm<Input value={form.confirmation} onChange={(event) => updateForm("confirmation", event.target.value)} className="mt-2" /></label><Button type="button" variant="destructive" onClick={requestDeletion} disabled={loading === "deletion" || !form.password || form.confirmation !== "DELETE"}>{loading === "deletion" ? <Loader2 className="animate-spin" /> : null}Submit deletion request</Button></div>}
          </section>
        ) : null}
      </div>

      {confirmLogout ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="logout-title">
          <div className="w-full max-w-md rounded border border-white/15 bg-[#08110c] p-6">
            <h2 id="logout-title" className="text-xl font-semibold">Logout all devices?</h2>
            <p className="mt-3 text-sm text-white/65">Every active session, including this one, will be revoked. You will need to sign in again.</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setConfirmLogout(false)} disabled={loading === "logout"}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={logoutAll} disabled={loading === "logout"}>Revoke all sessions</Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
