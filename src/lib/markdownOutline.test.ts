import { describe, expect, it } from 'vitest'
import {
  parseListItem,
  findItemBlock,
  detectIndentUnit,
  moveItemDown,
  moveItemUp,
  indentItem,
  outdentItem,
} from './markdownOutline'

const DOC = [
  '- alpha',        // 0
  '  - alpha one',  // 1
  '  - alpha two',  // 2
  '- beta',         // 3
  '- gamma',        // 4
]

describe('parseListItem', () => {
  it('reads indent, marker and content for bullet markers', () => {
    expect(parseListItem('- a')).toMatchObject({ indent: 0, marker: '-', content: 'a' })
    expect(parseListItem('  * b')).toMatchObject({ indent: 2, marker: '*', content: 'b' })
    expect(parseListItem('    + c')).toMatchObject({ indent: 4, marker: '+', content: 'c' })
  })

  it('reads ordered markers and task checkboxes', () => {
    expect(parseListItem('1. first')).toMatchObject({ indent: 0, marker: '1.', content: 'first' })
    expect(parseListItem('- [ ] todo')).toMatchObject({ marker: '-', content: '[ ] todo' })
  })

  it('treats a tab as one indent step', () => {
    expect(parseListItem('\t- nested')).toMatchObject({ indent: 1, marker: '-' })
  })

  it('rejects non-list lines', () => {
    expect(parseListItem('plain text')).toBeNull()
    expect(parseListItem('')).toBeNull()
    // A dash with no space is not a list item.
    expect(parseListItem('-nope')).toBeNull()
  })
})

describe('detectIndentUnit', () => {
  it('infers the step from the first nested item', () => {
    expect(detectIndentUnit(DOC)).toBe(2)
    expect(detectIndentUnit(['- a', '    - b'])).toBe(4)
  })

  it('falls back to two spaces when nothing is nested', () => {
    expect(detectIndentUnit(['- a', '- b'])).toBe(2)
  })
})

describe('findItemBlock', () => {
  it('includes the item and everything nested under it', () => {
    expect(findItemBlock(DOC, 0)).toEqual({ start: 0, end: 2 })
  })

  it('returns just the item when it has no children', () => {
    expect(findItemBlock(DOC, 3)).toEqual({ start: 3, end: 3 })
    expect(findItemBlock(DOC, 1)).toEqual({ start: 1, end: 1 })
  })

  it('returns null off a list line', () => {
    expect(findItemBlock(['text'], 0)).toBeNull()
  })
})

describe('moveItemDown / moveItemUp', () => {
  it('moves an item past its next sibling, carrying its children', () => {
    const result = moveItemDown(DOC, 0)!
    expect(result.lines).toEqual([
      '- beta',
      '- alpha',
      '  - alpha one',
      '  - alpha two',
      '- gamma',
    ])
    // Cursor follows the moved item.
    expect(result.cursorLine).toBe(1)
  })

  it('moves an item up past its previous sibling', () => {
    const result = moveItemUp(DOC, 3)!
    expect(result.lines[0]).toBe('- beta')
    expect(result.lines[1]).toBe('- alpha')
    expect(result.cursorLine).toBe(0)
  })

  it('moves among nested siblings without escaping the parent', () => {
    const result = moveItemDown(DOC, 1)!
    expect(result.lines).toEqual([
      '- alpha',
      '  - alpha two',
      '  - alpha one',
      '- beta',
      '- gamma',
    ])
  })

  it('refuses to move past the ends of the sibling run', () => {
    expect(moveItemUp(DOC, 0)).toBeNull()
    expect(moveItemDown(DOC, 4)).toBeNull()
    expect(moveItemUp(DOC, 1)).toBeNull()
    expect(moveItemDown(DOC, 2)).toBeNull()
  })

  it('renumbers ordered siblings after a move', () => {
    const ordered = ['1. one', '2. two', '3. three']
    expect(moveItemDown(ordered, 0)!.lines).toEqual(['1. two', '2. one', '3. three'])
  })
})

describe('indentItem / outdentItem', () => {
  it('indents under the previous sibling, carrying children', () => {
    const result = indentItem(DOC, 3)!
    expect(result.lines[3]).toBe('  - beta')
  })

  it('will not indent the first item of a sibling run', () => {
    expect(indentItem(DOC, 0)).toBeNull()
    expect(indentItem(DOC, 1)).toBeNull()
  })

  it('outdents an item and its children by one step', () => {
    const result = outdentItem(DOC, 1)!
    expect(result.lines[1]).toBe('- alpha one')
  })

  it('will not outdent a top-level item', () => {
    expect(outdentItem(DOC, 0)).toBeNull()
  })

  it('carries nested children along when indenting', () => {
    const doc = ['- a', '- b', '  - b1']
    const result = indentItem(doc, 1)!
    expect(result.lines).toEqual(['- a', '  - b', '    - b1'])
  })

  it('returns null off a list line', () => {
    expect(indentItem(['text'], 0)).toBeNull()
    expect(outdentItem(['text'], 0)).toBeNull()
  })
})
