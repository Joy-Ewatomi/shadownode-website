'use client'

import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordVisibilityToggleProps {
  isVisible: boolean
  onToggle: () => void
}

export function PasswordVisibilityToggle({ isVisible, onToggle }: PasswordVisibilityToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
    >
      {isVisible ? (
        <EyeOff className="w-4 h-4 text-muted-foreground" />
      ) : (
        <Eye className="w-4 h-4 text-muted-foreground" />
      )}
    </Button>
  )
}
