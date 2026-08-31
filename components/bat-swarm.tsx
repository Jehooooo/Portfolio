'use client'

import { useState, useCallback } from 'react'

interface Bat {
  id: number
  startX: number
  startY: number
  tx: number
  ty: number
  scale: number
  rotation: number
  duration: number
  delay: number
  flapSpeed: number
}

// Iconic Batman silhouette SVG
function BatIcon({ flapSpeed }: { flapSpeed: number }) {
  return (
    <svg
      viewBox="0 0 100 55"
      className="h-full w-full fill-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] select-none"
      style={{
        animation: `batWingFlap ${flapSpeed}s ease-in-out infinite alternate`,
        transformOrigin: 'center center',
      }}
    >
      <path d="M50 18 C44 8, 28 2, 8 6 C14 16, 12 28, 2 36 C14 40, 28 34, 36 26 C38 36, 44 44, 50 52 C56 44, 62 36, 64 26 C72 34, 86 40, 98 36 C88 28, 86 16, 92 6 C72 2, 56 8, 50 18 Z" />
    </svg>
  )
}

export function BatSwarm({ children }: { children: React.ReactNode }) {
  const [bats, setBats] = useState<Bat[]>([])

  const spawnBats = useCallback(() => {
    // Trigger in dark mode
    if (typeof document !== 'undefined' && !document.documentElement.classList.contains('dark')) {
      return
    }

    const count = 18
    const newBats: Bat[] = []
    const now = Date.now()

    for (let i = 0; i < count; i++) {
      // Swarm out 360 degrees, with upward lift like Batman's dramatic cloak
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.7
      const distance = 180 + Math.random() * 260
      const tx = Math.cos(angle) * distance
      const ty = Math.sin(angle) * distance - (50 + Math.random() * 80)
      const rotation = (angle * 180) / Math.PI + 90 + (Math.random() - 0.5) * 30

      newBats.push({
        id: now + i + Math.random(),
        startX: (Math.random() - 0.5) * 40,
        startY: (Math.random() - 0.5) * 40,
        tx,
        ty,
        scale: 0.45 + Math.random() * 0.75,
        rotation,
        duration: 0.85 + Math.random() * 0.55,
        delay: Math.random() * 0.12,
        flapSpeed: 0.07 + Math.random() * 0.05,
      })
    }

    setBats((prev) => [...prev.slice(-36), ...newBats])

    setTimeout(() => {
      setBats((prev) => prev.filter((b) => !newBats.some((nb) => nb.id === b.id)))
    }, 1700)
  }, [])

  return (
    <div className="relative inline-block" onMouseEnter={spawnBats} onClick={spawnBats}>
      {children}

      {/* Bat Swarm Particles */}
      <div className="pointer-events-none absolute inset-0 z-50 overflow-visible">
        {bats.map((bat) => (
          <div
            key={bat.id}
            className="absolute left-1/2 top-1/2 h-6 w-11 -translate-x-1/2 -translate-y-1/2 will-change-transform"
            style={{
              animation: `batFlyOut ${bat.duration}s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
              animationDelay: `${bat.delay}s`,
              // @ts-expect-error custom CSS properties
              '--start-x': `${bat.startX}px`,
              '--start-y': `${bat.startY}px`,
              '--target-x': `${bat.tx}px`,
              '--target-y': `${bat.ty}px`,
              '--bat-rot': `${bat.rotation}deg`,
              '--bat-scale': `${bat.scale}`,
            }}
          >
            <BatIcon flapSpeed={bat.flapSpeed} />
          </div>
        ))}
      </div>
    </div>
  )
}