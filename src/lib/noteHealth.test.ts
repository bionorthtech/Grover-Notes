import { describe, expect, it } from 'vitest'
import { analyzeVaultHealth } from './noteHealth'
import type { VaultEntry } from '../types'

function entry(partial: Partial<VaultEntry> & { path: string }): VaultEntry {
  return {
    filename: partial.path.split('/').pop() ?? '', title: '', isA: 'Note', aliases: [], belongsTo: [],
    relatedTo: [], status: null, archived: false, modifiedAt: null, createdAt: null, fileSize: 0,
    snippet: '', wordCount: 100, relationships: {}, icon: null, color: null, order: null,
    sidebarLabel: null, template: null, sort: null, view: null, visible: null, outgoingLinks: [],
    properties: {}, hasH1: true,
    ...partial,
  } as VaultEntry
}

const NOW = new Date(2026, 5, 16).getTime()
const old = Math.floor(NOW / 1000) - 200 * 86400
const recent = Math.floor(NOW / 1000) - 10 * 86400

function kinds(report: ReturnType<typeof analyzeVaultHealth>): string[] {
  return report.categories.map((c) => c.kind)
}

describe('analyzeVaultHealth', () => {
  it('flags untyped, missing-h1, stub and stale notes', () => {
    const entries = [
      entry({ path: '/v/healthy.md', title: 'Healthy', wordCount: 200, modifiedAt: recent, outgoingLinks: ['Healthy2'] }),
      entry({ path: '/v/healthy2.md', title: 'Healthy2', wordCount: 200, modifiedAt: recent, outgoingLinks: ['Healthy'] }),
      entry({ path: '/v/u.md', title: 'Untyped', isA: null, wordCount: 200, modifiedAt: recent }),
      entry({ path: '/v/h.md', title: 'NoHead', hasH1: false, wordCount: 200, modifiedAt: recent }),
      entry({ path: '/v/s.md', title: 'Stub', wordCount: 3, modifiedAt: recent }),
      entry({ path: '/v/old.md', title: 'Old', wordCount: 200, modifiedAt: old }),
    ]
    const report = analyzeVaultHealth(entries, { now: NOW })
    expect(kinds(report)).toEqual(expect.arrayContaining(['untyped', 'missing-h1', 'stub', 'stale']))
    expect(report.categories.find((c) => c.kind === 'untyped')?.notes.map((n) => n.title)).toEqual(['Untyped'])
    expect(report.scanned).toBe(6)
  })

  it('detects orphans and broken links via link resolution', () => {
    const entries = [
      entry({ path: '/v/a.md', title: 'A', wordCount: 200, modifiedAt: recent, outgoingLinks: ['B'] }),
      entry({ path: '/v/b.md', title: 'B', wordCount: 200, modifiedAt: recent, outgoingLinks: ['A'] }),
      entry({ path: '/v/lonely.md', title: 'Lonely', wordCount: 200, modifiedAt: recent }),
      entry({ path: '/v/bad.md', title: 'Bad', wordCount: 200, modifiedAt: recent, outgoingLinks: ['Nonexistent'] }),
    ]
    const report = analyzeVaultHealth(entries, { now: NOW })
    expect(report.categories.find((c) => c.kind === 'orphan')?.notes.map((n) => n.title)).toEqual(['Lonely', 'Bad'])
    expect(report.categories.find((c) => c.kind === 'broken-link')?.notes.map((n) => n.title)).toEqual(['Bad'])
  })

  it('excludes archived notes and Type definitions from the scan', () => {
    const entries = [
      entry({ path: '/v/arch.md', title: 'Arch', isA: null, archived: true }),
      entry({ path: '/v/type.md', title: 'AType', isA: 'Type', hasH1: false }),
      entry({ path: '/v/ok.md', title: 'OK', wordCount: 200, modifiedAt: recent, outgoingLinks: ['OK2'] }),
      entry({ path: '/v/ok2.md', title: 'OK2', wordCount: 200, modifiedAt: recent, outgoingLinks: ['OK'] }),
    ]
    const report = analyzeVaultHealth(entries, { now: NOW })
    expect(report.scanned).toBe(2)
    expect(report.healthy).toBe(2)
    expect(report.categories).toEqual([])
  })

  it('does not flag daily notes as stubs', () => {
    const entries = [
      entry({ path: '/v/Daily Notes/2026-06-16.md', title: '2026-06-16', wordCount: 2, modifiedAt: recent, outgoingLinks: ['OK'] }),
      entry({ path: '/v/ok.md', title: 'OK', wordCount: 200, modifiedAt: recent, outgoingLinks: ['2026-06-16'] }),
    ]
    const report = analyzeVaultHealth(entries, { now: NOW })
    expect(report.categories.find((c) => c.kind === 'stub')).toBeUndefined()
  })
})
