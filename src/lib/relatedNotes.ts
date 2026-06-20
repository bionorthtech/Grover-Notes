import type { VaultEntry } from '../types'

/**
 * "Related notes" — a lightweight recommender that scores other notes by how
 * much they share with the active note: direct links, shared link targets,
 * same type, and shared relationships. Deeper than backlinks (which are direct
 * links only), and pure/synchronous since it uses fields already on entries.
 */

export interface RelatedNote {
  entry: VaultEntry
  score: number
  reason: string
}

function norm(value: string): string {
  return value.trim().toLowerCase()
}

function normSet(values: string[]): Set<string> {
  return new Set(values.map(norm).filter(Boolean))
}

function intersectionCount(a: Set<string>, b: Set<string>): number {
  let count = 0
  for (const value of a) if (b.has(value)) count++
  return count
}

/** Names that resolve to a note (filename stem, title, aliases), lowercased. */
function noteNames(entry: VaultEntry): Set<string> {
  const stem = entry.filename.replace(/\.[^.]+$/, '')
  return normSet([stem, entry.title, ...entry.aliases])
}

function relationshipTargets(entry: VaultEntry): Set<string> {
  return normSet([...entry.belongsTo, ...entry.relatedTo])
}

interface ActiveContext {
  names: Set<string>
  links: Set<string>
  relationships: Set<string>
}

function scoreAgainst(active: VaultEntry, ctx: ActiveContext, other: VaultEntry): RelatedNote | null {
  const otherLinks = normSet(other.outgoingLinks)
  const otherNames = noteNames(other)

  let score = 0
  const reasons: string[] = []

  // Direct link in either direction.
  const aLinksOther = intersectionCount(ctx.links, otherNames) > 0
  const otherLinksA = intersectionCount(otherLinks, ctx.names) > 0
  if (aLinksOther || otherLinksA) { score += 3; reasons.push('linked') }

  const sharedLinks = intersectionCount(ctx.links, otherLinks)
  if (sharedLinks > 0) { score += 2 * sharedLinks; reasons.push(`${sharedLinks} shared link${sharedLinks === 1 ? '' : 's'}`) }

  if (active.isA && active.isA === other.isA) { score += 1; reasons.push(`same type`) }

  const sharedRel = intersectionCount(ctx.relationships, relationshipTargets(other))
  if (sharedRel > 0) { score += sharedRel; reasons.push('shared connections') }

  if (score === 0) return null
  return { entry: other, score, reason: reasons[0] }
}

/** Returns notes most related to `active`, highest score first. */
export function findRelatedNotes(active: VaultEntry, entries: VaultEntry[], limit = 10): RelatedNote[] {
  const ctx: ActiveContext = {
    names: noteNames(active),
    links: normSet(active.outgoingLinks),
    relationships: relationshipTargets(active),
  }
  const related: RelatedNote[] = []
  for (const other of entries) {
    if (other.path === active.path || other.archived || other.isA === 'Type') continue
    const scored = scoreAgainst(active, ctx, other)
    if (scored) related.push(scored)
  }
  return related
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit)
}
