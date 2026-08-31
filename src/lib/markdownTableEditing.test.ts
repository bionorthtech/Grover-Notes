import { describe, expect, it } from 'vitest'
import { parseMarkdownTable } from './markdownTable'
import {
  cursorCell,
  formatTableAt,
  moveToAdjacentCell,
  applyTableEdit,
} from './markdownTableEditing'

// line 0 header, 1 delimiter, 2..3 body
const DOC = [
  '| Name  | Qty |',
  '| ----- | --: |',
  '| Apple |   3 |',
  '| Fig   |  12 |',
]

describe('cursorCell', () => {
  it('maps a cursor column to the cell it sits in', () => {
    expect(cursorCell(DOC[0], 3)).toBe(0)   // inside "Name"
    expect(cursorCell(DOC[0], 11)).toBe(1)  // inside "Qty"
  })

  it('clamps before the first and after the last cell', () => {
    expect(cursorCell(DOC[0], 0)).toBe(0)
    expect(cursorCell(DOC[0], 999)).toBe(1)
  })

  it('is not confused by escaped pipes', () => {
    const line = String.raw`| a \| b | c |`
    expect(cursorCell(line, 6)).toBe(0)
    expect(cursorCell(line, 12)).toBe(1)
  })
})

describe('formatTableAt', () => {
  it('reformats a ragged table in place and leaves the rest of the doc alone', () => {
    const lines = ['before', '|a|b|', '|---|---|', '|1|22|', 'after']
    const result = formatTableAt(lines, 2)!
    expect(result.lines).toEqual([
      'before',
      '| a   | b   |',
      '| --- | --- |',
      '| 1   | 22  |',
      'after',
    ])
  })

  it('returns null when the cursor is not in a table', () => {
    expect(formatTableAt(['plain text'], 0)).toBeNull()
  })
})

describe('moveToAdjacentCell', () => {
  it('moves forward across cells and wraps to the next row', () => {
    const first = moveToAdjacentCell(DOC, { line: 2, ch: 3 }, 'next')!
    expect(first.cursor.line).toBe(2)
    // Lands inside the second cell of the same row.
    expect(cursorCell(first.lines[2], first.cursor.ch)).toBe(1)

    const wrapped = moveToAdjacentCell(DOC, { line: 2, ch: 12 }, 'next')!
    expect(wrapped.cursor.line).toBe(3)
    expect(cursorCell(wrapped.lines[3], wrapped.cursor.ch)).toBe(0)
  })

  it('moves backward and wraps to the previous row, skipping the delimiter', () => {
    const back = moveToAdjacentCell(DOC, { line: 3, ch: 3 }, 'prev')!
    expect(back.cursor.line).toBe(2)
    expect(cursorCell(back.lines[2], back.cursor.ch)).toBe(1)
  })

  it('appends a new row when tabbing past the last cell', () => {
    const appended = moveToAdjacentCell(DOC, { line: 3, ch: 12 }, 'next')!
    expect(appended.lines).toHaveLength(DOC.length + 1)
    expect(appended.cursor.line).toBe(4)
    expect(cursorCell(appended.lines[4], appended.cursor.ch)).toBe(0)
  })

  it('stays put at the very first cell when moving backward', () => {
    expect(moveToAdjacentCell(DOC, { line: 0, ch: 2 }, 'prev')).toBeNull()
  })

  it('returns null outside a table', () => {
    expect(moveToAdjacentCell(['text'], { line: 0, ch: 0 }, 'next')).toBeNull()
  })
})

describe('applyTableEdit', () => {
  it('inserts an empty row below the cursor row', () => {
    const result = applyTableEdit(DOC, { line: 2, ch: 3 }, { kind: 'insert-row-below' })!
    expect(result.lines).toHaveLength(5)
    const table = parseMarkdownTable(result.lines)!
    expect(table.rows).toEqual([['Apple', '3'], ['', ''], ['Fig', '12']])
  })

  it('deletes the cursor row', () => {
    const result = applyTableEdit(DOC, { line: 2, ch: 3 }, { kind: 'delete-row' })!
    expect(result.lines).toHaveLength(3)
    expect(result.lines[2]).toContain('Fig')
  })

  it('refuses to delete the header row', () => {
    expect(applyTableEdit(DOC, { line: 0, ch: 3 }, { kind: 'delete-row' })).toBeNull()
  })

  it('inserts and deletes columns at the cursor', () => {
    const added = applyTableEdit(DOC, { line: 2, ch: 3 }, { kind: 'insert-column-right' })!
    const addedTable = parseMarkdownTable(added.lines)!
    expect(addedTable.header).toEqual(['Name', '', 'Qty'])
    expect(addedTable.rows[0]).toEqual(['Apple', '', '3'])

    const removed = applyTableEdit(DOC, { line: 2, ch: 3 }, { kind: 'delete-column' })!
    expect(removed.lines[0]).toBe('| Qty |')
  })

  it('sorts by the cursor column', () => {
    const desc = applyTableEdit(DOC, { line: 2, ch: 11 }, { kind: 'sort', direction: 'desc' })!
    expect(desc.lines[2]).toContain('12')
    expect(desc.lines[3]).toContain('3')
  })

  it('sets the alignment of the cursor column', () => {
    const centred = applyTableEdit(DOC, { line: 2, ch: 3 }, { kind: 'align', alignment: 'center' })!
    expect(centred.lines[1]).toMatch(/\|\s*:-+:\s*\|/)
  })

  it('returns null outside a table', () => {
    expect(applyTableEdit(['text'], { line: 0, ch: 0 }, { kind: 'delete-row' })).toBeNull()
  })
})
