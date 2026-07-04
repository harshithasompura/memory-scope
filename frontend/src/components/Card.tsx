import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-ink/10 bg-white p-4 ${className}`}>{children}</div>
  )
}
