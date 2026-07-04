import { useEffect, useState } from 'react'
import { dismissToast, subscribeToasts, type ToastEntry } from '../hooks/toastSignal'

const DISMISS_MS = 4000

function ToastItem({ toast }: { toast: ToastEntry }) {
  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), DISMISS_MS)
    return () => clearTimeout(timer)
  }, [toast.id])

  return (
    <div
      role="status"
      className="rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm text-gray-700 shadow-sm"
    >
      {toast.message}
    </div>
  )
}

export function Toast() {
  const [toasts, setToasts] = useState<ToastEntry[]>([])

  useEffect(() => subscribeToasts(setToasts), [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}
