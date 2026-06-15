import { useCallback } from 'react'
import type { VaultEntry } from '../types'
import { trackEvent } from '../lib/telemetry'
import { findByNotePath, joinVaultPath } from '../utils/notePathIdentity'
import { buildNewEntry } from './useNoteCreation'
import {
  addDays,
  buildDailyNoteContent,
  dailyNotePath,
  dailyNoteTitle,
  parseDailyNoteDate,
  startOfToday,
} from '../utils/dailyNotes'

export interface DailyNotesDeps {
  vaultPath: string
  entries: VaultEntry[]
  /** Opens an already-existing entry in a tab. */
  openEntry: (entry: VaultEntry) => void
  /** Persists a brand-new entry to disk, caches it, adds it to state, and opens it. */
  persistAndOpen: (entry: VaultEntry, content: string) => Promise<void>
  /** Path of the currently active tab, used to navigate relative to an open daily note. */
  getActivePath: () => string | null
  toast?: (message: string) => void
}

export interface DailyNotesApi {
  /** Open (or create) the daily note for a specific date. */
  openDate: (date: Date) => Promise<void>
  /** Open (or create) today's daily note. */
  openToday: () => Promise<void>
  /** Open the daily note `deltaDays` away from the open daily note (or today). */
  openAdjacent: (deltaDays: number) => Promise<void>
  /** Dates (local midnight) that already have a daily note — for calendar highlighting. */
  existingDates: () => Date[]
}

/**
 * Daily notes: one note per calendar day at `Daily Notes/yyyy-MM-dd.md`. Opening a
 * date opens its note if it exists, otherwise creates it with a dated heading.
 */
export function useDailyNotes(deps: DailyNotesDeps): DailyNotesApi {
  const { vaultPath, entries, openEntry, persistAndOpen, getActivePath, toast } = deps

  const openDate = useCallback(async (date: Date) => {
    const fullPath = joinVaultPath(vaultPath, dailyNotePath(date))
    const existing = findByNotePath(entries, fullPath)
    if (existing) {
      openEntry(existing)
      return
    }
    const title = dailyNoteTitle(date)
    const entry = buildNewEntry({ path: fullPath, slug: title, title, type: 'Note', status: null })
    try {
      await persistAndOpen(entry, buildDailyNoteContent(date))
      trackEvent('daily_note_created')
    } catch {
      toast?.('Could not create the daily note.')
    }
  }, [vaultPath, entries, openEntry, persistAndOpen, toast])

  const openToday = useCallback(() => openDate(startOfToday()), [openDate])

  const openAdjacent = useCallback((deltaDays: number) => {
    const base = parseDailyNoteDate(getActivePath() ?? '') ?? startOfToday()
    return openDate(addDays(base, deltaDays))
  }, [getActivePath, openDate])

  const existingDates = useCallback(() => {
    const prefix = joinVaultPath(vaultPath, dailyNotePath(startOfToday())).slice(0, -('0000-00-00.md'.length))
    const dates: Date[] = []
    for (const entry of entries) {
      if (!entry.path.startsWith(prefix)) continue
      const date = parseDailyNoteDate(entry.path)
      if (date) dates.push(date)
    }
    return dates
  }, [vaultPath, entries])

  return { openDate, openToday, openAdjacent, existingDates }
}
