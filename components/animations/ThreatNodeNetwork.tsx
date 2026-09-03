'use client'
import { useEffect, useRef, useCallback } from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  phase: number
  anchorX: number
  anchorY: number
  orbit: number
}

const PARTICLE_COUNT = 145
const MAX_LINK_DISTANCE = 150
const CLUSTER_CENTERS = [
  [0.18, 0.2],
  [0.24, 0.58],
  [0.42, 0.16],
  [0.5, 0.72],
  [0.7, 0.42],
  [0.84, 0.22],
  [0.82, 0.68],
] as const

export function ThreatNodeNetwork() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const timeRef = useRef(0)
  const isInitializedRef = useRef(false)

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = window.innerWidth
    const height = window.innerHeight
    const dpr = window.devicePixelRatio || 1

    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, (_, index) =>
        createParticle(width, height, index)
      )
    } else {
      particlesRef.current.forEach((p, index) => {
        const center = CLUSTER_CENTERS[index % CLUSTER_CENTERS.length]
        p.anchorX = center[0] * width + (Math.random() - 0.5) * width * 0.18
        p.anchorY = center[1] * height + (Math.random() - 0.5) * height * 0.24
        p.x = Math.max(0, Math.min(width, p.anchorX))
        p.y = Math.max(0, Math.min(height, p.anchorY))
      })
    }
  }, [])

  function createParticle(width: number, height: number, index: number): Particle {
    const center = CLUSTER_CENTERS[index % CLUSTER_CENTERS.length]
    const spreadX = width * (0.1 + Math.random() * 0.1)
    const spreadY = height * (0.12 + Math.random() * 0.12)
    const anchorX = center[0] * width + (Math.random() - 0.5) * spreadX
    const anchorY = center[1] * height + (Math.random() - 0.5) * spreadY
    const stray = Math.random() < 0.2

    return {
      x: stray ? Math.random() * width : Math.max(0, Math.min(width, anchorX)),
      y: stray ? Math.random() * height : Math.max(0, Math.min(height, anchorY)),
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.55,
      size: Math.random() < 0.72 ? Math.random() * 1.45 + 1.2 : Math.random() * 2.5 + 2.3,
      phase: Math.random() * Math.PI * 2,
      anchorX: stray ? Math.random() * width : anchorX,
      anchorY: stray ? Math.random() * height : anchorY,
      orbit: 22 + Math.random() * 82,
    }
  }

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.clientWidth
    const height = canvas.clientHeight
    timeRef.current += 0.016

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = 'rgba(0, 2, 1, 0.96)'
    ctx.fillRect(0, 0, width, height)

    const particles = particlesRef.current
    const t = timeRef.current

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const targetX = p.anchorX + Math.sin(t * 0.16 + p.phase) * p.orbit
      const targetY = p.anchorY + Math.cos(t * 0.13 + p.phase * 1.2) * p.orbit

      p.vx += (targetX - p.x) * 0.0009 + (Math.random() - 0.5) * 0.018
      p.vy += (targetY - p.y) * 0.0009 + (Math.random() - 0.5) * 0.018
      p.vx *= 0.975
      p.vy *= 0.975

      p.x += p.vx
      p.y += p.vy

      if (p.x < -12) p.x = width + 12
      if (p.x > width + 12) p.x = -12
      if (p.y < -12) p.y = height + 12
      if (p.y > height + 12) p.y = -12
    }

    ctx.lineWidth = 0.8
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i]
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy)

        if (dist < MAX_LINK_DISTANCE) {
          const alpha = (1 - dist / MAX_LINK_DISTANCE) * (0.18 + Math.sin(t * 0.7 + i) * 0.035)
          ctx.strokeStyle = `rgba(110, 238, 118, ${Math.max(0.025, alpha)})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const pulse = Math.sin(t * 1.9 + p.phase) * 0.5 + 0.5
      const drawSize = p.size + pulse * 0.75

      ctx.save()
      ctx.beginPath()
      ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(144, 246, 141, ${0.82 + pulse * 0.16})`
      ctx.shadowBlur = 14 + pulse * 18
      ctx.shadowColor = 'rgba(114, 255, 130, 0.88)'
      ctx.fill()
      ctx.restore()
    }

    frameRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    if (isInitializedRef.current) return

    handleResize()
    window.addEventListener('resize', handleResize)
    frameRef.current = requestAnimationFrame(animate)
    isInitializedRef.current = true

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize, animate])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full opacity-9" />
    </div>
  )
}
