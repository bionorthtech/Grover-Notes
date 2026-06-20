import { describe, expect, it } from 'vitest'
import { computeVaultStats, formatStatsMarkdown } from './vaultStats'
import type { VaultEntry } from '../types'

function entry(partial: Partial<VaultEntry> & { path: string }): VaultEntry {
  return {
    filename: partial.path.split('/').pop() ?? '', title: '', isA: 'Note', aliases: [], belongsTo: [],
    relatedTo: [], status: null, archived: false, modifiedAt: null, createdAt: null, fileSize: 0,
    snippet: '', wordCount: 0, relationships: {}, icon: null, color: null, order: null,
    sidebarLabel: null, template: null, sort: null, view: null, visible: null, outgoingLinks: [],
    properties: {}, hasH1: true,
    ...partial,
  } as VaultEntry
}

const NOW = new Date(2026, 5, 16).getTime()
const recent = Math.floor(NOW / 1000) - 2 * 86400
const old = Math.floor(NOW / 1000) - 30 * 86400

describe('computeVaultStats', () => {
  const entries = [
    entry({ path: '/v/a.md', isA: 'Project', wordCount: 100, createdAt: recent, modifiedAt: recent, outgoingLinks: ['B'] }),
    entry({ path: '/v/b.md', isA: 'Project', wordCount: 200, createdAt: old, modifiedAt: recent, outgoingLinks: ['A'] }),
    entry({ path: '/v/c.md', isA: 'Person', wordCount: 50, createdAt: recent, modifiedAt: recent, outgoingLinks: [] }),
    entry({ path: '/v/u.md', isA: null, wordCount: 10, createdAt: recent, modifiedAt: recent, outgoingLinks: [] }),
    entry({ path: '/v/type.md', isA: 'Type', wordCount: 999 }),     // excluded
    entry({ path: '/v/arch.md', isA: 'Project', archived: true }),  // excluded
  ]

  it('aggregates totals, words, and created-this-week', () => {
    const stats = computeVaultStats(entries, NOW)
    expect(stats.totalNotes).toBe(4)
    expect(stats.totalWords).toBe(360)
    expect(stats.createdThisWeek).toBe(3) // a, c, u (b created 30d ago)
  })

  it('counts notes by type, busiest first, with Untyped bucket', () => {
    const stats = computeVaultStats(entries, NOW)
    expect(stats.byType).toEqual([
      { type: 'Project', count: 2 },
      { type: 'Person', count: 1 },
      { type: 'Untyped', count: 1 },
    ])
  })

  it('computes average outgoing links and surfaces issue counts', () => {
    const stats = computeVaultStats(entries, NOW)
    expect(stats.avgOutgoingLinks).toBe(0.5) // 2 links / 4 notes
    expect(stats.untyped).toBe(1)
    expect(stats.orphans).toBeGreaterThanOrEqual(1) // c and u have no links
  })

  it('handles an empty vault without dividing by zero', () => {
    const stats = computeVaultStats([], NOW)
    expect(stats).toMatchObject({ totalNotes: 0, totalWords: 0, avgOutgoingLinks: 0, byType: [] })
  })
})

describe('formatStatsMarkdown', () => {
  it('renders totals and a by-type list', () => {
    const sample = [
      entry({ path: '/v/a.md', isA: 'Project', outgoingLinks: ['B'] }),
      entry({ path: '/v/b.md', isA: 'Project', outgoingLinks: ['A'] }),
      entry({ path: '/v/c.md', isA: 'Person' }),
    ]
    const md = formatStatsMarkdown(computeVaultStats(sample, NOW))
    expect(md).toContain('# Vault stats')
    expect(md).toContain('- Notes: 3')
    expect(md).toContain('## By type')
    expect(md).toContain('- Project: 2')
  })
})
