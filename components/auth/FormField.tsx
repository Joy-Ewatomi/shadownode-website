'use client'

import { forwardRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label?: string
  icon?: ReactNode
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, icon, error, required, className, children }, ref) => (
    <div ref={ref} className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-mono text-muted-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>}
        {children}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
)

FormField.displayName = 'FormField'
