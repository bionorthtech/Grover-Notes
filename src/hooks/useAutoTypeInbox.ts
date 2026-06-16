import { useCallback, useState } from 'react'
import type { VaultEntry } from '../types'
import { trackEvent } from '../lib/telemetry'
import {
  AUTO_TYPE_CONFIDENCE_FLOOR,
  classifiableTypes,
  selectInboxCandidates,
  type TypeSuggestion,
} from '../lib/autoTypeInbox'

export interface AutoTypeRow {
  path: string
  title: string
  currentType: string | null
  suggestedType: string
  confidence: number
}

export interface AutoTypeInboxDeps {
  entries: VaultEntry[]
  /** Classifies a note; returns null when the AI couldn't produce a valid answer. */
  classify: (note: { title: string; body: string }, vaultTypes: string[]) => Promise<TypeSuggestion | null>
  /** Reads a note's body markdown. */
  readBody: (path: string) => Promise<string>
  /** Applies a type to a note (writes the `type` frontmatter). */
  applyType: (path: string, type: string) => Promise<unknown>
  toast?: (message: string) => void
}

export interface AutoTypeInboxApi {
  running: boolean
  open: boolean
  rows: AutoTypeRow[]
  requestAutoType: () => Promise<void>
  apply: (selectedPaths: string[]) => Promise<void>
  cancel: () => void
}

/** Notes at or above this confidence are pre-selected in the review dialog. */
function withinConfidence(confidence: number): boolean {
  return confidence >= AUTO_TYPE_CONFIDENCE_FLOOR
}

/**
 * AI auto-typing of inbox notes: classify each untyped inbox note against the
 * vault's existing types (via the injected `classify`, backed by the aiTask
 * runner), then let the user review and apply the suggestions.
 */
export function useAutoTypeInbox(deps: AutoTypeInboxDeps): AutoTypeInboxApi {
  const { entries, classify, readBody, applyType, toast } = deps
  const [running, setRunning] = useState(false)
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<AutoTypeRow[]>([])

  const requestAutoType = useCallback(async () => {
    const candidates = selectInboxCandidates(entries)
    if (candidates.length === 0) {
      toast?.('No untyped inbox notes to classify.')
      return
    }
    const vaultTypes = classifiableTypes(entries)
    setRunning(true)
    try {
      const results = await Promise.all(candidates.map(async (entry) => {
        const body = await readBody(entry.path).catch(() => '')
        const suggestion = await classify({ title: entry.title || entry.filename, body }, vaultTypes).catch(() => null)
        if (!suggestion) return null
        return {
          path: entry.path,
          title: entry.title || entry.filename,
          currentType: entry.isA,
          suggestedType: suggestion.type,
          confidence: suggestion.confidence,
        } satisfies AutoTypeRow
      }))
      const found = results.filter((row): row is AutoTypeRow => row !== null)
      if (found.length === 0) {
        toast?.('Couldn’t classify any inbox notes.')
        return
      }
      setRows(found)
      setOpen(true)
    } finally {
      setRunning(false)
    }
  }, [entries, classify, readBody, toast])

  const apply = useCallback(async (selectedPaths: string[]) => {
    setOpen(false)
    const chosen = rows.filter((row) => selectedPaths.includes(row.path))
    if (chosen.length === 0) return
    await Promise.all(chosen.map((row) => applyType(row.path, row.suggestedType)))
    trackEvent('inbox_auto_typed', { count: chosen.length })
    toast?.(`Typed ${chosen.length} ${chosen.length === 1 ? 'note' : 'notes'}.`)
  }, [rows, applyType, toast])

  const cancel = useCallback(() => setOpen(false), [])

  return { running, open, rows, requestAutoType, apply, cancel }
}

export { AUTO_TYPE_CONFIDENCE_FLOOR, withinConfidence }
