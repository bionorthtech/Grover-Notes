import type { VaultEntry } from '../types'

/**
 * Duplicate detection: groups notes that share a normalized title so users can
 * spot and merge accidental copies (common after imports or across workspaces).
 * Pure + synchronous — uses only titles already on the entries.
 */

export interface DuplicateGroup {
  /** The shared, human-readable title (from the first note in the group). */
  title: string
  notes: VaultEntry[]
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isCandidate(entry: VaultEntry): boolean {
  return !entry.archived && entry.isA !== 'Type' && entry.title.trim().length > 0
}

/**
 * Returns groups of 2+ notes sharing a normalized title, largest groups first.
 * Each group preserves entry order; the displayed title comes from the first note.
 */
export function findDuplicateNotes(entries: VaultEntry[]): DuplicateGroup[] {
  const buckets = new Map<string, VaultEntry[]>()
  for (const entry of entries) {
    if (!isCandidate(entry)) continue
    const key = normalizeTitle(entry.title)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(entry)
  }
  return [...buckets.values()]
    .filter((notes) => notes.length > 1)
    .map((notes) => ({ title: notes[0].title, notes }))
    .sort((a, b) => b.notes.length - a.notes.length || a.title.localeCompare(b.title))
}
