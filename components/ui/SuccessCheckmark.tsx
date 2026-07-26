'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface SuccessCheckmarkProps {
  size?: 'sm' | 'md' | 'lg'
}

export function SuccessCheckmark({ size = 'md' }: SuccessCheckmarkProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  const containerSize = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className={`${containerSize[size]} bg-primary/10 rounded-full flex items-center justify-center`}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <Check className={`${sizeClasses[size]} text-primary`} strokeWidth={3} />
      </motion.div>
    </motion.div>
  )
}
