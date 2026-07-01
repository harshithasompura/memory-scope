import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RecommendationRow } from './RecommendationRow'
import type { LogEntry } from '../types'

// Mock the api module so we never hit the network in tests
vi.mock('../api', () => ({
  postReask: vi.fn(),
  postResolve: vi.fn(),
}))

import * as api from '../api'

const baseEntry: LogEntry = {
  id: 1,
  timestamp: '2026-06-30T00:00:00Z',
  question: 'why use JWT?',
  answer_text: 'because of session scaling',
  cited_chunk_ids: ['chunk-1'],
  cited_data_ids: ['data-1'],
  suspect: false,
  resolved: false,
}

describe('RecommendationRow', () => {
  it('expands and shows answer on click', async () => {
    const user = userEvent.setup()
    render(
      <ul>
        <RecommendationRow entry={baseEntry} />
      </ul>,
    )

    expect(screen.queryByText('because of session scaling')).toBeInTheDocument()
    await user.click(screen.getByText('why use JWT?'))
    expect(screen.getByText(/chunk-1/)).toBeInTheDocument()
  })

  it('shows Re-ask button for suspect (non-resolved) rows', () => {
    const suspectEntry: LogEntry = { ...baseEntry, suspect: true, resolved: false }
    render(
      <ul>
        <RecommendationRow entry={suspectEntry} />
      </ul>,
    )
    expect(screen.getByText('Re-ask')).toBeInTheDocument()
  })

  it('does NOT show Re-ask button for non-suspect rows', () => {
    render(
      <ul>
        <RecommendationRow entry={baseEntry} />
      </ul>,
    )
    expect(screen.queryByText('Re-ask')).not.toBeInTheDocument()
  })

  it('does NOT show Re-ask button for resolved rows', () => {
    const resolvedEntry: LogEntry = { ...baseEntry, suspect: true, resolved: true }
    render(
      <ul>
        <RecommendationRow entry={resolvedEntry} />
      </ul>,
    )
    expect(screen.queryByText('Re-ask')).not.toBeInTheDocument()
    expect(screen.getByText('resolved')).toBeInTheDocument()
  })

  it('disables Re-ask with citation-untracked label when cited_data_ids is empty', () => {
    const untrackedEntry: LogEntry = {
      ...baseEntry,
      suspect: true,
      resolved: false,
      cited_data_ids: [],
    }
    render(
      <ul>
        <RecommendationRow entry={untrackedEntry} />
      </ul>,
    )
    const btn = screen.getByText('citation untracked — cannot verify')
    expect(btn).toBeInTheDocument()
    // The button element should be disabled
    expect(btn.closest('button')).toBeDisabled()
  })

  it('shows changed diff and Mark resolved button after successful reask with changed=true', async () => {
    const user = userEvent.setup()
    vi.mocked(api.postReask).mockResolvedValue({
      old_cited_data_ids: ['data-1'],
      new_cited_data_ids: ['data-2'],
      new_answer: 'new answer text',
      changed: true,
      new_log_id: 99,
    })

    const suspectEntry: LogEntry = { ...baseEntry, suspect: true, resolved: false }
    render(
      <ul>
        <RecommendationRow entry={suspectEntry} />
      </ul>,
    )

    await user.click(screen.getByText('Re-ask'))
    await waitFor(() => expect(screen.getByText('new answer text')).toBeInTheDocument())
    expect(screen.getByText('Mark resolved')).toBeInTheDocument()
  })

  it('shows still-suspect message after reask with changed=false', async () => {
    const user = userEvent.setup()
    vi.mocked(api.postReask).mockResolvedValue({
      old_cited_data_ids: ['data-1'],
      new_cited_data_ids: ['data-1'],
      new_answer: 'same answer',
      changed: false,
      new_log_id: 100,
    })

    const suspectEntry: LogEntry = { ...baseEntry, suspect: true, resolved: false }
    render(
      <ul>
        <RecommendationRow entry={suspectEntry} />
      </ul>,
    )

    await user.click(screen.getByText('Re-ask'))
    await waitFor(() =>
      expect(screen.getByText('Still suspect — no correction found in memory yet.')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Mark resolved')).not.toBeInTheDocument()
  })

  it('calls postResolve and onResolved when Mark resolved is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(api.postReask).mockResolvedValue({
      old_cited_data_ids: ['data-1'],
      new_cited_data_ids: ['data-2'],
      new_answer: 'new answer',
      changed: true,
      new_log_id: 101,
    })
    vi.mocked(api.postResolve).mockResolvedValue({ status: 'ok' })
    const onResolved = vi.fn()

    const suspectEntry: LogEntry = { ...baseEntry, suspect: true, resolved: false }
    render(
      <ul>
        <RecommendationRow entry={suspectEntry} onResolved={onResolved} />
      </ul>,
    )

    await user.click(screen.getByText('Re-ask'))
    await waitFor(() => expect(screen.getByText('Mark resolved')).toBeInTheDocument())
    await user.click(screen.getByText('Mark resolved'))
    await waitFor(() => expect(api.postResolve).toHaveBeenCalledWith(1))
    await waitFor(() => expect(onResolved).toHaveBeenCalled())
  })
})
