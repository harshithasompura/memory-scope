import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LifecyclePage } from './LifecyclePage'
import * as api from '../api'

vi.mock('../api')

describe('LifecyclePage', () => {
  beforeEach(() => {
    vi.mocked(api.getDatasets).mockResolvedValue([
      { id: '1', name: 'engineering_decisions', created_at: '' },
    ])
    vi.mocked(api.getDatasetDocuments).mockResolvedValue([])
    vi.mocked(api.postForget).mockResolvedValue({
      status: 'ok',
      dataset: 'engineering_decisions',
      data_id: null,
      flagged_count: 0,
      blast_radius: { count: 0, most_recent: null, avg_confidence: 0 },
      trace_before: { operation: null, duration_ms: 0, breakdown: {}, errors: [] },
      counts_before: { num_nodes: 46, num_edges: 84 },
      counts_after: { num_nodes: 28, num_edges: 50 },
    })
  })

  it('forget shows a count delta on success', async () => {
    const user = userEvent.setup()
    render(<LifecyclePage />)

    await waitFor(() => expect(api.getDatasets).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Forget' }))

    await waitFor(() => expect(screen.getByText(/46.*28/)).toBeInTheDocument())
  })

  it('forget shows blast radius count, recency, and confidence when recs are affected', async () => {
    vi.mocked(api.postForget).mockResolvedValue({
      status: 'ok',
      dataset: 'engineering_decisions',
      data_id: 'd1',
      flagged_count: 2,
      blast_radius: { count: 2, most_recent: '2026-07-01T12:00:00+00:00', avg_confidence: 0.75 },
      trace_before: { operation: null, duration_ms: 0, breakdown: {}, errors: [] },
      counts_before: { num_nodes: 46, num_edges: 84 },
      counts_after: { num_nodes: 28, num_edges: 50 },
    })
    const user = userEvent.setup()
    render(<LifecyclePage />)

    await waitFor(() => expect(api.getDatasets).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: 'Forget' }))

    await waitFor(() => expect(screen.getByText(/2 recommendation\(s\) affected/)).toBeInTheDocument())
    expect(screen.getByText(/avg confidence 75%/)).toBeInTheDocument()
  })

  it('shows a stale badge for documents past the staleness threshold', async () => {
    vi.mocked(api.getDatasetDocuments).mockResolvedValue([
      { id: 'doc-old', name: 'session-auth.md', created_at: '2026-06-01T00:00:00Z', stale: true },
      { id: 'doc-new', name: 'oauth.md', created_at: '2026-06-30T23:00:00Z', stale: false },
    ])

    render(<LifecyclePage />)

    await waitFor(() =>
      expect(api.getDatasetDocuments).toHaveBeenCalledWith('engineering_decisions'),
    )

    expect(await screen.findByText('session-auth.md')).toBeInTheDocument()
    expect(screen.getByText('stale')).toBeInTheDocument()
    expect(screen.getByText('oauth.md')).toBeInTheDocument()
  })
})
