import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GroverMark } from './GroverMark'

describe('GroverMark', () => {
  it('renders an accessible svg sized by the size prop', () => {
    const { getByRole } = render(<GroverMark size={40} />)
    const svg = getByRole('img', { name: 'Grover' })
    expect(svg.getAttribute('width')).toBe('40')
    expect(svg.getAttribute('height')).toBe('40')
  })

  it('defaults to a 64px mark and forwards a className', () => {
    const { getByRole } = render(<GroverMark className="grover-fade-up" />)
    const svg = getByRole('img', { name: 'Grover' })
    expect(svg.getAttribute('width')).toBe('64')
    expect(svg.getAttribute('class')).toContain('grover-fade-up')
  })
})
