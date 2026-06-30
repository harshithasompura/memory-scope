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
})
