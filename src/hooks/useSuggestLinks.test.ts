import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/telemetry', () => ({ trackEvent: vi.fn() }))

import { trackEvent } from '../lib/telemetry'
import { useSuggestLinks, type SuggestLinksDeps } from './useSuggestLinks'
import type { VaultEntry } from '../types'

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

const alice = entry({ path: '/v/alice.md', filename: 'alice.md', title: 'Alice' })
const active = entry({ path: '/v/note.md', filename: 'note.md', title: 'Note' })

function setup(over: Partial<SuggestLinksDeps> = {}) {
  const updateFrontmatter = vi.fn(async () => undefined)
  const toast = vi.fn()
  const deps: SuggestLinksDeps = {
    entries: [active, alice],
    getActiveEntry: () => active,
    getActiveBody: () => 'Talked to Alice today.',
    updateFrontmatter,
    toast,
    ...over,
  }
  const hook = renderHook(() => useSuggestLinks(deps))
  return { hook, updateFrontmatter, toast }
}

describe('useSuggestLinks', () => {
  beforeEach(() => vi.mocked(trackEvent).mockClear())

  it('opens the dialog with the unlinked mentions it finds', () => {
    const { hook } = setup()
    act(() => hook.result.current.requestSuggestLinks())
    expect(hook.result.current.open).toBe(true)
    expect(hook.result.current.mentions.map((m) => m.path)).toEqual(['/v/alice.md'])
  })

  it('toasts and stays closed when there is nothing to link', () => {
    const { hook, toast } = setup({ getActiveBody: () => 'Nothing relevant here.' })
    act(() => hook.result.current.requestSuggestLinks())
    expect(hook.result.current.open).toBe(false)
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/no unlinked mentions/i))
  })

  it('skips notes already in related_to', () => {
    const linked = entry({ ...active, relatedTo: ['[[Alice]]'] })
    const { hook, toast } = setup({ entries: [linked, alice], getActiveEntry: () => linked })
    act(() => hook.result.current.requestSuggestLinks())
    expect(hook.result.current.open).toBe(false)
    expect(toast).toHaveBeenCalled()
  })

  it('writes chosen mentions to related_to and tracks the event', async () => {
    const { hook, updateFrontmatter } = setup()
    act(() => hook.result.current.requestSuggestLinks())
    await act(async () => { await hook.result.current.confirm(['/v/alice.md']) })
    expect(updateFrontmatter).toHaveBeenCalledWith('/v/note.md', 'related_to', ['[[Alice]]'])
    expect(trackEvent).toHaveBeenCalledWith('suggest_links_applied', { offered: 1, added: 1 })
    expect(hook.result.current.open).toBe(false)
  })

  it('merges with existing related_to without duplicating', async () => {
    const withExisting = entry({ ...active, relatedTo: ['[[Carol]]'] })
    const { hook, updateFrontmatter } = setup({ entries: [withExisting, alice], getActiveEntry: () => withExisting })
    act(() => hook.result.current.requestSuggestLinks())
    await act(async () => { await hook.result.current.confirm(['/v/alice.md']) })
    expect(updateFrontmatter).toHaveBeenCalledWith('/v/note.md', 'related_to', ['[[Carol]]', '[[Alice]]'])
  })
})
