import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAsync } from './useAsync'

describe('useAsync', () => {
  it('transitions idle -> loading -> success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const { result } = renderHook(() => useAsync(fn))

    expect(result.current.state.status).toBe('idle')

    let promise: Promise<string>
    act(() => {
      promise = result.current.run()
    })
    expect(result.current.state.status).toBe('loading')

    await act(async () => {
      await promise
    })
    expect(result.current.state).toEqual({ status: 'success', data: 'ok' })
  })

  it('transitions idle -> loading -> error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useAsync(fn))

    await act(async () => {
      await result.current.run().catch(() => {})
    })

    expect(result.current.state).toEqual({ status: 'error', error: 'boom' })
  })
})
