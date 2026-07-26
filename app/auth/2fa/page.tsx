'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OTPInput } from '@/components/auth/OTPInput'
import { FormField } from '@/components/auth/FormField'
import { Input } from '@/components/ui/input'
import { Shield, ArrowLeft, CheckCircle2, AlertCircle, Copy } from 'lucide-react'
import Link from 'next/link'

type Tab = 'authenticator' | 'email' | 'backup'

export default function TwoFactorPage() {
  const [tab, setTab] = useState<Tab>('authenticator')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otp, setOtp] = useState('')
  const [verified, setVerified] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([
    'XXXX-XXXX-XXXX',
    'XXXX-XXXX-XXXX',
    'XXXX-XXXX-XXXX',
    'XXXX-XXXX-XXXX',
  ])
  const [copied, setCopied] = useState(false)

  const handleVerifyOTP = async (value: string) => {
    if (value.length === 6) {
      setLoading(true)
      setError('')

      try {
        const response = await fetch('/api/auth/2fa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otp: value, type: tab })
        })

        if (!response.ok) {
          setError('Invalid verification code')
          setLoading(false)
          return
        }

        setVerified(true)
        setLoading(false)
      } catch {
        setError('Network error. Please try again.')
        setLoading(false)
      }
    }
  }

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-transparent text-foreground flex items-center justify-center">
        <div className="fixed inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(90deg, #00ff41 1px, transparent 1px), linear-gradient(#00ff41 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="w-full max-w-md mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
              <div className="p-8 space-y-6 text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                </motion.div>

                <div>
                  <h1 className="text-2xl font-bold text-foreground">Two-factor enabled</h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your account is now protected with two-factor authentication.
                  </p>
                </div>

                <Button className="w-full" asChild>
                  <Link href="/dashboard">
                    Go to dashboard
                  </Link>
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground flex items-center justify-center">
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(90deg, #00ff41 1px, transparent 1px), linear-gradient(#00ff41 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="w-full max-w-md mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
            <div className="p-8 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Shield className="w-6 h-6 text-primary" />
                    Two-factor authentication
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Choose your verification method
                  </p>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Tabs */}
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                <TabsList className="grid w-full grid-cols-3 bg-muted/30 border border-border/30">
                  <TabsTrigger value="authenticator">Authenticator</TabsTrigger>
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="backup">Backup</TabsTrigger>
                </TabsList>

                {/* Authenticator Tab */}
                <TabsContent value="authenticator" className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code from your authenticator app:
                    </p>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <OTPInput
                        length={6}
                        onChange={setOtp}
                        onComplete={handleVerifyOTP}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <Button className="w-full" disabled={loading || otp.length < 6}>
                    {loading ? 'Verifying...' : 'Verify code'}
                  </Button>
                </TabsContent>

                {/* Email Tab */}
                <TabsContent value="email" className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code sent to your email:
                    </p>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <OTPInput
                        length={6}
                        onChange={setOtp}
                        onComplete={handleVerifyOTP}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <Button className="w-full" disabled={loading || otp.length < 6}>
                    {loading ? 'Verifying...' : 'Verify code'}
                  </Button>
                </TabsContent>

                {/* Backup Codes Tab */}
                <TabsContent value="backup" className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Use one of your backup codes if you don&apos;t have access to your primary method:
                    </p>
                    <FormField label="Backup code" required>
                      <Input
                        type="text"
                        placeholder="XXXX-XXXX-XXXX"
                        value={otp}
                        onChange={e => setOtp(e.target.value.toUpperCase())}
                        disabled={loading}
                      />
                    </FormField>
                  </div>
                  <Button className="w-full" disabled={loading || otp.length < 12}>
                    {loading ? 'Verifying...' : 'Verify backup code'}
                  </Button>
                </TabsContent>
              </Tabs>

              {/* Saved Backup Codes */}
              <div className="border-t border-border/30 pt-4 space-y-3">
                <p className="text-xs text-muted-foreground font-semibold uppercase">Save your backup codes</p>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <div key={i} className="text-xs font-mono text-center p-2 bg-muted/30 rounded border border-border/30">
                      {code}
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleCopyBackupCodes}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy codes'}
                </Button>
              </div>

              {/* Back button */}
              <Button
                variant="ghost"
                className="w-full"
                asChild
              >
                <Link href="/login">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Link>
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
