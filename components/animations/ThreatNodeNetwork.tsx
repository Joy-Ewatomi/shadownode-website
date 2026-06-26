'use client'

import { useEffect, useRef } from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  pulseTimer: number
  pulseBoost: number
}

const PARTICLE_COUNT = 60
const MAX_LINK_DISTANCE = 140
const BASE_LINK_ALPHA = 0.08
const PULSE_LINK_ALPHA = 0.18
const PARTICLE_SPEED = 0.035
const BACKGROUND_COLOR = '#050505'
const NODE_COLOR = 'rgba(74, 222, 128, 0.95)'

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * PARTICLE_SPEED,
    vy: (Math.random() - 0.5) * PARTICLE_SPEED,
    size: Math.random() * 1.2 + 0.8,
    pulseTimer: Math.random() * 2500 + 1200,
    pulseBoost: 0,
  }
}

export function ThreatNodeNetwork() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const lastTimeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current

    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      const dpr = window.devicePixelRatio || 1

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => createParticle(width, height))
    }

    const animate = (time: number) => {
      const width = canvas.clientWidth || 1
      const height = canvas.clientHeight || 1
      const delta = Math.min(32, time - lastTimeRef.current || 16)
      lastTimeRef.current = time

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = BACKGROUND_COLOR
      ctx.fillRect(0, 0, width, height)

      const particles = particlesRef.current

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i]

        particle.x += particle.vx * delta
        particle.y += particle.vy * delta
        particle.pulseTimer -= delta

        if (particle.pulseTimer <= 0) {
          particle.pulseTimer = Math.random() * 1800 + 900
          particle.pulseBoost = 1
        } else if (particle.pulseBoost > 0) {
          particle.pulseBoost = Math.max(0, particle.pulseBoost - 0.015 * delta)
        }

        if (particle.x < -10 || particle.x > width + 10) {
          particle.vx *= -1
          particle.x = Math.max(0, Math.min(width, particle.x))
        }

        if (particle.y < -10 || particle.y > height + 10) {
          particle.vy *= -1
          particle.y = Math.max(0, Math.min(height, particle.y))
        }

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = NODE_COLOR
        ctx.shadowBlur = 10
        ctx.shadowColor = 'rgba(74, 222, 128, 0.5)'
        ctx.fill()
        ctx.shadowBlur = 0
      }

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const distance = Math.hypot(dx, dy)

          if (distance < MAX_LINK_DISTANCE) {
            const intensity = 1 - distance / MAX_LINK_DISTANCE
            const pulse = Math.max(0, a.pulseBoost * 0.65 + b.pulseBoost * 0.35)
            const alpha = (BASE_LINK_ALPHA + pulse * 0.12) * intensity

            if (alpha > 0.001) {
              ctx.beginPath()
              ctx.moveTo(a.x, a.y)
              ctx.lineTo(b.x, b.y)
              ctx.strokeStyle = `rgba(74, 222, 128, ${alpha.toFixed(3)})`
              ctx.lineWidth = 1
              ctx.stroke()
            }
          }
        }
      }

      frameRef.current = window.requestAnimationFrame(animate)
    }

    resize()
    window.addEventListener('resize', resize)
    frameRef.current = window.requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
      }
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}
