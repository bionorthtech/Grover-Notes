import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/telemetry', () => ({ trackEvent: vi.fn() }))

import { trackEvent } from '../lib/telemetry'
import { useAutoTypeInbox, type AutoTypeInboxDeps } from './useAutoTypeInbox'
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

function setup(over: Partial<AutoTypeInboxDeps> = {}) {
  const applyType = vi.fn(async () => undefined)
  const toast = vi.fn()
  const deps: AutoTypeInboxDeps = {
    entries: [entry({ path: '/v/a.md', title: 'Sprint notes', isA: null })],
    classify: vi.fn(async () => ({ type: 'Project', confidence: 0.9 })),
    readBody: vi.fn(async () => 'body text'),
    applyType,
    toast,
    ...over,
  }
  return { hook: renderHook(() => useAutoTypeInbox(deps)), applyType, toast, deps }
}

describe('useAutoTypeInbox', () => {
  beforeEach(() => vi.clearAllMocks())

  it('classifies candidates and opens the review dialog', async () => {
    const { hook } = setup()
    await act(async () => { await hook.result.current.requestAutoType() })
    expect(hook.result.current.open).toBe(true)
    expect(hook.result.current.rows).toEqual([
      { path: '/v/a.md', title: 'Sprint notes', currentType: null, suggestedType: 'Project', confidence: 0.9 },
    ])
  })

  it('toasts and stays closed when there are no untyped inbox notes', async () => {
    const { hook, toast } = setup({ entries: [entry({ path: '/v/typed.md', isA: 'Project' })] })
    await act(async () => { await hook.result.current.requestAutoType() })
    expect(hook.result.current.open).toBe(false)
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/no untyped/i))
  })

  it('skips notes the AI could not classify', async () => {
    const { hook, toast } = setup({ classify: vi.fn(async () => null) })
    await act(async () => { await hook.result.current.requestAutoType() })
    expect(hook.result.current.open).toBe(false)
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/couldn.t classify/i))
  })

  it('applies the selected suggestions and tracks the event', async () => {
    const { hook, applyType } = setup()
    await act(async () => { await hook.result.current.requestAutoType() })
    await act(async () => { await hook.result.current.apply(['/v/a.md']) })
    expect(applyType).toHaveBeenCalledWith('/v/a.md', 'Project')
    expect(trackEvent).toHaveBeenCalledWith('inbox_auto_typed', { count: 1 })
    expect(hook.result.current.open).toBe(false)
  })

  it('clears the running flag after completion', async () => {
    const { hook } = setup()
    await act(async () => { await hook.result.current.requestAutoType() })
    await waitFor(() => expect(hook.result.current.running).toBe(false))
  })
})
