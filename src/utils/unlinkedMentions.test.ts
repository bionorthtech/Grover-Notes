import { describe, expect, it } from 'vitest'
import { buildLinkTargets, findUnlinkedMentions, linkMention, type LinkTarget } from './unlinkedMentions'

const targets: LinkTarget[] = [
  { path: '/v/alice.md', displayName: 'Alice', names: ['Alice', 'Ali'] },
  { path: '/v/project.md', displayName: 'Project Apollo', names: ['Project Apollo'] },
]

describe('findUnlinkedMentions', () => {
  it('finds a plain-text mention of another note', () => {
    const found = findUnlinkedMentions('Met with Alice about Project Apollo today.', targets)
    expect(found.map((m) => m.path)).toEqual(['/v/alice.md', '/v/project.md'])
    expect(found[0].matchedText).toBe('Alice')
  })

  it('ignores mentions already inside a wikilink', () => {
    expect(findUnlinkedMentions('Met with [[Alice]] today.', targets)).toEqual([])
  })

  it('ignores mentions inside inline code, fences, and markdown links', () => {
    expect(findUnlinkedMentions('Run `Alice` script', targets)).toEqual([])
    expect(findUnlinkedMentions('```\nAlice\n```', targets)).toEqual([])
    expect(findUnlinkedMentions('see [Alice](http://x)', targets)).toEqual([])
  })

  it('matches whole words only', () => {
    expect(findUnlinkedMentions('Alicia is not Alice', targets)[0].index).toBe(14)
  })

  it('reports at most one mention per target', () => {
    const found = findUnlinkedMentions('Alice and Alice and Alice', targets)
    expect(found.filter((m) => m.path === '/v/alice.md')).toHaveLength(1)
  })

  it('falls back to an alias when the title is absent', () => {
    const found = findUnlinkedMentions('Talked to Ali earlier', targets)
    expect(found[0]).toMatchObject({ path: '/v/alice.md', matchedText: 'Ali' })
  })

  it('returns nothing for empty input', () => {
    expect(findUnlinkedMentions('', targets)).toEqual([])
    expect(findUnlinkedMentions('hello', [])).toEqual([])
  })
})

describe('buildLinkTargets', () => {
  const entries = [
    { path: '/v/self.md', title: 'Self', aliases: [], archived: false },
    { path: '/v/alice.md', title: 'Alice', aliases: ['Ali'], archived: false },
    { path: '/v/old.md', title: 'Old', aliases: [], archived: true },
    { path: '/v/untitled.md', title: '  ', aliases: [], archived: false },
  ]

  it('includes other titled, non-archived notes with their aliases', () => {
    const targets = buildLinkTargets(entries, '/v/self.md')
    expect(targets).toEqual([{ path: '/v/alice.md', displayName: 'Alice', names: ['Alice', 'Ali'] }])
  })
})

describe('linkMention', () => {
  it('wraps an exact-title match in a plain wikilink', () => {
    const body = 'Met with Alice today.'
    const [mention] = findUnlinkedMentions(body, targets)
    expect(linkMention(body, mention)).toBe('Met with [[Alice]] today.')
  })

  it('uses an aliased wikilink when the matched text differs from the display name', () => {
    const body = 'Talked to Ali earlier'
    const [mention] = findUnlinkedMentions(body, targets)
    expect(linkMention(body, mention)).toBe('Talked to [[Alice|Ali]] earlier')
  })

  it('leaves the body untouched if the offset no longer matches', () => {
    const body = 'changed text'
    expect(linkMention(body, { path: '/v/a.md', displayName: 'Alice', matchedText: 'Alice', index: 0 })).toBe(body)
  })
})
