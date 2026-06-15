import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/telemetry', () => ({ trackEvent: vi.fn() }))

import { useDailyNotes, type DailyNotesDeps } from './useDailyNotes'
import { dailyNotePath } from '../utils/dailyNotes'
import { joinVaultPath } from '../utils/notePathIdentity'
import type { VaultEntry } from '../types'

const VAULT = '/v'
function fullPath(date: Date): string {
  return joinVaultPath(VAULT, dailyNotePath(date))
}

function entry(partial: Partial<VaultEntry> & { path: string }): VaultEntry {
  return {
    filename: partial.path.split('/').pop() ?? '', title: '', isA: 'Note', aliases: [], belongsTo: [],
    relatedTo: [], status: null, archived: false, modifiedAt: null, createdAt: null, fileSize: 0,
    snippet: '', wordCount: 0, relationships: {}, icon: null, color: null, order: null,
    sidebarLabel: null, template: null, sort: null, view: null, visible: null, outgoingLinks: [], properties: {},
    ...partial,
  } as VaultEntry
}

function setup(over: Partial<DailyNotesDeps> = {}) {
  const openEntry = vi.fn()
  const persistAndOpen = vi.fn(async () => undefined)
  const deps: DailyNotesDeps = {
    vaultPath: VAULT,
    entries: [],
    openEntry,
    persistAndOpen,
    getActivePath: () => null,
    toast: vi.fn(),
    ...over,
  }
  return { hook: renderHook(() => useDailyNotes(deps)), openEntry, persistAndOpen, deps }
}

describe('useDailyNotes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens an existing daily note without creating one', async () => {
    const date = new Date(2026, 5, 13)
    const existing = entry({ path: fullPath(date), title: '2026-06-13' })
    const { hook, openEntry, persistAndOpen } = setup({ entries: [existing] })
    await act(async () => { await hook.result.current.openDate(date) })
    expect(openEntry).toHaveBeenCalledWith(existing)
    expect(persistAndOpen).not.toHaveBeenCalled()
  })

  it('creates a daily note when none exists', async () => {
    const date = new Date(2026, 5, 13)
    const { hook, persistAndOpen } = setup()
    await act(async () => { await hook.result.current.openDate(date) })
    const [createdEntry, content] = persistAndOpen.mock.calls[0]
    expect(createdEntry.path).toBe(fullPath(date))
    expect(createdEntry.title).toBe('2026-06-13')
    expect(content).toContain('# Saturday, June 13, 2026')
  })

  it('navigates relative to the open daily note', async () => {
    const { hook, persistAndOpen } = setup({ getActivePath: () => fullPath(new Date(2026, 5, 13)) })
    await act(async () => { await hook.result.current.openAdjacent(1) })
    expect(persistAndOpen.mock.calls[0][0].path).toBe(fullPath(new Date(2026, 5, 14)))
  })

  it('lists existing daily-note dates for calendar highlighting', () => {
    const entries = [
      entry({ path: fullPath(new Date(2026, 5, 13)) }),
      entry({ path: fullPath(new Date(2026, 5, 10)) }),
      entry({ path: joinVaultPath(VAULT, 'Projects/not-a-daily.md') }),
    ]
    const { hook } = setup({ entries })
    const dates = hook.result.current.existingDates().map((d) => d.getDate()).sort((a, b) => a - b)
    expect(dates).toEqual([10, 13])
  })
})
