import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildTableCommands } from './tableCommands'
import { MARKDOWN_TABLE_EDIT_EVENT } from '../../components/markdownTableEvents'

vi.mock('../../lib/telemetry', () => ({ trackEvent: vi.fn() }))

const base = { hasActiveNote: true, rawEditorActive: true } as const

beforeEach(() => { vi.clearAllMocks() })

describe('buildTableCommands', () => {
  it('offers the full set of table actions', () => {
    const ids = buildTableCommands(base).map((command) => command.id)
    expect(ids).toContain('table-format')
    expect(ids).toContain('table-insert-row-below')
    expect(ids).toContain('table-delete-column')
    expect(ids).toContain('table-sort-desc')
    expect(ids).toContain('table-align-center')
    expect(ids).toHaveLength(12)
  })

  it('enables commands only in the raw editor', () => {
    const enabled = (config: Parameters<typeof buildTableCommands>[0]) =>
      buildTableCommands(config).every((command) => command.enabled)

    expect(enabled(base)).toBe(true)
    // The rich editor has its own table block, and these edits cannot reach it.
    expect(enabled({ ...base, rawEditorActive: false })).toBe(false)
    expect(enabled({ ...base, hasActiveNote: false })).toBe(false)
    expect(enabled({ ...base, activeFileKind: 'binary' })).toBe(false)
  })

  it('stays enabled for plain text notes, which are edited raw', () => {
    expect(buildTableCommands({ ...base, activeFileKind: 'text' }).every((c) => c.enabled)).toBe(true)
  })

  it('dispatches the matching edit request when executed', () => {
    const received: unknown[] = []
    const listener = (event: Event) => received.push((event as CustomEvent).detail)
    window.addEventListener(MARKDOWN_TABLE_EDIT_EVENT, listener)

    const commands = buildTableCommands(base)
    commands.find((c) => c.id === 'table-format')!.execute()
    commands.find((c) => c.id === 'table-sort-desc')!.execute()

    window.removeEventListener(MARKDOWN_TABLE_EDIT_EVENT, listener)
    expect(received).toEqual([
      { format: true },
      { edit: { kind: 'sort', direction: 'desc' } },
    ])
  })
})
