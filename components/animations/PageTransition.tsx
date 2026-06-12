'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

/**
 * PageTransition Component
 * 
 * Wraps page content for smooth page transitions
 * Features:
 * - 300ms fade-in on page load
 * - Professional entrance animation
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
