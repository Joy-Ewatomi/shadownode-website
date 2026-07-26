'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Globe, Smartphone, Clock, MapPin, LogOut, AlertTriangle } from 'lucide-react'

interface Session {
  id: string
  deviceName: string
  browser: string
  os: string
  ipAddress: string
  country: string
  loginTime: string
  lastActivity: string
  isCurrent: boolean
}

const mockSessions: Session[] = [
  {
    id: '1',
    deviceName: 'Desktop - Chrome',
    browser: 'Chrome 126.0',
    os: 'Windows 11',
    ipAddress: '192.168.1.1',
    country: 'United States',
    loginTime: '2 hours ago',
    lastActivity: '1 minute ago',
    isCurrent: true,
  },
  {
    id: '2',
    deviceName: 'iPhone 15 Pro',
    browser: 'Safari',
    os: 'iOS 17.5',
    ipAddress: '203.0.113.45',
    country: 'United States',
    loginTime: 'Yesterday',
    lastActivity: '4 hours ago',
    isCurrent: false,
  },
  {
    id: '3',
    deviceName: 'MacBook Pro',
    browser: 'Safari',
    os: 'macOS 14.5',
    ipAddress: '198.51.100.23',
    country: 'Canada',
    loginTime: '3 days ago',
    lastActivity: '2 days ago',
    isCurrent: false,
  },
]

export default function SecurityPage() {
  const [sessions, setSessions] = useState(mockSessions)
  const [loading, setLoading] = useState(false)

  const handleLogoutSession = async (sessionId: string) => {
    setLoading(true)
    try {
      // API call to logout session
      await new Promise(resolve => setTimeout(resolve, 500))
      setSessions(sessions.filter(s => s.id !== sessionId))
    } finally {
      setLoading(false)
    }
  }

  const handleLogoutAllDevices = async () => {
    setLoading(true)
    try {
      // API call to logout all devices except current
      await new Promise(resolve => setTimeout(resolve, 500))
      setSessions(sessions.filter(s => s.isCurrent))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Security</h1>
        <p className="text-muted-foreground mt-1">Manage your account security and active sessions</p>
      </div>

      {/* Active Sessions */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Devices currently signed in to your account
              </CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Logout all devices
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Logout from all devices?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You&apos;ll be signed out from all devices except this one. You&apos;ll need to sign in again on other devices.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogAction onClick={handleLogoutAllDevices} disabled={loading}>
                  {loading ? 'Logging out...' : 'Logout all devices'}
                </AlertDialogAction>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-start justify-between p-4 border border-border/30 rounded-lg bg-muted/20">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  {session.deviceName.includes('Desktop') ? (
                    <Globe className="w-5 h-5 text-primary" />
                  ) : session.deviceName.includes('iPhone') ? (
                    <Smartphone className="w-5 h-5 text-primary" />
                  ) : (
                    <Smartphone className="w-5 h-5 text-primary" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{session.deviceName}</h3>
                    {session.isCurrent && (
                      <Badge variant="secondary" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{session.browser} • {session.os}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {session.country}
                    </span>
                    <span>{session.ipAddress}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Signed in {session.loginTime}
                    </span>
                    <span>Last active {session.lastActivity}</span>
                  </div>
                </div>
              </div>

              {!session.isCurrent && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-4">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Logout from this device?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You&apos;ll need to sign in again on this device to access your account.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => handleLogoutSession(session.id)} disabled={loading}>
                      {loading ? 'Logging out...' : 'Logout'}
                    </AlertDialogAction>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card className="border-border/50 bg-card/50 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <AlertTriangle className="w-5 h-5" />
            Security Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <input type="checkbox" className="mt-1 accent-primary" defaultChecked />
            <div>
              <p className="text-sm font-semibold text-foreground">Enable two-factor authentication</p>
              <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <input type="checkbox" className="mt-1 accent-primary" defaultChecked />
            <div>
              <p className="text-sm font-semibold text-foreground">Use a strong password</p>
              <p className="text-xs text-muted-foreground">Use at least 12 characters with mixed case, numbers, and symbols</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <input type="checkbox" className="mt-1 accent-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Review suspicious activity</p>
              <p className="text-xs text-muted-foreground">Check your activity log for any unauthorized access</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
