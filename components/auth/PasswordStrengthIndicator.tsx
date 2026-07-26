'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

interface PasswordStrengthIndicatorProps {
  password: string
  showRequirements?: boolean
}

export function PasswordStrengthIndicator({ password, showRequirements = true }: PasswordStrengthIndicatorProps) {
  const requirements = useMemo(() => {
    return {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    }
  }, [password])

  const strength = useMemo(() => {
    const met = Object.values(requirements).filter(Boolean).length
    if (met <= 1) return { level: 'weak', color: 'bg-destructive' }
    if (met <= 2) return { level: 'fair', color: 'bg-yellow-500' }
    if (met <= 3) return { level: 'good', color: 'bg-blue-500' }
    return { level: 'strong', color: 'bg-primary' }
  }, [requirements])

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all',
              i < Math.ceil((Object.values(requirements).filter(Boolean).length / 5) * 4)
                ? strength.color
                : 'bg-muted'
            )}
          />
        ))}
      </div>

      {showRequirements && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground capitalize">{strength.level} password</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(requirements).map(([req, met]) => (
              <div key={req} className="flex items-center gap-1">
                {met ? (
                  <Check className="w-3 h-3 text-primary" />
                ) : (
                  <X className="w-3 h-3 text-muted-foreground" />
                )}
                <span className={met ? 'text-foreground' : 'text-muted-foreground'}>
                  {req === 'length' && '12+ characters'}
                  {req === 'uppercase' && 'Uppercase'}
                  {req === 'lowercase' && 'Lowercase'}
                  {req === 'number' && 'Number'}
                  {req === 'special' && 'Special char'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
