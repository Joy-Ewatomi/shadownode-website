'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedIconProps {
  children: ReactNode
  className?: string
  effect?: 'rotate' | 'glow' | 'bounce'
}

/**
 * AnimatedIcon Component
 * 
 * Adds hover animations to icons
 * Features:
 * - Rotate: Subtle 10-degree rotation
 * - Glow: Slight opacity pulse
 * - Bounce: Gentle vertical bounce
 */
export function AnimatedIcon({
  children,
  className = '',
  effect = 'rotate',
}: AnimatedIconProps) {
  const effectVariants = {
    rotate: {
      initial: { rotate: 0 },
      hover: { rotate: 10, transition: { duration: 0.3 } },
    },
    glow: {
      initial: { opacity: 1 },
      hover: {
        opacity: [1, 0.7, 1],
        transition: { duration: 0.6, repeat: Infinity },
      },
    },
    bounce: {
      initial: { y: 0 },
      hover: {
        y: [-3, 0, -3, 0],
        transition: { duration: 0.4 },
      },
    },
  }

  const selected = effectVariants[effect]

  return (
    <motion.div
      initial={selected.initial}
      whileHover={selected.hover}
      className={className}
    >
      {children}
    </motion.div>
  )
}
