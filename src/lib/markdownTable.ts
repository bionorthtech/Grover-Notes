/**
 * Markdown table parsing, formatting and editing — pure and synchronous.
 *
 * Kept free of any editor dependency so the whole grid model is unit-testable;
 * the CodeMirror layer only maps keys and selections onto these functions.
 */

export type ColumnAlignment = 'none' | 'left' | 'center' | 'right'
export type SortDirection = 'asc' | 'desc'

export interface MarkdownTable {
  header: string[]
  alignments: ColumnAlignment[]
  rows: string[][]
}

export interface TableRange {
  /** First line of the table (the header row), inclusive. */
  start: number
  /** Last line of the table, inclusive. */
  end: number
}

const DELIMITER_CELL = /^:?-+:?$/

/**
 * Display width of a cell, so columns line up in a monospaced editor.
 * East Asian Wide/Fullwidth characters and emoji occupy two columns; combining
 * marks occupy none. Without this, CJK tables look ragged after formatting.
 */
export function cellWidth(text: string): number {
  let width = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (isZeroWidth(code)) continue
    width += isWideCodePoint(code) ? 2 : 1
  }
  return width
}

function isZeroWidth(code: number): boolean {
  return (
    (code >= 0x0300 && code <= 0x036f) || // combining diacritical marks
    (code >= 0x200b && code <= 0x200f) || // zero-width space/joiners
    code === 0xfeff
  )
}

function isWideCodePoint(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2e80 && code <= 0xa4cf) || // CJK radicals … Yi
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul syllables
    (code >= 0xf900 && code <= 0xfaff) || // CJK compatibility ideographs
    (code >= 0xfe30 && code <= 0xfe6f) || // CJK compatibility forms
    (code >= 0xff00 && code <= 0xff60) || // fullwidth forms
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1f9ff) || // emoji
    (code >= 0x20000 && code <= 0x3fffd) // CJK extension planes
  )
}

/** Split a table row on unescaped pipes, dropping the outer delimiters. */
function splitRow(line: string): string[] {
  const cells: string[] = []
  let current = ''
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '\\' && line[index + 1] === '|') {
      current += '\\|'
      index += 1
      continue
    }
    if (char === '|') {
      cells.push(current)
      current = ''
      continue
    }
    current += char
  }
  cells.push(current)
  // A leading/trailing pipe produces an empty first/last cell — drop those.
  if (cells.length && cells[0].trim() === '' && line.trimStart().startsWith('|')) cells.shift()
  if (cells.length && cells[cells.length - 1].trim() === '' && line.trimEnd().endsWith('|')) cells.pop()
  return cells.map((cell) => cell.trim())
}

function parseAlignment(cell: string): ColumnAlignment {
  const left = cell.startsWith(':')
  const right = cell.endsWith(':')
  if (left && right) return 'center'
  if (left) return 'left'
  if (right) return 'right'
  return 'none'
}

/** True when a line is a table delimiter row (`| --- | :-: |`). */
function isDelimiterRow(line: string): boolean {
  const cells = splitRow(line)
  return cells.length > 0 && cells.every((cell) => DELIMITER_CELL.test(cell))
}

/** True when a line could belong to a table body. */
function isTableLine(line: string): boolean {
  return line.includes('|')
}

/** Pad or trim a row so every row has exactly `width` cells. */
function toWidth(cells: string[], width: number): string[] {
  const padded = cells.slice(0, width)
  while (padded.length < width) padded.push('')
  return padded
}

/**
 * Parse consecutive lines into a table. Returns null when `lines` isn't a
 * table: it needs a header, a delimiter row, and matching column counts.
 */
export function parseMarkdownTable(lines: string[]): MarkdownTable | null {
  if (lines.length < 2) return null
  if (!isTableLine(lines[0]) || !isDelimiterRow(lines[1])) return null

  const header = splitRow(lines[0])
  const alignments = splitRow(lines[1]).map(parseAlignment)
  if (header.length === 0) return null

  const width = Math.max(header.length, alignments.length)
  return {
    header: toWidth(header, width),
    alignments: toWidth(alignments, width).map((value) => (value || 'none') as ColumnAlignment),
    // Body rows are taken as given: `findTableRange` already decided where the
    // table ends, so a ragged row without pipes is still a (short) row here.
    rows: lines.slice(2).filter((line) => line.trim() !== '').map((line) => toWidth(splitRow(line), width)),
  }
}

function delimiterCell(alignment: ColumnAlignment, width: number): string {
  // Every marker needs at least `---`, plus room for the colons.
  const dashes = '-'.repeat(Math.max(3, width))
  switch (alignment) {
    case 'left': return `:${dashes.slice(1)}`
    case 'right': return `${dashes.slice(1)}:`
    case 'center': return `:${dashes.slice(2)}:`
    default: return dashes
  }
}

