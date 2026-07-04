import { useCallback, useReducer } from 'react'
import { beginLoading, endLoading } from './loadingSignal'

type State<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }

type Action<T> =
  | { type: 'start' }
  | { type: 'success'; data: T }
  | { type: 'error'; error: string }
  | { type: 'reset' }

function reducer<T>(_state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case 'start':
      return { status: 'loading' }
    case 'success':
      return { status: 'success', data: action.data }
    case 'error':
      return { status: 'error', error: action.error }
    case 'reset':
      return { status: 'idle' }
  }
}

export function useAsync<T, Args extends unknown[]>(fn: (...args: Args) => Promise<T>) {
  const [state, dispatch] = useReducer(reducer<T>, { status: 'idle' })

  const run = useCallback(
    async (...args: Args) => {
      dispatch({ type: 'start' })
      beginLoading()
      try {
        const data = await fn(...args)
        dispatch({ type: 'success', data })
        return data
      } catch (err) {
        dispatch({ type: 'error', error: err instanceof Error ? err.message : String(err) })
        throw err
      } finally {
        endLoading()
      }
    },
    [fn],
  )

  const reset = useCallback(() => dispatch({ type: 'reset' }), [])

  return { state, run, reset }
}
