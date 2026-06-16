import { describe, expect, it } from 'vitest'
import {
  buildAutoTypePrompt,
  classifiableTypes,
  isTypeSuggestion,
  selectInboxCandidates,
} from './autoTypeInbox'
import type { VaultEntry } from '../types'

function entry(partial: Partial<VaultEntry> & { path: string }): VaultEntry {
  return {
    filename: partial.path.split('/').pop() ?? '', title: '', isA: null, aliases: [], belongsTo: [],
    relatedTo: [], status: null, archived: false, modifiedAt: null, createdAt: null, fileSize: 0,
    snippet: '', wordCount: 0, relationships: {}, icon: null, color: null, order: null,
    sidebarLabel: null, template: null, sort: null, view: null, visible: null, outgoingLinks: [],
    properties: {}, organized: false,
    ...partial,
  } as VaultEntry
}

describe('selectInboxCandidates', () => {
  it('picks untyped, unorganised inbox notes and skips typed/organised/Type notes', () => {
    const entries = [
      entry({ path: '/v/a.md', isA: null }),
      entry({ path: '/v/b.md', isA: 'Note' }),
      entry({ path: '/v/c.md', isA: 'Project' }),       // already typed
      entry({ path: '/v/d.md', isA: null, organized: true }), // organised
      entry({ path: '/v/e.md', isA: 'Type' }),          // a Type definition
      entry({ path: '/v/f.md', isA: null, archived: true }), // archived
    ]
    expect(selectInboxCandidates(entries).map((e) => e.path)).toEqual(['/v/a.md', '/v/b.md'])
  })

  it('respects the batch limit', () => {
    const entries = Array.from({ length: 30 }, (_, i) => entry({ path: `/v/${i}.md`, isA: null }))
    expect(selectInboxCandidates(entries, 5)).toHaveLength(5)
  })
})

describe('buildAutoTypePrompt', () => {
  it('includes the title, body, and existing types', () => {
    const prompt = buildAutoTypePrompt({ title: 'Sprint Planning', body: 'Notes from standup' }, ['Project', 'Person'])
    expect(prompt).toContain('Sprint Planning')
    expect(prompt).toContain('Notes from standup')
    expect(prompt).toContain('Project, Person')
  })

  it('handles an empty vault type list', () => {
    expect(buildAutoTypePrompt({ title: 'x', body: 'y' }, [])).toContain('(none yet)')
  })
})

describe('isTypeSuggestion', () => {
  it('accepts a well-formed suggestion', () => {
    expect(isTypeSuggestion({ type: 'Project', confidence: 0.8 })).toBe(true)
  })

  it('rejects malformed suggestions', () => {
    expect(isTypeSuggestion({ type: '', confidence: 0.8 })).toBe(false)
    expect(isTypeSuggestion({ type: 'Project', confidence: 2 })).toBe(false)
    expect(isTypeSuggestion({ type: 'Project' })).toBe(false)
    expect(isTypeSuggestion(null)).toBe(false)
  })
})

describe('classifiableTypes', () => {
  it('lists vault types excluding the meta Type', () => {
    const entries = [
      entry({ path: '/v/p.md', isA: 'Type', title: 'Project' }),
      entry({ path: '/v/x.md', isA: 'Project' }),
      entry({ path: '/v/y.md', isA: 'Person' }),
    ]
    const types = classifiableTypes(entries)
    expect(types).toContain('Project')
    expect(types).toContain('Person')
    expect(types).not.toContain('Type')
  })
})