function padCell(text: string, width: number, alignment: ColumnAlignment): string {
  const padding = Math.max(0, width - cellWidth(text))
  if (alignment === 'right') return ' '.repeat(padding) + text
  if (alignment === 'center') {
    const left = Math.floor(padding / 2)
    return ' '.repeat(left) + text + ' '.repeat(padding - left)
  }
  return text + ' '.repeat(padding)
}

/** Render a table back to aligned markdown lines. */
export function formatMarkdownTable(table: MarkdownTable): string[] {
  const widths = table.header.map((_, column) => {
    const cells = [table.header[column], ...table.rows.map((row) => row[column] ?? '')]
    // 3 keeps the delimiter row's `---` from forcing a wider column than the data.
    return Math.max(3, ...cells.map(cellWidth))
  })

  const renderRow = (cells: string[]) =>
    `| ${cells.map((cell, column) => padCell(cell ?? '', widths[column], table.alignments[column])).join(' | ')} |`

  return [
    renderRow(table.header),
    `| ${table.alignments.map((alignment, column) => delimiterCell(alignment, widths[column])).join(' | ')} |`,
    ...table.rows.map(renderRow),
  ]
}

/**
 * Find the table containing `lineIndex`, scanning outward from that line.
 * Returns null when the cursor isn't inside a well-formed table.
 */
export function findTableRange(lines: string[], lineIndex: number): TableRange | null {
  if (lineIndex < 0 || lineIndex >= lines.length || !isTableLine(lines[lineIndex])) return null

  let start = lineIndex
  while (start > 0 && isTableLine(lines[start - 1])) start -= 1
  let end = lineIndex
  while (end < lines.length - 1 && isTableLine(lines[end + 1])) end += 1

  // Only a real table (header + delimiter) counts.
  if (end - start < 1 || !isDelimiterRow(lines[start + 1])) return null
  return { start, end }
}

export function insertRow(table: MarkdownTable, index: number): MarkdownTable {
  const rows = [...table.rows]
  rows.splice(clamp(index, 0, rows.length), 0, table.header.map(() => ''))
  return { ...table, rows }
}

/** Delete a row, keeping at least one (empty) row so the table stays valid. */
export function deleteRow(table: MarkdownTable, index: number): MarkdownTable {
  if (index < 0 || index >= table.rows.length) return table
  const rows = table.rows.filter((_, position) => position !== index)
  return { ...table, rows: rows.length ? rows : [table.header.map(() => '')] }
}

export function insertColumn(table: MarkdownTable, index: number): MarkdownTable {
  const at = clamp(index, 0, table.header.length)
  const withCell = (cells: string[], value: string) => {
    const next = [...cells]
    next.splice(at, 0, value)
    return next
  }
  return {
    header: withCell(table.header, ''),
    alignments: withCell(table.alignments, 'none') as ColumnAlignment[],
    rows: table.rows.map((row) => withCell(row, '')),
  }
}

/** Delete a column, refusing to remove the last one. */
export function deleteColumn(table: MarkdownTable, index: number): MarkdownTable {
  if (table.header.length <= 1 || index < 0 || index >= table.header.length) return table
  const without = <T,>(cells: T[]) => cells.filter((_, position) => position !== index)
  return {
    header: without(table.header),
    alignments: without(table.alignments),
    rows: table.rows.map(without),
  }
}

export function setColumnAlignment(
  table: MarkdownTable,
  index: number,
  alignment: ColumnAlignment,
): MarkdownTable {
  if (index < 0 || index >= table.alignments.length) return table
  const alignments = [...table.alignments]
  alignments[index] = alignment
  return { ...table, alignments }
}

function compareCells(left: string, right: string): number {
  const leftNumber = Number(left)
  const rightNumber = Number(right)
  const bothNumeric = left.trim() !== '' && right.trim() !== ''
    && Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
  if (bothNumeric) return leftNumber - rightNumber
  return left.localeCompare(right, undefined, { sensitivity: 'base' })
}

/** Sort body rows by a column, comparing numerically when both cells are numbers. */
export function sortTableByColumn(
  table: MarkdownTable,
  column: number,
  direction: SortDirection,
): MarkdownTable {
  if (column < 0 || column >= table.header.length) return table
  const factor = direction === 'desc' ? -1 : 1
  const rows = [...table.rows].sort(
    (left, right) => factor * compareCells(left[column] ?? '', right[column] ?? ''),
  )
  return { ...table, rows }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
