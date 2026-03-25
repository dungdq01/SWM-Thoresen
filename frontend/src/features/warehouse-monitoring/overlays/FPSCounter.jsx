import { memo, useState, useEffect, useRef } from 'react'

export const FPSCounter = memo(function FPSCounter() {
  const [fps, setFps] = useState(0)
  const framesRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  useEffect(() => {
    let rafId
    function tick() {
      framesRef.current++
      const now = performance.now()
      if (now - lastTimeRef.current >= 1000) {
        setFps(framesRef.current)
        framesRef.current = 0
        lastTimeRef.current = now
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div className="absolute top-4 right-4 pointer-events-none">
      <div className="bg-black/50 rounded-lg px-2 py-1 border border-white/10">
        <span className="text-[10px] font-mono text-white/40">{fps} FPS</span>
      </div>
    </div>
  )
})
