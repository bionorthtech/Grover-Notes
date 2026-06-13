import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../../types'
import { buildGraphData, filterGraph, graphTypes, UNTYPED_KEY } from './graphData'

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
    const g = buildGraphData(hub, { maxNodes: 2 })
    expect(g.shown).toBe(2)
    expect(g.nodes.map((n) => n.id)).toContain('/v/h.md') // hub has the highest degree
  })

  it('excludes orphans by default but surfaces them when asked', () => {
    expect(buildGraphData(entries).nodes.map((n) => n.id)).not.toContain('/v/d.md') // Dave is unlinked
    const withOrphans = buildGraphData(entries, { includeOrphans: true })
    expect(withOrphans.nodes.map((n) => n.id)).toContain('/v/d.md')
    expect(withOrphans.totalConnected).toBe(3) // orphan does not inflate the connected count
  })
})

describe('graphTypes', () => {
  it('lists distinct types present, grouping untyped notes', () => {
    const data = buildGraphData([
      entry({ path: '/v/a.md', filename: 'a.md', title: 'A', isA: 'Person', outgoingLinks: ['B'] }),
      entry({ path: '/v/b.md', filename: 'b.md', title: 'B', isA: 'Project', outgoingLinks: ['A'] }),
      entry({ path: '/v/c.md', filename: 'c.md', title: 'C', outgoingLinks: ['A'] }),
    ])
    expect(graphTypes(data)).toEqual(['Person', 'Project', UNTYPED_KEY])
  })
})

describe('filterGraph', () => {
  const data = buildGraphData([
    entry({ path: '/v/a.md', filename: 'a.md', title: 'A', isA: 'Person', outgoingLinks: ['B', 'C'] }),
    entry({ path: '/v/b.md', filename: 'b.md', title: 'B', isA: 'Project', outgoingLinks: ['D'] }),
    entry({ path: '/v/c.md', filename: 'c.md', title: 'C', isA: 'Project' }),
    entry({ path: '/v/d.md', filename: 'd.md', title: 'D', isA: 'Topic' }),
  ])

  it('hides nodes of hidden types and their incident edges', () => {
    const filtered = filterGraph(data, { hiddenTypes: new Set(['Project']) })
    const ids = filtered.nodes.map((n) => n.id)
    expect(ids).toEqual(expect.arrayContaining(['/v/a.md', '/v/d.md']))
    expect(ids).not.toContain('/v/b.md')
    expect(filtered.edges.every((e) => e.source !== '/v/b.md' && e.target !== '/v/b.md')).toBe(true)
  })

  it('restricts to the local neighborhood within N hops of a root', () => {
    const oneHop = filterGraph(data, { hiddenTypes: new Set(), localRoot: '/v/a.md', localHops: 1 })
    expect(oneHop.nodes.map((n) => n.id).sort()).toEqual(['/v/a.md', '/v/b.md', '/v/c.md'])
    const twoHop = filterGraph(data, { hiddenTypes: new Set(), localRoot: '/v/a.md', localHops: 2 })
    expect(twoHop.nodes.map((n) => n.id)).toContain('/v/d.md') // reached via B
  })

  it('returns everything unchanged when no filters apply', () => {
    expect(filterGraph(data, { hiddenTypes: new Set() }).nodes).toHaveLength(data.nodes.length)
  })
})
