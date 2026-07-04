import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toast } from './Toast'
import { pushToast } from '../hooks/toastSignal'

describe('Toast', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when there are no toasts', () => {
    render(<Toast />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('appears on push and dismisses itself after a delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<Toast />)

    pushToast('forget completed')
    expect(await screen.findByText('forget completed')).toBeInTheDocument()

    vi.advanceTimersByTime(4100)
    await waitFor(() => expect(screen.queryByText('forget completed')).not.toBeInTheDocument())
  })

  it('stacks up to 3 toasts, newest on top, and drops the 4th', async () => {
    render(<Toast />)

    pushToast('one')
    pushToast('two')
    pushToast('three')
    pushToast('four')

    await waitFor(() => expect(screen.getAllByRole('status')).toHaveLength(3))
    const messages = screen.getAllByRole('status').map((el) => el.textContent)
    expect(messages).toEqual(['four', 'three', 'two'])
    expect(screen.queryByText('one')).not.toBeInTheDocument()
  })
})
