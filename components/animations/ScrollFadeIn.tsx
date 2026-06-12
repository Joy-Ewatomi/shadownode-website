'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { fadeInUpVariants, useInViewVariants } from '@/lib/animations'

interface ScrollFadeInProps {
  children: ReactNode
  className?: string
  delay?: number
  onHover?: boolean
}

/**
 * ScrollFadeIn Component
 * 
 * Triggers fade-in + slide-up animation when element enters viewport
 * Features:
 * - Triggers at 20% viewport visibility
 * - Smooth easing (easeOut)
 * - Optional delay for staggered effects
 * - Lift on hover with shadow (optional)
 */
export function ScrollFadeIn({
  children,
  className = '',
  delay = 0,
  onHover = false,
}: ScrollFadeInProps) {
  const inViewProps = useInViewVariants(fadeInUpVariants)

  return (
    <motion.div
      {...inViewProps}
      whileHover={onHover ? { y: -5, transition: { duration: 0.3 } } : undefined}
      transition={{
        ...inViewProps.transition,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface ScrollFadeInListProps {
  children: ReactNode
  staggerDelay?: number
  className?: string
}

/**
 * ScrollFadeInList Component
 * 
 * Container for staggered fade-in animations
 * - Each child gets incrementally delayed
 * - Creates cascading animation effect
 */
export function ScrollFadeInList({
  children,
  staggerDelay = 0.1,
  className = '',
}: ScrollFadeInListProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
