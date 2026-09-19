import { Prec } from '@codemirror/state'
import { keymap, type Command, type EditorView } from '@codemirror/view'

import {
  indentItem,
  moveItemDown,
  moveItemUp,
  outdentItem,
  type OutlineResult,
} from '../lib/markdownOutline'

/**
 * CodeMirror bindings for markdown list outlining.
 *
 * Thin by design: it only converts between CodeMirror's document/selection and
 * the plain lines the pure outline layer works on. All behaviour and its tests
 * live in `markdownOutline.ts`.
 */

type OutlineOperation = (lines: string[], lineIndex: number) => OutlineResult | null

function runOutline(view: EditorView, operation: OutlineOperation): boolean {
  const { state } = view
  const head = state.selection.main.head
  const line = state.doc.lineAt(head)
  const lines = state.doc.toString().split('\n')
  // Keep the caret's offset within its line so typing position survives.
  const column = head - line.from

  const result = operation(lines, line.number - 1)
  if (!result) return false

  const text = result.lines.join('\n')
  const targetLineNumber = Math.min(result.cursorLine + 1, result.lines.length)
  const insert = { from: 0, to: state.doc.length, insert: text }

  view.dispatch({
    changes: insert,
    selection: { anchor: anchorFor(text, targetLineNumber, column) },
    scrollIntoView: true,
  })
  return true
}

/** Offset of `column` within 1-based `lineNumber` of `text`, clamped to the line. */
function anchorFor(text: string, lineNumber: number, column: number): number {
  const lines = text.split('\n')
  let offset = 0
  for (let index = 0; index < lineNumber - 1; index += 1) offset += lines[index].length + 1
  return offset + Math.min(column, lines[lineNumber - 1]?.length ?? 0)
}

const outlineCommand = (operation: OutlineOperation): Command => (view) => runOutline(view, operation)

export const indentListItemCommand = outlineCommand(indentItem)
export const outdentListItemCommand = outlineCommand(outdentItem)
export const moveListItemUpCommand = outlineCommand(moveItemUp)
export const moveListItemDownCommand = outlineCommand(moveItemDown)

/**
 * Bound at `Prec.high` — below the table keymap (`Prec.highest`) so a table
 * still wins Tab, and above the default keymap so lists beat plain indentation.
 * Every command returns false off a list line, letting the default binding run:
 * Tab still indents, and Alt-Arrow still moves the line.
 */
export function markdownOutlineKeymap() {
  return Prec.high(
    keymap.of([
      { key: 'Tab', run: indentListItemCommand },
      { key: 'Shift-Tab', run: outdentListItemCommand },
      { key: 'Alt-ArrowUp', run: moveListItemUpCommand },
      { key: 'Alt-ArrowDown', run: moveListItemDownCommand },
    ]),
  )
}
