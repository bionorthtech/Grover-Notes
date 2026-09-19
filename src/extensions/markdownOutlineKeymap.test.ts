import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  markdownOutlineKeymap,
  indentListItemCommand,
  outdentListItemCommand,
  moveListItemUpCommand,
  moveListItemDownCommand,
} from './markdownOutlineKeymap'

const DOC = ['- alpha', '  - alpha one', '- beta'].join('\n')

function makeView(doc: string, cursor: number): EditorView {
  return new EditorView({
    state: EditorState.create({ doc, selection: { anchor: cursor }, extensions: [markdownOutlineKeymap()] }),
  })
}

describe('markdownOutlineKeymap commands', () => {
  it('indents an item under its previous sibling', () => {
    const view = makeView(DOC, DOC.indexOf('beta'))
    expect(indentListItemCommand(view)).toBe(true)
    expect(view.state.doc.toString().split('\n')[2]).toBe('  - beta')
    view.destroy()
  })

  it('outdents a nested item', () => {
    const view = makeView(DOC, DOC.indexOf('alpha one'))
    expect(outdentListItemCommand(view)).toBe(true)
    expect(view.state.doc.toString().split('\n')[1]).toBe('- alpha one')
    view.destroy()
  })

  it('moves an item and follows it with the caret', () => {
    const view = makeView(DOC, DOC.indexOf('alpha'))
    expect(moveListItemDownCommand(view)).toBe(true)
    const lines = view.state.doc.toString().split('\n')
    expect(lines[0]).toBe('- beta')
    expect(lines[1]).toBe('- alpha')
    // Caret rides along to the moved item's line.
    expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(2)
    view.destroy()
  })

  it('falls through off a list line so Tab keeps indenting normally', () => {
    const view = makeView('plain prose', 3)
    expect(indentListItemCommand(view)).toBe(false)
    expect(outdentListItemCommand(view)).toBe(false)
    expect(moveListItemUpCommand(view)).toBe(false)
    expect(view.state.doc.toString()).toBe('plain prose')
    view.destroy()
  })

  it('reports no-op at the edges of a sibling run', () => {
    const view = makeView(DOC, DOC.indexOf('alpha'))
    // 'alpha' is already first, and top level.
    expect(moveListItemUpCommand(view)).toBe(false)
    expect(outdentListItemCommand(view)).toBe(false)
    expect(view.state.doc.toString()).toBe(DOC)
    view.destroy()
  })

  it('keeps the caret column when indenting', () => {
    const cursor = DOC.indexOf('beta') + 2
    const view = makeView(DOC, cursor)
    indentListItemCommand(view)
    const head = view.state.selection.main.head
    const line = view.state.doc.lineAt(head)
    // Same offset within the line, which is now two spaces wider.
    expect(head - line.from).toBe(cursor - (DOC.length - '- beta'.length))
    view.destroy()
  })
})
