import { describe, expect, it } from 'vitest'
import { darken, isGreyish, labelAlpha } from './graphMath'

describe('darken', () => {
  it('scales hex colours toward black', () => {
    expect(darken('#ffffff', 0.5)).toBe('rgb(128, 128, 128)')
    expect(darken('#fff', 0)).toBe('rgb(255, 255, 255)')
    expect(darken('#5FC98C', 1)).toBe('rgb(0, 0, 0)')
  })

  it('scales rgb()/rgba() colours toward black', () => {
    expect(darken('rgb(100, 200, 50)', 0.5)).toBe('rgb(50, 100, 25)')
    expect(darken('rgba(100, 200, 50, 0.4)', 0)).toBe('rgb(100, 200, 50)')
  })

  it('returns the input unchanged when the colour cannot be parsed', () => {
    expect(darken('var(--accent-blue)', 0.5)).toBe('var(--accent-blue)')
  })
})

describe('isGreyish', () => {
  it('flags low-saturation colours as grey', () => {
    expect(isGreyish('rgb(140, 140, 140)')).toBe(true)
    expect(isGreyish('#888888')).toBe(true)
    expect(isGreyish('rgb(150, 145, 138)')).toBe(true) // muted-foreground-ish
  })

  it('does not flag saturated colours', () => {
    expect(isGreyish('#5FC98C')).toBe(false) // green
    expect(isGreyish('rgb(220, 120, 40)')).toBe(false) // orange
  })
})

describe('labelAlpha', () => {
  it('is fully transparent when zoomed far out and opaque when zoomed in', () => {
    expect(labelAlpha(0.1, 0.5)).toBe(0)
    expect(labelAlpha(4, 0.5)).toBe(1)
  })

  it('raising the fade threshold delays when labels appear', () => {
    expect(labelAlpha(1, 0.9)).toBeLessThan(labelAlpha(1, 0.1))
  })
})
