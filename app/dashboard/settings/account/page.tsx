'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Mail, Lock, Bell, CheckCircle2 } from 'lucide-react'

export default function AccountSettingsPage() {
  const [firstName, setFirstName] = useState('John')
  const [lastName, setLastName] = useState('Doe')
  const [email, setEmail] = useState('john@example.com')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSaveProfile = async () => {
    setLoading(true)
    setSaved(false)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    setLoading(true)
    setSaved(false)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account information and preferences</p>
      </div>

      {/* Success notification */}
      {saved && (
        <Alert className="border-primary/30 bg-primary/10">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary ml-2">
            Changes saved successfully
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Section */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">First Name</label>
              <Input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Last Name</label>
              <Input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
            />
          </div>

          <Button onClick={handleSaveProfile} disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Current Password</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must be at least 12 characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button onClick={handleChangePassword} disabled={loading} className="w-full">
            {loading ? 'Updating...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">2FA</Badge>
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add extra security to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div>
              <p className="font-semibold text-foreground">Two-factor authentication is enabled</p>
              <p className="text-sm text-muted-foreground">Your account is protected with authenticator app</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Backup codes</p>
            <p className="text-xs text-muted-foreground">
              You have 3 unused backup codes. Store them in a secure location.
            </p>
            <Button variant="outline" size="sm" className="w-full">
              View & regenerate backup codes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Control how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              { id: 'login', label: 'Login alerts', description: 'Notify me when someone logs in' },
              { id: 'security', label: 'Security updates', description: 'Important security notifications' },
              { id: 'email', label: 'Email changes', description: 'Notify when email address is changed' },
              { id: 'password', label: 'Password changes', description: 'Confirm password change requests' },
            ].map((pref) => (
              <label key={pref.id} className="flex items-start gap-3 p-3 border border-border/30 rounded-lg cursor-pointer hover:bg-muted/30 transition">
                <input type="checkbox" defaultChecked className="mt-1 accent-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.description}</p>
                </div>
              </label>
            ))}
          </div>

          <Button className="w-full">Save Preferences</Button>
        </CardContent>
      </Card>
    </div>
  )
}
