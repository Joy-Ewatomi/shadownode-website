'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedSkeletonProps {
  className?: string
  count?: number
}

export function AnimatedSkeleton({ className, count = 1 }: AnimatedSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array(count)
        .fill(null)
        .map((_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className={cn('h-4 bg-muted rounded', className)}
          />
        ))}
    </div>
  )
}
