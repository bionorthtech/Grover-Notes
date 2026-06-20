import type { VaultEntry } from '../types'
import { isDailyNote } from '../utils/dailyNotes'

/**
 * Vault health report: surfaces fixable issues using signals Grover already
 * captures per note (hasH1, wordCount, isA, modifiedAt, outgoingLinks). Pure and
 * synchronous — no extra I/O, since everything needed is on the entries.
 */

export type HealthIssueKind = 'untyped' | 'missing-h1' | 'stub' | 'stale' | 'orphan' | 'broken-link'

export interface HealthCategory {
  kind: HealthIssueKind
  label: string
  description: string
  notes: VaultEntry[]
}

export interface VaultHealthReport {
  scanned: number
  healthy: number
  categories: HealthCategory[]
}

export interface HealthOptions {
  now?: number
  staleDays?: number
  stubWords?: number
}

const CATEGORY_META: Record<HealthIssueKind, { label: string; description: string }> = {
  untyped: { label: 'Untyped', description: 'Notes without a type — classify them so they show up in the right places.' },
  'missing-h1': { label: 'Missing heading', description: 'Notes with no top-level # heading.' },
  stub: { label: 'Stubs', description: 'Very short notes that may need fleshing out.' },
  stale: { label: 'Stale', description: 'Not touched in a long time — worth a review or archive.' },
  orphan: { label: 'Orphans', description: 'No links in or out — disconnected from the rest of the vault.' },
  'broken-link': { label: 'Broken links', description: 'Wikilinks that don’t resolve to any note.' },
}

const ORDER: HealthIssueKind[] = ['untyped', 'missing-h1', 'stub', 'stale', 'orphan', 'broken-link']

function linkKey(value: string): string {
  return value.trim().toLowerCase()
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '')
}

/** Maps every link-target spelling (slug / title / alias) to a note path. */
function buildResolver(entries: VaultEntry[]): Map<string, string> {
  const resolver = new Map<string, string>()
  for (const entry of entries) {
    for (const candidate of [stripExtension(entry.filename), entry.title, ...entry.aliases]) {
      const key = linkKey(candidate)
      if (key && !resolver.has(key)) resolver.set(key, entry.path)
    }
  }
  return resolver
}

function isScannable(entry: VaultEntry): boolean {
  return !entry.archived && entry.isA !== 'Type'
}

/** Builds the set of note paths that are the target of at least one resolved link. */
function incomingLinkedPaths(entries: VaultEntry[], resolver: Map<string, string>): Set<string> {
  const linked = new Set<string>()
  for (const entry of entries) {
    for (const link of entry.outgoingLinks) {
      const target = resolver.get(linkKey(link))
      if (target && target !== entry.path) linked.add(target)
    }
  }
  return linked
}

function issuesFor(
  entry: VaultEntry,
  ctx: { resolver: Map<string, string>; incoming: Set<string>; staleBefore: number; stubWords: number },
): HealthIssueKind[] {
  const issues: HealthIssueKind[] = []
  if (entry.isA === null) issues.push('untyped')
  if (entry.hasH1 === false) issues.push('missing-h1')
  if (!isDailyNote(entry.path) && entry.wordCount < ctx.stubWords) issues.push('stub')
  if (entry.modifiedAt !== null && entry.modifiedAt < ctx.staleBefore) issues.push('stale')

  const resolvedOut = entry.outgoingLinks.filter((link) => ctx.resolver.get(linkKey(link)))
  if (entry.outgoingLinks.length > resolvedOut.length) issues.push('broken-link')
  if (resolvedOut.length === 0 && !ctx.incoming.has(entry.path)) issues.push('orphan')
  return issues
}

/** Analyses the vault and groups notes by the issues they have. */
export function analyzeVaultHealth(entries: VaultEntry[], options: HealthOptions = {}): VaultHealthReport {
  const { now = Date.now(), staleDays = 180, stubWords = 15 } = options
  const staleBefore = Math.floor(now / 1000) - staleDays * 86400
  const resolver = buildResolver(entries)
  const incoming = incomingLinkedPaths(entries, resolver)
  const scannable = entries.filter(isScannable)

  const buckets = new Map<HealthIssueKind, VaultEntry[]>(ORDER.map((kind) => [kind, []]))
  let healthy = 0
  for (const entry of scannable) {
    const issues = issuesFor(entry, { resolver, incoming, staleBefore, stubWords })
    if (issues.length === 0) healthy++
    for (const kind of issues) buckets.get(kind)!.push(entry)
  }

  const categories = ORDER
    .map((kind) => ({ kind, ...CATEGORY_META[kind], notes: buckets.get(kind)! }))
    .filter((category) => category.notes.length > 0)

  return { scanned: scannable.length, healthy, categories }
}

/** Serializes a health report as shareable markdown. */
export function formatHealthReportMarkdown(report: VaultHealthReport): string {
  const pct = report.scanned > 0 ? Math.round((report.healthy / report.scanned) * 100) : 100
  const lines = ['# Vault health', '', `${report.healthy} of ${report.scanned} notes healthy (${pct}%).`]
  for (const category of report.categories) {
    lines.push('', `## ${category.label} (${category.notes.length})`)
    for (const note of category.notes) lines.push(`- ${note.title || note.filename}`)
  }
  return `${lines.join('\n')}\n`
}
