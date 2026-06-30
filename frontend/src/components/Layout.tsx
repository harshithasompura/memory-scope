import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/ask', label: 'Ask' },
  { to: '/graph', label: 'Memory Graph' },
  { to: '/lifecycle', label: 'Lifecycle' },
]

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="flex gap-4 border-b border-gray-200 bg-white px-6 py-3">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `text-sm font-medium ${isActive ? 'text-accent' : 'text-gray-600 hover:text-gray-900'}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  )
}
