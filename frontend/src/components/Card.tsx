import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded border border-gray-200 bg-white p-4 ${className}`}>{children}</div>
  )
}
