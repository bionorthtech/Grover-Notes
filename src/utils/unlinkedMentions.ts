/**
 * Finds "unlinked mentions": places in a note's body where the title or an alias
 * of another note appears as plain text but is not yet a `[[wikilink]]`. This is
 * the deterministic backbone of the link-suggestion feature; an AI pass can layer
 * semantic ("related notes") suggestions on top of it.
 */

export interface LinkTarget {
  /** Path of the note this name resolves to. */
  path: string
  /** Display name to use in the wikilink (usually the note title). */
  displayName: string
  /** Title + aliases to match against the body text. */
  names: string[]
}

export interface UnlinkedMention {
  path: string
  displayName: string
  /** The exact text matched in the body. */
  matchedText: string
  /** Character offset of the match in the original body. */
  index: number
}

/** Spans (start/end offsets) of regions that should never be matched: existing
 *  wikilinks, inline code, and fenced code blocks. */
function maskedSpans(body: string): Array<[number, number]> {
  const spans: Array<[number, number]> = []
  const patterns = [
    /\[\[[^\]]*\]\]/g, // [[wikilinks]]
    /`[^`]*`/g, // `inline code`
    /```[\s\S]*?```/g, // fenced code
    /\[[^\]]*\]\([^)]*\)/g, // [markdown](links)
  ]
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(body)) !== null) {
      spans.push([match.index, match.index + match[0].length])
    }
  }
  return spans
}

function isInsideAnySpan(index: number, end: number, spans: Array<[number, number]>): boolean {
  return spans.some(([start, stop]) => index < stop && end > start)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Returns the first unlinked mention for each target (at most one per note so the
 * suggestion list stays actionable), sorted by where they appear in the body.
 */
export function findUnlinkedMentions(body: string, targets: LinkTarget[]): UnlinkedMention[] {
  if (!body.trim() || targets.length === 0) return []
  const spans = maskedSpans(body)
  const found: UnlinkedMention[] = []
  const claimed = new Set<string>()

  for (const target of targets) {
    for (const name of target.names) {
      const trimmed = name.trim()
      if (trimmed.length < 2 || claimed.has(target.path)) continue
      const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(trimmed)}(?![\\p{L}\\p{N}])`, 'giu')
      let match: RegExpExecArray | null
      while ((match = pattern.exec(body)) !== null) {
        const start = match.index
        const end = start + match[0].length
        if (isInsideAnySpan(start, end, spans)) continue
        found.push({ path: target.path, displayName: target.displayName, matchedText: match[0], index: start })
        claimed.add(target.path)
        break
      }
    }
  }

  return found.sort((a, b) => a.index - b.index)
}

/** Replaces an unlinked mention's matched text with a `[[wikilink]]`, preserving
 *  the surrounding body. Uses the offset to target the exact occurrence. */
export function linkMention(body: string, mention: UnlinkedMention): string {
  const { index, matchedText, displayName } = mention
  if (body.slice(index, index + matchedText.length) !== matchedText) return body
  const replacement = matchedText === displayName ? `[[${displayName}]]` : `[[${displayName}|${matchedText}]]`
  return body.slice(0, index) + replacement + body.slice(index + matchedText.length)
}
