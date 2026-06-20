import { describe, expect, it } from 'vitest'
import { findDuplicateNotes } from './duplicateNotes'
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

describe('findDuplicateNotes', () => {
  it('groups notes with the same normalized title', () => {
    const groups = findDuplicateNotes([
      entry({ path: '/v/a.md', title: 'Meeting Notes' }),
      entry({ path: '/v/b.md', title: 'meeting   notes' }), // case + whitespace differences
      entry({ path: '/v/c.md', title: 'Unique' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe('Meeting Notes')
    expect(groups[0].notes.map((n) => n.path)).toEqual(['/v/a.md', '/v/b.md'])
  })

  it('ignores archived, Type, and empty-title notes', () => {
    const groups = findDuplicateNotes([
      entry({ path: '/v/a.md', title: 'Dup' }),
      entry({ path: '/v/b.md', title: 'Dup', archived: true }),
      entry({ path: '/v/c.md', title: 'Dup', isA: 'Type' }),
      entry({ path: '/v/e.md', title: '   ' }),
      entry({ path: '/v/f.md', title: '' }),
    ])
    expect(groups).toEqual([])
  })

  it('orders larger duplicate groups first', () => {
    const groups = findDuplicateNotes([
      entry({ path: '/v/1.md', title: 'Pair' }),
      entry({ path: '/v/2.md', title: 'Pair' }),
      entry({ path: '/v/3.md', title: 'Trio' }),
      entry({ path: '/v/4.md', title: 'Trio' }),
      entry({ path: '/v/5.md', title: 'Trio' }),
    ])
    expect(groups.map((g) => `${g.title}:${g.notes.length}`)).toEqual(['Trio:3', 'Pair:2'])
  })
})
