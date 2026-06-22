import { describe, expect, it } from 'vitest'
import { normalizeFetchUrl } from './fetchUrl'

describe('normalizeFetchUrl', () => {
  it('appends .json to a Reddit comment thread URL', () => {
    expect(normalizeFetchUrl('https://www.reddit.com/r/pkm/comments/abc/title/')).toBe(
      'https://www.reddit.com/r/pkm/comments/abc/title.json',
    )
  })

  it('strips query/hash before appending .json', () => {
    expect(normalizeFetchUrl('https://reddit.com/r/x/comments/abc/t?utm=1')).toBe(
      'https://reddit.com/r/x/comments/abc/t.json',
    )
  })

  it('does not double-append .json', () => {
    expect(normalizeFetchUrl('https://www.reddit.com/r/x/comments/abc/t.json')).toBe(
      'https://www.reddit.com/r/x/comments/abc/t.json',
    )
  })

  it('appends .json to a Discourse topic URL', () => {
    expect(normalizeFetchUrl('https://forum.example.com/t/best-pkm/42')).toBe(
      'https://forum.example.com/t/best-pkm/42.json',
    )
  })

  it('leaves an ordinary article URL untouched', () => {
    expect(normalizeFetchUrl('https://example.com/blog/post')).toBe('https://example.com/blog/post')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeFetchUrl('  https://example.com/x  ')).toBe('https://example.com/x')
  })
})
