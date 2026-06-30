import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders the suspect label text', () => {
    render(<Badge>suspect</Badge>)
    expect(screen.getByText('suspect')).toBeInTheDocument()
  })
})
