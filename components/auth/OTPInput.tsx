'use client'

import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface OTPInputProps {
  length?: number
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
}

export function OTPInput({ length = 6, onChange, onComplete, disabled }: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(length).fill(null))

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    const num = value.replace(/[^0-9]/g, '')
    if (num.length > 1) return

    const newOtp = [...otp]
    newOtp[index] = num
    setOtp(newOtp)

    const otpValue = newOtp.join('')
    onChange?.(otpValue)

    if (num && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (newOtp.every(val => val !== '')) {
      onComplete?.(otpValue)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '')
    const newOtp = [...otp]

    for (let i = 0; i < Math.min(pastedData.length, length); i++) {
      newOtp[i] = pastedData[i]
    }

    setOtp(newOtp)
    onChange?.(newOtp.join(''))

    if (newOtp.every(val => val !== '')) {
      onComplete?.(newOtp.join(''))
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array(length)
        .fill(null)
        .map((_, index) => (
          <input
            key={index}
            ref={el => {
              inputRefs.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otp[index]}
            onChange={e => handleChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={cn(
              'w-12 h-12 border rounded-lg text-center text-lg font-mono font-semibold',
              'bg-input border-border/50 text-foreground',
              'transition-all duration-200',
              'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
              disabled && 'opacity-50 cursor-not-allowed',
              otp[index] && 'border-primary/50'
            )}
          />
        ))}
    </div>
  )
}
