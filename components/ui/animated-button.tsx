'use client'

import { Button } from './button'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import type { VariantProps } from 'class-variance-authority'

interface AnimatedButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof Button> {
  children: ReactNode
  asChild?: boolean
}

/**
 * AnimatedButton Component
 * 
 * Extended Button with smooth scale animation on hover
 * Features:
 * - 1.05x scale on hover (smooth spring animation)
 * - Maintains all button variants and sizes
 * - Professional motion (not jarring)
 */
export const AnimatedButton = motion.create(Button)

export function AnimatedButtonWrapper({
  children,
  className = '',
  variant,
  size,
  ...props
}: AnimatedButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
    >
      <Button
        variant={variant}
        size={size}
        className={className}
        {...props}
      >
        {children}
      </Button>
    </motion.div>
  )
}
