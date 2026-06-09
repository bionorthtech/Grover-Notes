import { describe, expect, it } from 'vitest'
import { extractHighlights, formatHighlightsForClipboard } from './extractHighlights'

describe('extractHighlights', () => {
  it('extracts multiple highlights in order, trimmed', () => {
    expect(extractHighlights('a ==first== b == second == c ==third==')).toEqual(['first', 'second', 'third'])
  })

  it('matches within each line, not across line breaks', () => {
    expect(extractHighlights('intro ==a==\nmore ==b== text')).toEqual(['a', 'b'])
    expect(extractHighlights('==dangling start\nplain line')).toEqual([])
  })

  it('returns an empty array when there are no highlights', () => {
    expect(extractHighlights('plain text with == nothing closed')).toEqual([])
  })

  it('ignores empty highlights', () => {
    expect(extractHighlights('==  == ==kept==')).toEqual(['kept'])
  })
})

describe('formatHighlightsForClipboard', () => {
  it('renders a markdown bullet list', () => {
    expect(formatHighlightsForClipboard(['one', 'two'])).toBe('- one\n- two')
  })
})
