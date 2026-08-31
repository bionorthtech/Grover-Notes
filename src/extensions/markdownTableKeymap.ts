import { Prec } from '@codemirror/state'
import { keymap, type Command, type EditorView } from '@codemirror/view'

import {
  applyTableEdit,
  formatTableAt,
  moveToAdjacentCell,
  type Cursor,
  type TableEdit,
} from '../lib/markdownTableEditing'

/**
 * CodeMirror bindings for markdown tables.
 *
 * Deliberately thin: it only converts between CodeMirror's document/selection
 * and the plain lines + {line, ch} cursor that `markdownTableEditing` works on.
 * All table behaviour and its tests live in that pure layer.
 */

interface DocCursor {
  lines: string[]
  cursor: Cursor
}

function readDocCursor(view: EditorView): DocCursor {
  const { state } = view
  const position = state.selection.main.head
  const line = state.doc.lineAt(position)
  return {
    lines: state.doc.toString().split('\n'),
    // CodeMirror lines are 1-based; the pure layer is 0-based.
    cursor: { line: line.number - 1, ch: position - line.from },
  }
}

/** Replace the whole document and place the cursor, in one transaction. */
function writeDocCursor(view: EditorView, lines: string[], cursor: Cursor): void {
  const text = lines.join('\n')
  const target = view.state.doc.line(Math.min(cursor.line + 1, lines.length))
  const selection = Math.min(target.from + cursor.ch, text.length)
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
    selection: { anchor: selection },
    scrollIntoView: true,
  })
}

function moveCommand(direction: 'next' | 'prev'): Command {
  return (view) => {
    const { lines, cursor } = readDocCursor(view)
    const result = moveToAdjacentCell(lines, cursor, direction)
    // Returning false lets Tab fall through to normal indentation outside tables.
    if (!result) return false
    writeDocCursor(view, result.lines, result.cursor)
    return true
  }
}

/** Reformat the table under the cursor, keeping the cursor where it was. */
export const formatTableCommand: Command = (view) => {
  const { lines, cursor } = readDocCursor(view)
  const result = formatTableAt(lines, cursor.line)
  if (!result) return false
  writeDocCursor(view, result.lines, cursor)
  return true
}

export function tableEditCommand(edit: TableEdit): Command {
  return (view) => {
    const { lines, cursor } = readDocCursor(view)
    const result = applyTableEdit(lines, cursor, edit)
    if (!result) return false
    writeDocCursor(view, result.lines, result.cursor)
    return true
  }
}

/**
 * Tab/Shift-Tab move between cells only when the cursor is inside a table;
 * elsewhere they fall through to the default keymap. Bound at highest
 * precedence so the table case wins over plain indentation.
 */
export function markdownTableKeymap() {
  return Prec.highest(
    keymap.of([
      { key: 'Tab', run: moveCommand('next') },
      { key: 'Shift-Tab', run: moveCommand('prev') },
      { key: 'Mod-Shift-f', run: formatTableCommand },
    ]),
  )
}
