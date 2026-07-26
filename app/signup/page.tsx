"use client"

import { useState } from "react"
import Link from "next/link"

export default function Signup() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function signup() {
    setLoading(true)
    setMessage("")

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password, confirmPassword }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setMessage(data.error || "Could not create account")
      return
    }

    setMessage("Account created successfully")
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-foreground flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(39,255,118,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(33,255,143,0.09),transparent_22%)] opacity-80" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(0,255,65,0.12) 1px, transparent 1px), linear-gradient(rgba(0,255,65,0.12) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-[#21ff7d]/20 bg-[#08110c]/95 p-8 shadow-[0_0_80px_rgba(24,255,100,0.18)] backdrop-blur-xl">
        <div className="mb-6 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-[#7bf69f]/80">ShadowNode</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Create Account</h1>
          <p className="mt-2 text-sm text-foreground/60">Secure access to the enterprise portal.</p>
        </div>

        <div className="space-y-4">
          <label className="block text-sm text-foreground/70">
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#06110c] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#00ff86] focus:ring-2 focus:ring-[#00ff86]/15"
            />
          </label>

          <label className="block text-sm text-foreground/70">
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#06110c] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#00ff86] focus:ring-2 focus:ring-[#00ff86]/15"
            />
          </label>

          <label className="block text-sm text-foreground/70">
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••••••"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#06110c] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#00ff86] focus:ring-2 focus:ring-[#00ff86]/15"
            />
          </label>

          <label className="block text-sm text-foreground/70">
            Confirm Password
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              placeholder="••••••••••••"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#06110c] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#00ff86] focus:ring-2 focus:ring-[#00ff86]/15"
            />
          </label>
        </div>

        <button
          onClick={signup}
          disabled={loading}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-[#00e65a] via-[#24ff84] to-[#1bd58f] px-6 py-3 text-sm font-semibold tracking-[0.04em] text-black shadow-[0_0_28px_rgba(0,255,135,0.2)] transition duration-300 hover:scale-[1.005] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'CREATING ACCOUNT...' : 'Create Account'}
        </button>

        {message ? (
          <p className="mt-4 rounded-2xl border border-[#00ff88]/15 bg-white/5 px-4 py-3 text-sm text-[#c7ffe6]">
            {message}
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm text-foreground/60">
          Already a member?{' '}
          <Link href="/login" className="text-[#7bf69f] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
