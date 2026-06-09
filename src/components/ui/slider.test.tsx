import { render, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Slider } from './slider'

describe('Slider', () => {
  it('exposes the current value via aria attributes', () => {
    const { getByRole } = render(<Slider value={5} min={0} max={10} onChange={() => {}} aria-label="Test" />)
    const slider = getByRole('slider')
    expect(slider.getAttribute('aria-valuenow')).toBe('5')
    expect(slider.getAttribute('aria-valuemin')).toBe('0')
    expect(slider.getAttribute('aria-valuemax')).toBe('10')
  })

  it('steps with arrow keys', () => {
    const onChange = vi.fn()
    const { getByRole } = render(<Slider value={5} min={0} max={10} step={2} onChange={onChange} aria-label="Test" />)
    fireEvent.keyDown(getByRole('slider'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith(7)
    fireEvent.keyDown(getByRole('slider'), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('clamps at the bounds', () => {
    const onChange = vi.fn()
    const { getByRole } = render(<Slider value={10} min={0} max={10} step={2} onChange={onChange} aria-label="Test" />)
    fireEvent.keyDown(getByRole('slider'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith(10)
  })
})
