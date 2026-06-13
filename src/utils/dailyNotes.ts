import { format } from 'date-fns'
import { dateFromParts, parseDashDateParts } from './dateStringParts'

/** Folder (relative to the vault root) where daily notes live. */
export const DAILY_NOTES_FOLDER = 'Daily Notes'

/** Canonical daily-note title/slug for a date, e.g. "2026-06-13". */
export function dailyNoteTitle(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Vault-relative path for a date's daily note, e.g. "Daily Notes/2026-06-13.md". */
export function dailyNotePath(date: Date, folder: string = DAILY_NOTES_FOLDER): string {
  const prefix = folder ? `${folder.replace(/\/+$/, '')}/` : ''
  return `${prefix}${dailyNoteTitle(date)}.md`
}

/** Human-readable heading for the note body, e.g. "Saturday, June 13, 2026". */
export function dailyNoteHeading(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy')
}

/**
 * Parses a daily-note date from a filename, title, or path. Accepts a leading
 * folder and a trailing extension; returns null if it isn't a `yyyy-MM-dd` note.
 */
export function parseDailyNoteDate(value: string): Date | null {
  const base = value.split('/').pop() ?? value
  const withoutExt = base.replace(/\.[^.]+$/, '')
  const parts = parseDashDateParts(withoutExt)
  return parts ? dateFromParts(parts) : null
}

/** True if a path/filename/title denotes a daily note. */
export function isDailyNote(value: string): boolean {
  return parseDailyNoteDate(value) !== null
}

/** Returns a copy of `date` shifted by `days` (negative = earlier), at local midnight. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** Local midnight for today. */
export function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** True if two dates fall on the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
