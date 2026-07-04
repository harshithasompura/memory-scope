// ponytail: module-level counter + native EventTarget, no context/provider
// needed for a single boolean signal shared across pages.
const target = new EventTarget()
let count = 0

export function subscribeLoading(callback: (loading: boolean) => void) {
  const handler = () => callback(count > 0)
  target.addEventListener('change', handler)
  return () => target.removeEventListener('change', handler)
}

export function beginLoading() {
  count += 1
  target.dispatchEvent(new Event('change'))
}

export function endLoading() {
  count = Math.max(0, count - 1)
  target.dispatchEvent(new Event('change'))
}
