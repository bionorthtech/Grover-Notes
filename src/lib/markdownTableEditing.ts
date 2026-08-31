/**
 * Cursor-aware markdown table editing.
 *
 * Sits between the pure grid model in `markdownTable.ts` and the CodeMirror
 * keymap: everything here works on plain lines plus a {line, ch} cursor, so the
 * whole interaction model is unit-testable without an editor instance.
 */

import {
  type ColumnAlignment,
  type SortDirection,
  deleteColumn,
  deleteRow,
  findTableRange,
  formatMarkdownTable,
  insertColumn,
  insertRow,
  parseMarkdownTable,
  setColumnAlignment,
  sortTableByColumn,
} from './markdownTable'

export interface Cursor {
  line: number
  ch: number
}

export interface TableEditResult {
  lines: string[]
  cursor: Cursor
}

export type TableEdit =
  | { kind: 'insert-row-below' }
  | { kind: 'insert-row-above' }
  | { kind: 'delete-row' }
  | { kind: 'insert-column-right' }
  | { kind: 'insert-column-left' }
  | { kind: 'delete-column' }
  | { kind: 'sort'; direction: SortDirection }
  | { kind: 'align'; alignment: ColumnAlignment }

/** Offsets of the unescaped `|` separators in a rendered row. */
function pipePositions(line: string): number[] {
  const positions: number[] = []
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '\\') {
      index += 1
      continue
    }
    if (line[index] === '|') positions.push(index)
  }
  return positions
}

/**
 * Which cell does column `ch` fall inside? Clamped to the first/last cell so a
 * cursor in the leading or trailing padding still resolves.
 */
export function cursorCell(line: string, ch: number): number {
  const pipes = pipePositions(line)
  if (pipes.length === 0) return 0
  // Cells live between consecutive pipes; index 0 is before the first pipe.
  let cell = 0
  for (let index = 0; index < pipes.length; index += 1) {
    if (ch > pipes[index]) cell = index
  }
  const lastCell = Math.max(0, pipes.length - 2)
  return Math.min(cell, lastCell)
}

/** Column offset that puts the cursor just inside cell `cell` of `line`. */
function cellStartColumn(line: string, cell: number): number {
  const pipes = pipePositions(line)
  const pipe = pipes[cell]
  return pipe === undefined ? line.length : pipe + 2
}

interface TableContext {
  start: number
  end: number
  /** Body-row index, or null when the cursor is on the header/delimiter. */
  bodyRow: number | null
  column: number
  table: NonNullable<ReturnType<typeof parseMarkdownTable>>
}

function tableContext(lines: string[], cursor: Cursor): TableContext | null {
  const range = findTableRange(lines, cursor.line)
  if (!range) return null
  const table = parseMarkdownTable(lines.slice(range.start, range.end + 1))
  if (!table) return null

  const offset = cursor.line - range.start
  // 0 = header, 1 = delimiter, 2+ = body.
  const bodyRow = offset >= 2 ? offset - 2 : null
  return {
    start: range.start,
    end: range.end,
    bodyRow,
    column: cursorCell(lines[cursor.line], cursor.ch),
    table,
  }
}

function spliceTable(lines: string[], context: TableContext, rendered: string[]): string[] {
  return [...lines.slice(0, context.start), ...rendered, ...lines.slice(context.end + 1)]
}

/** Reformat the table under the cursor, leaving the rest of the document alone. */
export function formatTableAt(lines: string[], line: number): { lines: string[] } | null {
  const context = tableContext(lines, { line, ch: 0 })
  if (!context) return null
  return { lines: spliceTable(lines, context, formatMarkdownTable(context.table)) }
}

/**
 * Move to the next/previous cell, wrapping across rows. Tabbing past the last
 * cell appends a new row, which is what makes tables quick to fill in.
 */
export function moveToAdjacentCell(
  lines: string[],
  cursor: Cursor,
  direction: 'next' | 'prev',
): TableEditResult | null {
  const context = tableContext(lines, cursor)
  if (!context) return null

  const { table } = context
  const columns = table.header.length
  // Flatten header + body into one cell sequence; the delimiter row is skipped.
  const rowIndex = context.bodyRow === null ? 0 : context.bodyRow + 1
  const flat = rowIndex * columns + context.column
  const target = direction === 'next' ? flat + 1 : flat - 1
  if (target < 0) return null

  let nextTable = table
  const totalRows = table.rows.length + 1
  if (target >= totalRows * columns) {
    nextTable = insertRow(table, table.rows.length)
  }

  const targetRow = Math.floor(target / columns)
  const targetColumn = target % columns
  const rendered = formatMarkdownTable(nextTable)
  // Row 0 is the header; body rows sit after the delimiter.
  const renderedIndex = targetRow === 0 ? 0 : targetRow + 1
  const nextLine = context.start + renderedIndex

  return {
    lines: spliceTable(lines, context, rendered),
    cursor: { line: nextLine, ch: cellStartColumn(rendered[renderedIndex], targetColumn) },
  }
}

function editedTable(context: TableContext, edit: TableEdit) {
  const { table, bodyRow, column } = context
  switch (edit.kind) {
    case 'insert-row-below': return insertRow(table, (bodyRow ?? -1) + 1)
    case 'insert-row-above': return insertRow(table, bodyRow ?? 0)
    case 'delete-row': return bodyRow === null ? null : deleteRow(table, bodyRow)
    case 'insert-column-right': return insertColumn(table, column + 1)
    case 'insert-column-left': return insertColumn(table, column)
    case 'delete-column': return deleteColumn(table, column)
    case 'sort': return sortTableByColumn(table, column, edit.direction)
    case 'align': return setColumnAlignment(table, column, edit.alignment)
  }
}

/**
 * Apply a structural edit to the table under the cursor. Returns null when the
 * cursor isn't in a table, or when the edit doesn't apply there (deleting a
 * row while on the header, say).
 */
export function applyTableEdit(
  lines: string[],
  cursor: Cursor,
  edit: TableEdit,
): TableEditResult | null {
  const context = tableContext(lines, cursor)
  if (!context) return null

  const next = editedTable(context, edit)
  if (!next) return null

  const rendered = formatMarkdownTable(next)
  const line = Math.min(cursor.line, context.start + rendered.length - 1)
  const column = Math.min(context.column, next.header.length - 1)
  return {
    lines: spliceTable(lines, context, rendered),
    cursor: { line, ch: cellStartColumn(rendered[line - context.start], column) },
  }
}
