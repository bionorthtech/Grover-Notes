import { useCallback, useState } from 'react'
import { trackEvent } from '../lib/telemetry'

export interface QuickCaptureDeps {
  /** Appends the captured text to today's daily note. */
  onCapture: (text: string) => Promise<void>
  toast?: (message: string) => void
}

export interface QuickCaptureApi {
  open: boolean
  requestCapture: () => void
  submit: (text: string) => Promise<void>
  cancel: () => void
}

/**
 * Quick capture: a global dialog for jotting a thought straight into today's
 * daily note without leaving what you're doing.
 */
export function useQuickCapture(deps: QuickCaptureDeps): QuickCaptureApi {
  const { onCapture, toast } = deps
  const [open, setOpen] = useState(false)

  const requestCapture = useCallback(() => setOpen(true), [])
  const cancel = useCallback(() => setOpen(false), [])

  const submit = useCallback(async (text: string) => {
    const trimmed = text.trim()
    setOpen(false)
    if (!trimmed) return
    try {
      await onCapture(trimmed)
      trackEvent('quick_capture_saved')
      toast?.('Captured to today’s note.')
    } catch {
      toast?.('Could not save your capture.')
    }
  }, [onCapture, toast])

  return { open, requestCapture, submit, cancel }
}
