'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormField } from './FormField'
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator'
import { PasswordVisibilityToggle } from './PasswordVisibilityToggle'
import { SecurityIndicators } from './SecurityIndicators'
import { SocialAuthButtons } from './SocialAuthButtons'
import { AlertCircle, Mail, Lock, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LoginData {
  username: string
  password: string
  rememberDevice?: boolean
}

export interface SignupData {
  username: string
  email: string
  password: string
  confirmPassword: string
}

interface EnhancedAuthModalProps {
  onSubmit?: (data: LoginData | SignupData, type: 'login' | 'signup') => void | Promise<void>
  loading?: boolean
  error?: string
  defaultTab?: 'login' | 'signup'
}

export function EnhancedAuthModal({
  onSubmit,
  loading = false,
  error: errorProp,
  defaultTab = 'login',
}: EnhancedAuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>(defaultTab)
  const [error, setError] = useState(errorProp || '')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Login state
  const [loginData, setLoginData] = useState<LoginData>({
    username: '',
    password: '',
    rememberDevice: false,
  })
  const [loginErrors, setLoginErrors] = useState<Partial<LoginData>>({})

  // Signup state
  const [signupData, setSignupData] = useState<SignupData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [signupErrors, setSignupErrors] = useState<Partial<SignupData>>({})

  const validateLogin = (): boolean => {
    const errors: Partial<LoginData> = {}
    if (!loginData.username.trim()) errors.username = 'Username required'
    if (!loginData.password) errors.password = 'Password required'
    setLoginErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateSignup = (): boolean => {
    const errors: Partial<SignupData> = {}
    if (!signupData.username.trim()) errors.username = 'Username required'
    if (!signupData.email.trim()) errors.email = 'Email required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) errors.email = 'Invalid email'
    if (signupData.password.length < 12) errors.password = 'Password must be 12+ characters'
    if (signupData.password !== signupData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    setSignupErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateLogin()) return

    try {
      await onSubmit?.(loginData, 'login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateSignup()) return

    try {
      await onSubmit?.(signupData, 'signup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md"
    >
      <Card className="border border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold font-mono text-primary">ShadowNode</h1>
            <p className="text-sm text-muted-foreground">Enterprise Security Portal</p>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'signup')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/30 border border-border/30">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <FormField label="Username" required error={loginErrors.username}>
                  <Input
                    type="text"
                    placeholder="your-username"
                    value={loginData.username}
                    onChange={e => setLoginData({ ...loginData, username: e.target.value })}
                    className={cn('pl-10', loginErrors.username && 'border-destructive')}
                    icon={<User className="w-4 h-4" />}
                    disabled={loading}
                  />
                </FormField>

                <FormField label="Password" required error={loginErrors.password}>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                      className={cn('pl-10 pr-10', loginErrors.password && 'border-destructive')}
                      disabled={loading}
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <PasswordVisibilityToggle isVisible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                  </div>
                </FormField>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loginData.rememberDevice}
                      onChange={e => setLoginData({ ...loginData, rememberDevice: e.target.checked })}
                      disabled={loading}
                      className="w-4 h-4 rounded cursor-pointer accent-primary"
                    />
                    <span className="text-muted-foreground">Remember device</span>
                  </label>
                  <a href="/auth/forgot-password" className="text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <SocialAuthButtons loading={loading} />
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <FormField label="Username" required error={signupErrors.username}>
                  <Input
                    type="text"
                    placeholder="choose-username"
                    value={signupData.username}
                    onChange={e => setSignupData({ ...signupData, username: e.target.value })}
                    className={cn('pl-10', signupErrors.username && 'border-destructive')}
                    disabled={loading}
                  />
                </FormField>

                <FormField label="Email" required error={signupErrors.email}>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={signupData.email}
                      onChange={e => setSignupData({ ...signupData, email: e.target.value })}
                      className={cn('pl-10', signupErrors.email && 'border-destructive')}
                      disabled={loading}
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </FormField>

                <FormField label="Password" required error={signupErrors.password}>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signupData.password}
                      onChange={e => setSignupData({ ...signupData, password: e.target.value })}
                      className={cn('pl-10 pr-10', signupErrors.password && 'border-destructive')}
                      disabled={loading}
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <PasswordVisibilityToggle isVisible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                  </div>
                  <PasswordStrengthIndicator password={signupData.password} />
                </FormField>

                <FormField label="Confirm Password" required error={signupErrors.confirmPassword}>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signupData.confirmPassword}
                      onChange={e => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                      className={cn('pl-10 pr-10', signupErrors.confirmPassword && 'border-destructive')}
                      disabled={loading}
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <PasswordVisibilityToggle
                      isVisible={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  </div>
                </FormField>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create account'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
                </div>
              </div>

              <SocialAuthButtons loading={loading} />
            </TabsContent>
          </Tabs>

          {/* Security Indicators */}
          <div className="pt-4 border-t border-border/30">
            <SecurityIndicators />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
