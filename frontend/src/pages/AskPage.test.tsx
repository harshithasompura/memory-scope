import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AskPage } from './AskPage'
import * as api from '../api'

vi.mock('../api')

describe('AskPage', () => {
  beforeEach(() => {
    vi.mocked(api.getLogs).mockResolvedValue([])
    vi.mocked(api.postQuery).mockResolvedValue({
      answer: 'use OAuth instead of JWT',
      trace: { operation: 'recall', duration_ms: 10, breakdown: {}, errors: [] },
    })
  })

  it('submits a question and renders the answer', async () => {
    const user = userEvent.setup()
    render(<AskPage />)

    await waitFor(() => expect(api.getLogs).toHaveBeenCalled())

    await user.type(screen.getByPlaceholderText('Ask a question...'), 'why JWT?')
    await user.click(screen.getByRole('button', { name: 'Ask' }))

    await waitFor(() => expect(screen.getByText('use OAuth instead of JWT')).toBeInTheDocument())
  })

  it('shows the citation chain under a live answer', async () => {
    vi.mocked(api.postQuery).mockResolvedValue({
      answer: 'use OAuth instead of JWT',
      cited_chunk_ids: ['chunk-9'],
      cited_data_ids: ['adr-007'],
      trace: { operation: 'recall', duration_ms: 10, breakdown: {}, errors: [] },
    })
    const user = userEvent.setup()
    render(<AskPage />)

    await waitFor(() => expect(api.getLogs).toHaveBeenCalled())

    await user.type(screen.getByPlaceholderText('Ask a question...'), 'why JWT?')
    await user.click(screen.getByRole('button', { name: 'Ask' }))

    await waitFor(() => expect(screen.getByText(/source: adr-007/)).toBeInTheDocument())
    expect(screen.getByText(/chunks: chunk-9/)).toBeInTheDocument()
  })

  it('sends the as-of timestamp when a time-travel date is set', async () => {
    const user = userEvent.setup()
    render(<AskPage />)

    await waitFor(() => expect(api.getLogs).toHaveBeenCalled())

    await user.type(screen.getByLabelText('As of'), '2026-06-01T00:00')
    await user.type(screen.getByPlaceholderText('Ask a question...'), 'why JWT?')
    await user.click(screen.getByRole('button', { name: 'Ask' }))

    await waitFor(() =>
      expect(api.postQuery).toHaveBeenCalledWith('why JWT?', '2026-06-01T00:00'),
    )
  })

  it('omits as_of when no time-travel date is set', async () => {
    const user = userEvent.setup()
    render(<AskPage />)

    await waitFor(() => expect(api.getLogs).toHaveBeenCalled())

    await user.type(screen.getByPlaceholderText('Ask a question...'), 'why JWT?')
    await user.click(screen.getByRole('button', { name: 'Ask' }))

    await waitFor(() => expect(api.postQuery).toHaveBeenCalledWith('why JWT?', undefined))
  })
})
