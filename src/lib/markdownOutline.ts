/**
 * Markdown list outlining — move, indent and outdent list items together with
 * everything nested under them.
 *
 * Pure and line-based, with no editor dependency, so the whole model is
 * unit-testable; the CodeMirror layer only maps keys onto these functions.
 */

export interface ListItem {
  /** Indent width in columns; a tab counts as one step. */
  indent: number
  /** The list marker itself: `-`, `*`, `+` or an ordered marker like `12.`. */
  marker: string
  /** Everything after the marker and its trailing space. */
  content: string
}

export interface ItemBlock {
  /** The item's own line, inclusive. */
  start: number
  /** Last line nested under the item, inclusive (equals start when childless). */
  end: number
}

export interface OutlineResult {
  lines: string[]
  /** Where the edited item ended up, so the caller can follow it. */
  cursorLine: number
}

const LIST_LINE = /^([ \t]*)([-*+]|\d+[.)])[ \t]+(.*)$/
const DEFAULT_INDENT_UNIT = 2

/** Parse a single line as a list item, or null when it isn't one. */
export function parseListItem(line: string): ListItem | null {
  const match = LIST_LINE.exec(line)
  if (!match) return null
  const [, whitespace, marker, content] = match
  return { indent: indentWidth(whitespace), marker, content }
}

/** Tabs count as one step so tab- and space-indented lists both behave. */
function indentWidth(whitespace: string): number {
  return whitespace.length
}

/**
 * Infer the document's indent step from the first item nested under another.
 * Falls back to two spaces when the list is flat.
 */
export function detectIndentUnit(lines: string[]): number {
  let previousIndent: number | null = null
  for (const line of lines) {
    const item = parseListItem(line)
    if (!item) continue
    if (previousIndent !== null && item.indent > previousIndent) {
      return item.indent - previousIndent
    }
    previousIndent = item.indent
  }
  return DEFAULT_INDENT_UNIT
}

/**
 * The item at `lineIndex` plus every following line indented deeper than it —
 * its children and any wrapped continuation lines.
 */
export function findItemBlock(lines: string[], lineIndex: number): ItemBlock | null {
  const item = parseListItem(lines[lineIndex] ?? '')
  if (!item) return null

  let end = lineIndex
  for (let line = lineIndex + 1; line < lines.length; line += 1) {
    const child = parseListItem(lines[line])
    if (child) {
      if (child.indent <= item.indent) break
      end = line
      continue
    }
    // A blank line ends the block; deeper plain text is a continuation line.
    if (lines[line].trim() === '') break
    if (leadingWhitespace(lines[line]).length <= item.indent) break
    end = line
  }
  return { start: lineIndex, end }
}

function leadingWhitespace(line: string): string {
  return /^[ \t]*/.exec(line)?.[0] ?? ''
}

/** Index of the sibling block immediately before/after the one at `lineIndex`. */
function siblingLine(lines: string[], lineIndex: number, direction: 'prev' | 'next'): number | null {
  const item = parseListItem(lines[lineIndex] ?? '')
  if (!item) return null

  if (direction === 'next') {
    const block = findItemBlock(lines, lineIndex)
    if (!block) return null
    const candidate = parseListItem(lines[block.end + 1] ?? '')
    return candidate && candidate.indent === item.indent ? block.end + 1 : null
  }

  // Walk back to the nearest line at the same indent, stopping if we leave the run.
  for (let line = lineIndex - 1; line >= 0; line -= 1) {
    const candidate = parseListItem(lines[line])
    if (!candidate) {
      if (lines[line].trim() === '') return null
      continue
    }
    if (candidate.indent === item.indent) return line
    if (candidate.indent < item.indent) return null
  }
  return null
}

function spliceBlock(lines: string[], block: ItemBlock): string[] {
  return lines.slice(block.start, block.end + 1)
}

/**
 * Renumber ordered siblings at `indent` within the run containing `anchor`, so
 * a move doesn't leave `2.` sitting above `1.`.
 */
function renumberSiblings(lines: string[], anchor: number, indent: number): string[] {
  const result = [...lines]
  let counter = 0
  // Find the first line of this sibling run.
  let start = anchor
  for (let line = anchor - 1; line >= 0; line -= 1) {
    const item = parseListItem(result[line])
    if (!item) {
      if (result[line].trim() === '') break
      continue
    }
    if (item.indent < indent) break
    if (item.indent === indent) start = line
  }
  for (let line = start; line < result.length; line += 1) {
    const item = parseListItem(result[line])
    if (!item) {
      if (result[line].trim() === '') break
      continue
    }
    if (item.indent < indent) break
    if (item.indent !== indent) continue
    if (!/^\d+[.)]$/.test(item.marker)) continue
    counter += 1
    const suffix = item.marker.slice(-1)
    result[line] = `${leadingWhitespace(result[line])}${counter}${suffix} ${item.content}`
  }
  return result
}

function moveItem(lines: string[], lineIndex: number, direction: 'prev' | 'next'): OutlineResult | null {
  const block = findItemBlock(lines, lineIndex)
  const item = parseListItem(lines[lineIndex] ?? '')
  if (!block || !item) return null

  const siblingIndex = siblingLine(lines, lineIndex, direction)
  if (siblingIndex === null) return null
  const siblingBlock = findItemBlock(lines, siblingIndex)
  if (!siblingBlock) return null

  const own = spliceBlock(lines, block)
  const other = spliceBlock(lines, siblingBlock)
  const [first, second] = direction === 'next' ? [block, siblingBlock] : [siblingBlock, block]
  const reordered = direction === 'next' ? [...other, ...own] : [...own, ...other]

  const next = [...lines.slice(0, first.start), ...reordered, ...lines.slice(second.end + 1)]
  const cursorLine = direction === 'next'
    ? first.start + other.length + (lineIndex - block.start)
    : first.start + (lineIndex - block.start)

  return { lines: renumberSiblings(next, cursorLine, item.indent), cursorLine }
}

/** Move the item (and its children) below its next sibling. */
export function moveItemDown(lines: string[], lineIndex: number): OutlineResult | null {
  return moveItem(lines, lineIndex, 'next')
}

/** Move the item (and its children) above its previous sibling. */
export function moveItemUp(lines: string[], lineIndex: number): OutlineResult | null {
  return moveItem(lines, lineIndex, 'prev')
}

function shiftBlock(lines: string[], block: ItemBlock, delta: number): string[] {
  const result = [...lines]
  for (let line = block.start; line <= block.end; line += 1) {
    const whitespace = leadingWhitespace(result[line])
    const width = Math.max(0, whitespace.length + delta)
    result[line] = ' '.repeat(width) + result[line].slice(whitespace.length)
  }
  return result
}

/**
 * Nest the item under its previous sibling. Refused for the first item of a
 * run, which has nothing to nest under — same rule as Markdown itself.
 */
export function indentItem(lines: string[], lineIndex: number): OutlineResult | null {
  const block = findItemBlock(lines, lineIndex)
  if (!block) return null
  if (siblingLine(lines, lineIndex, 'prev') === null) return null
  return { lines: shiftBlock(lines, block, detectIndentUnit(lines)), cursorLine: lineIndex }
}

/** Lift the item (and its children) out one level. Refused at the top level. */
export function outdentItem(lines: string[], lineIndex: number): OutlineResult | null {
  const block = findItemBlock(lines, lineIndex)
  const item = parseListItem(lines[lineIndex] ?? '')
  if (!block || !item || item.indent === 0) return null
  const unit = Math.min(detectIndentUnit(lines), item.indent)
  return { lines: shiftBlock(lines, block, -unit), cursorLine: lineIndex }
}
