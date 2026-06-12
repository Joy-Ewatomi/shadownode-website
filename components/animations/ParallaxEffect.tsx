'use client'

import { useScroll, useTransform, motion } from 'framer-motion'
import { useRef } from 'react'

/**
 * ParallaxEffect Component
 * 
 * Creates a subtle parallax scrolling effect
 * - Background moves at 0.5x scroll speed
 * - Creates depth illusion
 * - Professional, not distracting
 */
export function ParallaxEffect() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()

  // Transform scroll position to parallax offset (0.5x speed)
  const y = useTransform(scrollY, (value) => value * 0.5)

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className="fixed inset-0 -z-10"
    >
      {/* Subtle animated pattern overlay - very faint grid */}
      <div className="absolute inset-0 opacity-5">
        <div
          style={{
            backgroundImage:
              'linear-gradient(90deg, #94e945 1px, transparent 1px), linear-gradient(#00ff41 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>
    </motion.div>
  )
}
