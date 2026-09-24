"use client"

import { useEffect, useState } from "react"
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

type View = "history" | "devices" | "twoFactor" | null

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

const deferredControls = [
  {
    title: "Change Password",
    description: "Password changes are planned for a later Security Center phase.",
    icon: LockKeyhole,
  },
  {
    title: "Disable 2FA",
    description: "Secure 2FA removal is not available in this phase.",
    icon: ShieldCheck,
  },
  {
    title: "Recovery Codes",
    description: "Recovery-code management is intentionally deferred.",
    icon: KeyRound,
  },
  {
    title: "Delete Account Request",
    description: "Reviewed account-deletion requests are intentionally deferred.",
    icon: Trash2,
  },
]

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

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setTwoFactorEnabled(Boolean(data.user?.twoFactorEnabled)))
      .catch(() => setError("Could not load account security status."))
  }, [])

  async function loadSessions() {
    setView("devices")
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
    setView("history")
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
    setView("twoFactor")
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

  const cards = [
    {
      title: "Login History",
      description: "Review successful and failed password sign-in attempts.",
      icon: Clock3,
      action: () => loadHistory(1),
      disabled: false,
    },
    {
      title: "Devices",
      description: "Review active sessions. Device descriptions are approximate.",
      icon: Laptop,
      action: loadSessions,
      disabled: false,
    },
    {
      title: twoFactorEnabled ? "2FA Enabled" : "Enable 2FA",
      description: twoFactorEnabled
        ? "Your account requires an authenticator code at sign-in."
        : "Protect sign-in with a time-based authenticator code.",
      icon: ShieldCheck,
      action: beginTwoFactorSetup,
      disabled: twoFactorEnabled !== false,
    },
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
          {cards.map(({ title, description, icon: Icon, action, disabled }) => (
            <button
              key={title}
              type="button"
              onClick={action}
              disabled={disabled}
              className="min-h-36 rounded border border-white/10 bg-[#08110c] p-5 text-left transition hover:border-[#20dc73]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon className="h-5 w-5 text-[#7bf69f]" />
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-white/55">{description}</p>
            </button>
          ))}
          {deferredControls.map(({ title, description, icon: Icon }) => (
            <button
              key={title}
              type="button"
              disabled
              aria-disabled="true"
              className="min-h-36 rounded border border-white/10 bg-[#08110c] p-5 text-left opacity-55"
            >
              <Icon className="h-5 w-5 text-white/55" />
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-white/55">{description}</p>
            </button>
          ))}
        </div>

        {error ? <p role="alert" className="mt-6 rounded border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
        {message ? <p role="status" className="mt-6 rounded border border-[#20dc73]/30 bg-[#20dc73]/10 p-3 text-sm text-[#c7ffe6]">{message}</p> : null}

        {view === "devices" ? (
          <section className="mt-8 border-t border-white/10 pt-6" aria-labelledby="devices-heading">
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
          <section className="mt-8 border-t border-white/10 pt-6" aria-labelledby="history-heading">
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
          <section className="mt-8 border-t border-white/10 pt-6" aria-labelledby="two-factor-heading">
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
