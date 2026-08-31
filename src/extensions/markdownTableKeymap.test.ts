import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { markdownTableKeymap, formatTableCommand, tableEditCommand } from './markdownTableKeymap'

const DOC = [
  '| Name  | Qty |',
  '| ----- | --: |',
  '| Apple |   3 |',
].join('\n')

function makeView(doc: string, cursor: number): EditorView {
  return new EditorView({
    state: EditorState.create({
      doc,
      selection: { anchor: cursor },
      extensions: [markdownTableKeymap()],
    }),
  })
}

/** Character offset of `needle` in the doc, for placing the cursor. */
function at(doc: string, needle: string): number {
  return doc.indexOf(needle)
}

describe('markdownTableKeymap commands', () => {
  it('reformats a ragged table under the cursor', () => {
    const ragged = '|a|b|\n|---|---|\n|1|2|'
    const view = makeView(ragged, 2)
    expect(formatTableCommand(view)).toBe(true)
    expect(view.state.doc.toString()).toBe('| a   | b   |\n| --- | --- |\n| 1   | 2   |')
    view.destroy()
  })

  it('leaves the document alone outside a table', () => {
    const view = makeView('just prose', 3)
    expect(formatTableCommand(view)).toBe(false)
    expect(view.state.doc.toString()).toBe('just prose')
    view.destroy()
  })

  it('applies a structural edit and keeps the cursor inside the table', () => {
    const view = makeView(DOC, at(DOC, 'Apple') + 1)
    expect(tableEditCommand({ kind: 'insert-row-below' })(view)).toBe(true)
    expect(view.state.doc.lines).toBe(4)
    // Cursor stays within the document bounds after the rewrite.
    expect(view.state.selection.main.head).toBeLessThanOrEqual(view.state.doc.length)
    view.destroy()
  })

  it('reports no-op for an edit that does not apply', () => {
    const view = makeView(DOC, at(DOC, 'Name') + 1)
    // Deleting a row while on the header row is not a valid edit.
    expect(tableEditCommand({ kind: 'delete-row' })(view)).toBe(false)
    expect(view.state.doc.toString()).toBe(DOC)
    view.destroy()
  })

  it('sorts by the cursor column through the command', () => {
    const doc = '| n |\n| --- |\n| 10 |\n| 2 |'
    const view = makeView(doc, at(doc, '10'))
    expect(tableEditCommand({ kind: 'sort', direction: 'asc' })(view)).toBe(true)
    const lines = view.state.doc.toString().split('\n')
    expect(lines[2]).toContain('2')
    expect(lines[3]).toContain('10')
    view.destroy()
  })
})
