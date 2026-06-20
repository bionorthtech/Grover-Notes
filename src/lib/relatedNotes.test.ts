import { describe, expect, it } from 'vitest'
import { findRelatedNotes } from './relatedNotes'
import type { VaultEntry } from '../types'

function entry(partial: Partial<VaultEntry> & { path: string }): VaultEntry {
  return {
    filename: partial.path.split('/').pop() ?? '', title: '', isA: 'Note', aliases: [], belongsTo: [],
    relatedTo: [], status: null, archived: false, modifiedAt: null, createdAt: null, fileSize: 0,
    snippet: '', wordCount: 0, relationships: {}, icon: null, color: null, order: null,
    sidebarLabel: null, template: null, sort: null, view: null, visible: null, outgoingLinks: [], properties: {},
    ...partial,
  } as VaultEntry
}

const active = entry({ path: '/v/active.md', title: 'Active', isA: 'Project', outgoingLinks: ['Shared Topic', 'Bob'], belongsTo: ['Q1'] })

describe('findRelatedNotes', () => {
  it('ranks a directly-linked note highly', () => {
    const others = [
      entry({ path: '/v/bob.md', title: 'Bob', isA: 'Person' }), // active links to Bob
      entry({ path: '/v/x.md', title: 'X', isA: 'Person' }),
    ]
    const related = findRelatedNotes(active, others)
    expect(related[0].entry.title).toBe('Bob')
    expect(related[0].reason).toBe('linked')
  })

  it('scores shared link targets and same type', () => {
    const others = [
      entry({ path: '/v/sib.md', title: 'Sibling', isA: 'Project', outgoingLinks: ['Shared Topic'] }), // shared link + same type
      entry({ path: '/v/unrelated.md', title: 'Unrelated', isA: 'Recipe' }),
    ]
    const related = findRelatedNotes(active, others)
    expect(related.map((r) => r.entry.title)).toEqual(['Sibling'])
    expect(related[0].score).toBeGreaterThanOrEqual(3) // 2 (shared link) + 1 (same type)
  })

  it('counts shared relationships', () => {
    const others = [entry({ path: '/v/peer.md', title: 'Peer', isA: 'Person', belongsTo: ['Q1'] })]
    const related = findRelatedNotes(active, others)
    expect(related[0].reason).toBe('shared connections')
  })

  it('excludes self, archived, and Type notes, and unrelated notes', () => {
    const others = [
      entry({ path: '/v/active.md', title: 'Active', isA: 'Project' }), // self
      entry({ path: '/v/arch.md', title: 'Arch', isA: 'Project', archived: true, outgoingLinks: ['Shared Topic'] }),
      entry({ path: '/v/t.md', title: 'T', isA: 'Type' }),
      entry({ path: '/v/none.md', title: 'None', isA: 'Recipe' }),
    ]
    expect(findRelatedNotes(active, others)).toEqual([])
  })
})
