import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../../types'
import { buildGraphData } from './graphData'

function entry(partial: Partial<VaultEntry> & { path: string; filename: string }): VaultEntry {
  return {
    title: '', isA: null, aliases: [], belongsTo: [], relatedTo: [], status: null,
    archived: false, modifiedAt: null, createdAt: null, fileSize: 0, snippet: '',
    wordCount: 0, relationships: {}, icon: null, color: null, order: null,
    sidebarLabel: null, template: null, sort: null, view: null, visible: null,
    outgoingLinks: [], properties: {},
    ...partial,
  } as VaultEntry
}

describe('buildGraphData', () => {
  const entries = [
    entry({ path: '/v/a.md', filename: 'alice.md', title: 'Alice', outgoingLinks: ['bob', 'carol'] }),
    entry({ path: '/v/b.md', filename: 'bob.md', title: 'Bob', outgoingLinks: ['carol'] }),
    entry({ path: '/v/c.md', filename: 'carol.md', title: 'Carol', aliases: ['Caz'] }),
    entry({ path: '/v/d.md', filename: 'dave.md', title: 'Dave' }),
  ]

  it('resolves wikilinks to undirected edges and computes degree', () => {
    const g = buildGraphData(entries)
    expect(g.edges).toHaveLength(3) // a-b? no: a->bob, a->carol, b->carol
    const carol = g.nodes.find((n) => n.id === '/v/c.md')
    expect(carol?.degree).toBe(2)
  })

  it('drops unconnected notes', () => {
    const g = buildGraphData(entries)
    expect(g.nodes.find((n) => n.id === '/v/d.md')).toBeUndefined()
    expect(g.shown).toBe(3)
  })

  it('resolves by alias too', () => {
    const aliased = [
      entry({ path: '/v/x.md', filename: 'x.md', title: 'X', outgoingLinks: ['Caz'] }),
      entry({ path: '/v/c.md', filename: 'carol.md', title: 'Carol', aliases: ['Caz'] }),
    ]
    const g = buildGraphData(aliased)
    expect(g.edges).toEqual([{ source: '/v/x.md', target: '/v/c.md' }])
  })

  it('caps nodes by degree and keeps the most connected', () => {
    const hub = [
      entry({ path: '/v/h.md', filename: 'hub.md', title: 'Hub' }),
      entry({ path: '/v/1.md', filename: 'one.md', title: 'One', outgoingLinks: ['hub'] }),
      entry({ path: '/v/2.md', filename: 'two.md', title: 'Two', outgoingLinks: ['hub'] }),
      entry({ path: '/v/3.md', filename: 'three.md', title: 'Three', outgoingLinks: ['hub'] }),
    ]
    const g = buildGraphData(hub, 2)
    expect(g.shown).toBe(2)
    expect(g.nodes.map((n) => n.id)).toContain('/v/h.md') // hub has the highest degree
  })
})
