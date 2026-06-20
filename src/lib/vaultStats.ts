import type { VaultEntry } from '../types'
import { analyzeVaultHealth } from './noteHealth'

/**
 * Vault stats: a vault-wide overview derived entirely from data Grover already
 * stores (isA, wordCount, createdAt, outgoingLinks) plus the health analyzer.
 * Pure + synchronous.
 */

export interface TypeCount {
  type: string
  count: number
}

export interface VaultStats {
  totalNotes: number
  totalWords: number
  createdThisWeek: number
  /** Average resolved+unresolved outgoing links per note, rounded to 1 dp. */
  avgOutgoingLinks: number
  byType: TypeCount[]
  untyped: number
  orphans: number
  brokenLinks: number
}

const UNTYPED_LABEL = 'Untyped'

function isScannable(entry: VaultEntry): boolean {
  return !entry.archived && entry.isA !== 'Type'
}

function countByType(entries: VaultEntry[]): TypeCount[] {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const key = entry.isA ?? UNTYPED_LABEL
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
}

/** Computes a vault-wide overview from the current entries. */
export function computeVaultStats(entries: VaultEntry[], now: number = Date.now()): VaultStats {
  const scannable = entries.filter(isScannable)
  const total = scannable.length
  const weekAgo = Math.floor(now / 1000) - 7 * 86400
  const totalWords = scannable.reduce((sum, entry) => sum + (entry.wordCount || 0), 0)
  const totalOutgoing = scannable.reduce((sum, entry) => sum + entry.outgoingLinks.length, 0)
  const createdThisWeek = scannable.filter((entry) => entry.createdAt !== null && entry.createdAt >= weekAgo).length

  const health = analyzeVaultHealth(entries, { now })
  const issueCount = (kind: string) => health.categories.find((category) => category.kind === kind)?.notes.length ?? 0

  return {
    totalNotes: total,
    totalWords,
    createdThisWeek,
    avgOutgoingLinks: total > 0 ? Math.round((totalOutgoing / total) * 10) / 10 : 0,
    byType: countByType(scannable),
    untyped: issueCount('untyped'),
    orphans: issueCount('orphan'),
    brokenLinks: issueCount('broken-link'),
  }
}
