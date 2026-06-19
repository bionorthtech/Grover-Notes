import { describe, expect, it } from 'vitest'
import { buildRollupPrompt, formatRollupSection, selectTodaysChangedNotes } from './dailyRollup'
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

const DAY = new Date(2026, 5, 16)
const dayStart = Math.floor(new Date(2026, 5, 16).getTime() / 1000)

describe('selectTodaysChangedNotes', () => {
  it('keeps content notes modified today, newest first', () => {
    const entries = [
      entry({ path: '/v/a.md', title: 'A', modifiedAt: dayStart + 100 }),
      entry({ path: '/v/b.md', title: 'B', modifiedAt: dayStart + 500 }),
      entry({ path: '/v/old.md', title: 'Old', modifiedAt: dayStart - 10 }), // yesterday
    ]
    expect(selectTodaysChangedNotes(entries, DAY).map((e) => e.title)).toEqual(['B', 'A'])
  })

  it('excludes daily notes, Type definitions, and archived notes', () => {
    const entries = [
      entry({ path: '/v/Daily Notes/2026-06-16.md', title: 'today', modifiedAt: dayStart + 1 }),
      entry({ path: '/v/t.md', title: 'T', isA: 'Type', modifiedAt: dayStart + 1 }),
      entry({ path: '/v/arch.md', title: 'Arch', archived: true, modifiedAt: dayStart + 1 }),
      entry({ path: '/v/keep.md', title: 'Keep', modifiedAt: dayStart + 1 }),
    ]
    expect(selectTodaysChangedNotes(entries, DAY).map((e) => e.title)).toEqual(['Keep'])
  })

  it('respects the limit', () => {
    const entries = Array.from({ length: 30 }, (_, i) => entry({ path: `/v/${i}.md`, modifiedAt: dayStart + i }))
    expect(selectTodaysChangedNotes(entries, DAY, 5)).toHaveLength(5)
  })
})

describe('buildRollupPrompt', () => {
  it('lists each note with title and snippet', () => {
    const prompt = buildRollupPrompt([{ title: 'Sprint', snippet: 'planned the release' }])
    expect(prompt).toContain('Sprint: planned the release')
    expect(prompt).toContain('markdown bullet')
  })
})

describe('formatRollupSection', () => {
  it('wraps the summary under a Daily rollup heading', () => {
    expect(formatRollupSection('- did a thing')).toBe('\n## Daily rollup\n\n- did a thing\n')
  })
})
