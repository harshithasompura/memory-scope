import { useEffect, useState } from 'react'

const DURATION_MS = 500

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useCountUp(target: number) {
  const [value, setValue] = useState(target)

  useEffect(() => {
    if (target === 0 || prefersReducedMotion()) {
      setValue(target)
      return
    }

    setValue(0)
    const start = performance.now()
    let frame: number

    function tick(now: number) {
      const progress = Math.min((now - start) / DURATION_MS, 1)
      setValue(Math.round(progress * target))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return value
}
