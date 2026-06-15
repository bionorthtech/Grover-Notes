import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/telemetry', () => ({ trackEvent: vi.fn() }))

import { trackEvent } from '../lib/telemetry'
import { useQuickCapture } from './useQuickCapture'

function setup(onCapture = vi.fn(async () => undefined)) {
  const toast = vi.fn()
  const hook = renderHook(() => useQuickCapture({ onCapture, toast }))
  return { hook, onCapture, toast }
}

describe('useQuickCapture', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens and closes the dialog', () => {
    const { hook } = setup()
    act(() => hook.result.current.requestCapture())
    expect(hook.result.current.open).toBe(true)
    act(() => hook.result.current.cancel())
    expect(hook.result.current.open).toBe(false)
  })

  it('captures trimmed text, closes, tracks, and toasts', async () => {
    const { hook, onCapture, toast } = setup()
    act(() => hook.result.current.requestCapture())
    await act(async () => { await hook.result.current.submit('  hello world  ') })
    expect(onCapture).toHaveBeenCalledWith('hello world')
    expect(trackEvent).toHaveBeenCalledWith('quick_capture_saved')
    expect(toast).toHaveBeenCalled()
    expect(hook.result.current.open).toBe(false)
  })

  it('ignores empty submissions without calling onCapture', async () => {
    const { hook, onCapture } = setup()
    await act(async () => { await hook.result.current.submit('   ') })
    expect(onCapture).not.toHaveBeenCalled()
  })

  it('surfaces a failure toast when capture throws', async () => {
    const failing = vi.fn(async () => { throw new Error('nope') })
    const { hook, toast } = setup(failing)
    await act(async () => { await hook.result.current.submit('boom') })
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/could not/i))
  })
})
