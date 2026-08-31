import { describe, expect, it } from 'vitest'
import {
  parseMarkdownTable,
  formatMarkdownTable,
  findTableRange,
  sortTableByColumn,
  insertRow,
  deleteRow,
  insertColumn,
  deleteColumn,
  setColumnAlignment,
  cellWidth,
} from './markdownTable'

const SIMPLE = [
  '| Name | Qty |',
  '| --- | ---: |',
  '| Apple | 3 |',
  '| Fig | 12 |',
]

describe('parseMarkdownTable', () => {
  it('reads header, alignments and rows', () => {
    const table = parseMarkdownTable(SIMPLE)!
    expect(table.header).toEqual(['Name', 'Qty'])
    expect(table.alignments).toEqual(['none', 'right'])
    expect(table.rows).toEqual([['Apple', '3'], ['Fig', '12']])
  })

  it('reads every alignment marker', () => {
    const table = parseMarkdownTable(['| a | b | c | d |', '| :-- | :-: | --: | --- |'])!
    expect(table.alignments).toEqual(['left', 'center', 'right', 'none'])
  })

  it('tolerates missing outer pipes and ragged rows', () => {
    const table = parseMarkdownTable(['a | b', '--- | ---', '1'])!
    expect(table.header).toEqual(['a', 'b'])
    // Short rows are padded so the grid stays rectangular.
    expect(table.rows).toEqual([['1', '']])
  })

  it('does not split on escaped pipes', () => {
    const table = parseMarkdownTable(['| a | b |', '| --- | --- |', String.raw`| x \| y | z |`])!
    expect(table.rows[0]).toEqual([String.raw`x \| y`, 'z'])
  })

  it('rejects non-tables', () => {
    expect(parseMarkdownTable(['just text'])).toBeNull()
    expect(parseMarkdownTable(['| a |'])).toBeNull()
    // Second line must be a delimiter row.
    expect(parseMarkdownTable(['| a |', '| b |'])).toBeNull()
  })
})

describe('formatMarkdownTable', () => {
  it('pads columns to an even width and preserves alignment markers', () => {
    const formatted = formatMarkdownTable(parseMarkdownTable(SIMPLE)!)
    expect(formatted).toEqual([
      '| Name  | Qty |',
      '| ----- | --: |',
      '| Apple |   3 |',
      '| Fig   |  12 |',
    ])
  })

  it('centres and left-aligns according to the delimiter row', () => {
    const table = parseMarkdownTable(['| a | b |', '| :-: | :-- |', '| longer | x |'])!
    expect(formatMarkdownTable(table)).toEqual([
      '|   a    | b   |',
      '| :----: | :-- |',
      '| longer | x   |',
    ])
  })

  it('round-trips: formatting an already formatted table is stable', () => {
    const once = formatMarkdownTable(parseMarkdownTable(SIMPLE)!)
    const twice = formatMarkdownTable(parseMarkdownTable(once)!)
    expect(twice).toEqual(once)
  })

  it('aligns using display width so CJK columns line up', () => {
    const table = parseMarkdownTable(['| a | b |', '| --- | --- |', '| 笔记 | x |'])!
    const formatted = formatMarkdownTable(table)
    // "笔记" is 4 columns wide, so column a pads to 4. Column b keeps the
    // 3-char minimum that the `---` delimiter needs.
    expect(formatted[0]).toBe('| a    | b   |')
    expect(formatted[1]).toBe('| ---- | --- |')
    expect(formatted[2]).toBe('| 笔记 | x   |')
  })
})

describe('cellWidth', () => {
  it('counts CJK and emoji as double width', () => {
    expect(cellWidth('ab')).toBe(2)
    expect(cellWidth('笔记')).toBe(4)
    expect(cellWidth('あ')).toBe(2)
  })

  it('ignores zero-width combining marks', () => {
    expect(cellWidth('é')).toBe(1)
  })
})

describe('findTableRange', () => {
  const doc = ['intro', '', '| a | b |', '| --- | --- |', '| 1 | 2 |', '', 'outro']

  it('finds the table containing the cursor line', () => {
    expect(findTableRange(doc, 3)).toEqual({ start: 2, end: 4 })
    expect(findTableRange(doc, 2)).toEqual({ start: 2, end: 4 })
    expect(findTableRange(doc, 4)).toEqual({ start: 2, end: 4 })
  })

  it('returns null outside a table', () => {
    expect(findTableRange(doc, 0)).toBeNull()
    expect(findTableRange(doc, 6)).toBeNull()
  })
})

describe('row and column editing', () => {
  const table = () => parseMarkdownTable(SIMPLE)!

  it('inserts and deletes rows', () => {
    expect(insertRow(table(), 1).rows).toEqual([['Apple', '3'], ['', ''], ['Fig', '12']])
    expect(deleteRow(table(), 0).rows).toEqual([['Fig', '12']])
    // Deleting the last remaining row leaves an empty row, never a broken table.
    const single = deleteRow(deleteRow(table(), 0), 0)
    expect(single.rows).toEqual([['', '']])
  })

  it('inserts and deletes columns, keeping alignments in step', () => {
    const added = insertColumn(table(), 1)
    expect(added.header).toEqual(['Name', '', 'Qty'])
    expect(added.alignments).toEqual(['none', 'none', 'right'])
    expect(added.rows[0]).toEqual(['Apple', '', '3'])

    const removed = deleteColumn(table(), 0)
    expect(removed.header).toEqual(['Qty'])
    expect(removed.alignments).toEqual(['right'])
    expect(removed.rows).toEqual([['3'], ['12']])
  })

  it('never deletes the final column', () => {
    const oneColumn = deleteColumn(table(), 0)
    expect(deleteColumn(oneColumn, 0)).toEqual(oneColumn)
  })

  it('sets column alignment', () => {
    expect(setColumnAlignment(table(), 0, 'center').alignments).toEqual(['center', 'right'])
  })
})

describe('sortTableByColumn', () => {
  const table = () => parseMarkdownTable(SIMPLE)!

  it('sorts numerically when the column is all numbers', () => {
    expect(sortTableByColumn(table(), 1, 'asc').rows).toEqual([['Apple', '3'], ['Fig', '12']])
    expect(sortTableByColumn(table(), 1, 'desc').rows).toEqual([['Fig', '12'], ['Apple', '3']])
  })

  it('sorts text case-insensitively', () => {
    const t = parseMarkdownTable(['| x |', '| --- |', '| beta |', '| Alpha |'])!
    expect(sortTableByColumn(t, 0, 'asc').rows).toEqual([['Alpha'], ['beta']])
  })

  it('leaves the table untouched for an out-of-range column', () => {
    expect(sortTableByColumn(table(), 9, 'asc').rows).toEqual(table().rows)
  })
})
