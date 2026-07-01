import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RecommendationRow } from './RecommendationRow'
import type { LogEntry } from '../types'

const entry: LogEntry = {
  id: 1,
  timestamp: '2026-06-30T00:00:00Z',
  question: 'why use JWT?',
  answer_text: 'because of session scaling',
  cited_chunk_ids: ['chunk-1'],
  cited_data_ids: ['data-1'],
  suspect: false,
}

describe('RecommendationRow', () => {
  it('expands and collapses on click', async () => {
    const user = userEvent.setup()
    render(
      <ul>
        <RecommendationRow entry={entry} />
      </ul>,
    )

    expect(screen.queryByText('because of session scaling')).toBeInTheDocument()
    await user.click(screen.getByText('why use JWT?'))
    expect(screen.getByText(/chunk-1/)).toBeInTheDocument()
  })
})
