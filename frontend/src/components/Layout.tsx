import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { MessageSquare, RefreshCw, Share2 } from 'lucide-react'
import { BadgeLegend } from './BadgeLegend'
import { Toast } from './Toast'
import { subscribeLoading } from '../hooks/loadingSignal'

const tabs = [
  { to: '/ask', label: 'Ask', Icon: MessageSquare },
  { to: '/graph', label: 'Memory Graph', Icon: Share2 },
  { to: '/lifecycle', label: 'Lifecycle', Icon: RefreshCw },
]

export function Layout({ children }: { children?: ReactNode }) {
  const location = useLocation()
  const [loading, setLoading] = useState(false)

  useEffect(() => subscribeLoading(setLoading), [])

  const crumb = location.pathname || '/ask'

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-100 p-6 font-sans">
      <Toast />
      <div className="w-full max-w-5xl overflow-hidden rounded-xl border border-[#EAEAEA] bg-white">
        <div className="bg-dot-grid flex items-center gap-1.5 border-b border-[#EAEAEA] px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span
            role="status"
            aria-label={loading ? 'loading' : 'idle'}
            className={`ml-auto h-2 w-2 rounded-full bg-accent ${loading ? 'animate-pulse' : ''}`}
          />
        </div>

        <div className="flex items-center justify-between border-b border-[#EAEAEA] px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
            <span className="font-mono text-lg font-semibold">
              <span className="text-gray-900">Memory</span>
              <span className="text-accent">Scope</span>
            </span>
          </div>
          <span className="font-mono text-xs text-gray-500">{crumb}</span>
        </div>

        <nav className="flex gap-6 border-b border-[#EAEAEA] px-6">
          {tabs.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 border-b-2 py-3 font-mono text-sm ${
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="px-6 py-8">{children ?? <Outlet />}</main>

        <BadgeLegend />
      </div>
    </div>
  )
}
