'use client'

import { useEffect, useState } from 'react'

export function MatrixStream() {
  const [columns, setColumns] = useState<number>(0)

  useEffect(() => {
    setColumns(Math.floor(window.innerWidth / 30))
    const handleResize = () => setColumns(Math.floor(window.innerWidth / 30))
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // A mix of hex codes, binary strings, and terminal glyphs
  const glyphs = ['01', '10', '0x7F', '0x2A', 'SYS', 'ERR', '▲', '⚡', 'Ø', '0110', 'SEC']

  return (
    <div className="fixed inset-0 -z-10 bg-[#050505] overflow-hidden opacity-25 pointer-events-none flex justify-between px-4">
      {Array.from({ length: columns }).map((_, i) => {
        // Randomize speed, delay, and content for a natural flowing stream effect
        const duration = 8 + Math.random() * 12
        const delay = Math.random() * -20
        const randomGlyphs = Array.from({ length: 25 }, () => glyphs[Math.floor(Math.random() * glyphs.length)])

        return (
          <div
            key={i}
            className="flex flex-col text-[#4ade80] font-mono text-xs font-bold leading-relaxed whitespace-nowrap select-none animate-matrix-fall"
            style={{
              animation: `matrixFall ${duration}s linear infinite`,
              animationDelay: `${delay}s`,
            }}
          >
            {randomGlyphs.map((glyph, idx) => (
              <span key={idx} className="my-2" style={{ opacity: 1 - idx * 0.04 }}>
                {glyph}
              </span>
            ))}
          </div>
        )
      })}

      <style jsx global>{`
        @keyframes matrixFall {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  )
}