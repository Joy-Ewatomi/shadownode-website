'use client'

import { motion } from 'framer-motion'

/**
 * AnimatedGradient Component
 * 
 * Animated background gradient overlay for hero section
 * Features:
 * - Navy → Purple → Dark Blue → Navy color cycle (15s loop)
 * - 70% opacity dark overlay
 * - Smooth gradient shifts (organic feel, not mechanical)
 * - Parallax-ready positioning
 */
export function AnimatedGradient() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Main animated gradient overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              90deg,
              rgba(15, 23, 42, 0.7),
              rgba(59, 130, 246, 0.4),
              rgba(99, 102, 241, 0.4),
              rgba(15, 23, 42, 0.7)
            )
          `,
          backgroundSize: '200% 200%',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Secondary gradient layer for depth */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              180deg,
              rgba(99, 102, 241, 0.2) 0%,
              rgba(15, 23, 42, 0.5) 50%,
              rgba(59, 130, 246, 0.2) 100%
            )
          `,
        }}
        animate={{
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}
