'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.push('/login?tab=signup')
  }, [router])

  return null
}
