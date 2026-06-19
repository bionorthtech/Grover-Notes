import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVaultTasks, type VaultTasksDeps } from './useVaultTasks'
import type { VaultEntry } from '../types'

function entry(partial: Partial<VaultEntry> & { path: string }): VaultEntry {
  return {
    filename: partial.path.split('/').pop() ?? '', title: '', isA: null, aliases: [], belongsTo: [],
    relatedTo: [], status: null, archived: false, modifiedAt: null, createdAt: null, fileSize: 0,
    snippet: '', wordCount: 0, relationships: {}, icon: null, color: null, order: null,
    sidebarLabel: null, template: null, sort: null, view: null, visible: null, outgoingLinks: [], properties: {},
    ...partial,
  } as VaultEntry
}

const bodies: Record<string, string> = {
  '/v/a.md': '- [ ] alpha\n- [x] done',
  '/v/b.md': '- [ ] beta',
  '/v/t.md': '- [ ] should be ignored', // Type def
}

function setup(over: Partial<VaultTasksDeps> = {}) {
  const saveBody = vi.fn(async () => undefined)
  const deps: VaultTasksDeps = {
    entries: [
      entry({ path: '/v/a.md', title: 'A' }),
      entry({ path: '/v/b.md', title: 'B' }),
      entry({ path: '/v/t.md', title: 'T', isA: 'Type' }),
    ],
    readBody: vi.fn(async (path: string) => bodies[path] ?? ''),
    saveBody,
    ...over,
  }
  return { hook: renderHook(() => useVaultTasks(deps)), saveBody }
}

describe('useVaultTasks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('aggregates open tasks across notes, excluding Type defs', async () => {
    const { hook } = setup()
    await act(async () => { await hook.result.current.requestTasks() })
    expect(hook.result.current.open).toBe(true)
    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    expect(hook.result.current.groups.map((g) => g.title)).toEqual(['A', 'B'])
    expect(hook.result.current.groups[0].tasks).toHaveLength(1) // done hidden by default
  })

  it('reveals completed tasks when showDone is enabled', async () => {
    const { hook } = setup()
    await act(async () => { await hook.result.current.requestTasks() })
    act(() => hook.result.current.setShowDone(true))
    const groupA = hook.result.current.groups.find((g) => g.title === 'A')
    expect(groupA?.tasks).toHaveLength(2)
  })

  it('toggles a task and persists the new body', async () => {
    const { hook, saveBody } = setup()
    await act(async () => { await hook.result.current.requestTasks() })
    await act(async () => { await hook.result.current.toggle('/v/a.md', 0) })
    expect(saveBody).toHaveBeenCalledWith('/v/a.md', '- [x] alpha\n- [x] done')
    // alpha is now done, so the default (open-only) view drops it
    expect(hook.result.current.groups.find((g) => g.title === 'A')).toBeUndefined()
  })
})
