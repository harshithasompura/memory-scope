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
    vi.mocked(api.postForget).mockResolvedValue({
      status: 'ok',
      dataset: 'engineering_decisions',
      data_id: null,
      flagged_count: 0,
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
})
