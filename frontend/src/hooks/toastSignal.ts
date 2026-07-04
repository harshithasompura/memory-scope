// ponytail: same module-level pub-sub shape as loadingSignal.ts — one
// event target, no context/provider needed for a global toast queue.
export interface ToastEntry {
  id: number
  message: string
}

const target = new EventTarget()
let toasts: ToastEntry[] = []
let nextId = 0

const MAX_TOASTS = 3

function emit() {
  target.dispatchEvent(new Event('change'))
}

export function subscribeToasts(callback: (toasts: ToastEntry[]) => void) {
  const handler = () => callback(toasts)
  target.addEventListener('change', handler)
  return () => target.removeEventListener('change', handler)
}

export function pushToast(message: string) {
  const entry = { id: nextId++, message }
  toasts = [entry, ...toasts].slice(0, MAX_TOASTS)
  emit()
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}
