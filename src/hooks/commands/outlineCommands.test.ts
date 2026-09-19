import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildOutlineCommands } from './outlineCommands'
import { MARKDOWN_OUTLINE_EDIT_EVENT } from '../../components/markdownOutlineEvents'

vi.mock('../../lib/telemetry', () => ({ trackEvent: vi.fn() }))

const base = { hasActiveNote: true, rawEditorActive: true } as const

beforeEach(() => { vi.clearAllMocks() })

describe('buildOutlineCommands', () => {
  it('offers indent, outdent and both moves', () => {
    expect(buildOutlineCommands(base).map((c) => c.id)).toEqual([
      'outline-indent', 'outline-outdent', 'outline-move-up', 'outline-move-down',
    ])
  })

  it('enables commands only in the raw editor', () => {
    const allEnabled = (config: Parameters<typeof buildOutlineCommands>[0]) =>
      buildOutlineCommands(config).every((command) => command.enabled)

    expect(allEnabled(base)).toBe(true)
    expect(allEnabled({ ...base, rawEditorActive: false })).toBe(false)
    expect(allEnabled({ ...base, hasActiveNote: false })).toBe(false)
    expect(allEnabled({ ...base, activeFileKind: 'binary' })).toBe(false)
    expect(allEnabled({ ...base, activeFileKind: 'text' })).toBe(true)
  })

  it('dispatches the matching action when executed', () => {
    const received: unknown[] = []
    const listener = (event: Event) => received.push((event as CustomEvent).detail)
    window.addEventListener(MARKDOWN_OUTLINE_EDIT_EVENT, listener)

    const commands = buildOutlineCommands(base)
    commands.find((c) => c.id === 'outline-indent')!.execute()
    commands.find((c) => c.id === 'outline-move-down')!.execute()

    window.removeEventListener(MARKDOWN_OUTLINE_EDIT_EVENT, listener)
    expect(received).toEqual([{ action: 'indent' }, { action: 'move-down' }])
  })
})
