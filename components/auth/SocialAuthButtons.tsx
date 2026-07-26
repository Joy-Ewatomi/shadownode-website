'use client'

import { Button } from '@/components/ui/button'
import { Github, Chrome } from 'lucide-react'

interface SocialAuthButtonsProps {
  loading?: boolean
  onGoogleClick?: () => void
  onGithubClick?: () => void
}

export function SocialAuthButtons({ loading, onGoogleClick, onGithubClick }: SocialAuthButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        onClick={onGoogleClick}
        disabled={loading}
        className="gap-2"
      >
        <Chrome className="w-4 h-4" />
        Google
      </Button>
      <Button
        variant="outline"
        onClick={onGithubClick}
        disabled={loading}
        className="gap-2"
      >
        <Github className="w-4 h-4" />
        GitHub
      </Button>
    </div>
  )
}
