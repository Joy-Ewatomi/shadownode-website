'use client'

import { Badge } from '@/components/ui/badge'
import { Shield, Lock, Zap, Eye } from 'lucide-react'

interface SecurityIndicatorsProps {
  className?: string
}

const indicators = [
  { label: 'TLS 1.3', icon: Lock },
  { label: 'AES-256', icon: Shield },
  { label: 'Zero Trust', icon: Zap },
  { label: 'Secure Session', icon: Eye },
]

export function SecurityIndicators({ className }: SecurityIndicatorsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className || ''}`}>
      {indicators.map(({ label, icon: Icon }) => (
        <Badge key={label} variant="outline" className="gap-1">
          <Icon className="w-3 h-3" />
          {label}
        </Badge>
      ))}
    </div>
  )
}
