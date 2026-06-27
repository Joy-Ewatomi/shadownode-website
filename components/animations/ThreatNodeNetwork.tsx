'use client'
import { useEffect, useRef, useCallback } from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  hue: number
  phase: number
}

const PARTICLE_COUNT = 160
const MAX_LINK_DISTANCE = 165

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
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(width, height)
      )
    } else {
      // Reposition on resize
      const w = width, h = height
      particlesRef.current.forEach(p => {
        p.x = Math.random() * w
        p.y = Math.random() * h
      })
    }
  }, [])

  function createParticle(width: number, height: number): Particle {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2.2,
      vy: (Math.random() - 0.5) * 2.2,
      size: Math.random() * 2.4 + 1.3,
      hue: 90 + Math.random() * 45,
      phase: Math.random() * Math.PI * 2,
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

    // Soft cinematic trails
    ctx.fillStyle = 'rgba(5, 5, 5, 0.78)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const particles = particlesRef.current
    const t = timeRef.current

    // Update particles with constant energy
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      // Strong flowing organic movement (never dies)
      const waveX = Math.sin(t * 0.4 + p.phase) * 0.65
      const waveY = Math.cos(t * 0.35 + p.phase * 1.3) * 0.55
      
      p.vx += waveX * 0.045
      p.vy += waveY * 0.045

      // Gentle random turbulence (keeps it alive when idle)
      p.vx += (Math.random() - 0.5) * 0.12
      p.vy += (Math.random() - 0.5) * 0.12

      // Soft damping so it doesn't go too crazy
      p.vx *= 0.935
      p.vy *= 0.935

      p.x += p.vx
      p.y += p.vy

      // Natural wrapping
      if (p.x < 0) p.x = width
      if (p.x > width) p.x = 0
      if (p.y < 0) p.y = height
      if (p.y > height) p.y = 0

      // Draw node with breathing glow
      const pulse = Math.sin(t * 3 + p.phase) * 0.5 + 0.5
      const drawSize = p.size + pulse * 1.6

      ctx.save()
      ctx.beginPath()
      ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${p.hue}, 90%, 78%, 0.92)`
      ctx.shadowBlur = 22 + pulse * 12
      ctx.shadowColor = `hsla(${p.hue + 15}, 100%, 82%, 0.95)`
      ctx.fill()
      ctx.restore()
    }

    // Dynamic connections
    ctx.lineWidth = 1.05
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i]
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy)

        if (dist < MAX_LINK_DISTANCE) {
          const alpha = (1 - dist / MAX_LINK_DISTANCE) * (0.26 + Math.sin(t + i) * 0.08)
          ctx.strokeStyle = `hsla(105, 82%, 72%, ${alpha})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
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
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050505]">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}