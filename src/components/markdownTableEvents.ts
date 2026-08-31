import type { TableEdit } from '../lib/markdownTableEditing'

/**
 * Command-palette actions reach the raw editor through a window event, matching
 * the existing `grover:focus-note-icon-property` pattern. The palette has no
 * reference to the CodeMirror view, and threading one through the whole app
 * would be far more plumbing than this needs.
 */
export const MARKDOWN_TABLE_EDIT_EVENT = 'grover:markdown-table-edit'

export type MarkdownTableEditDetail = { edit: TableEdit } | { format: true }

export function requestMarkdownTableEdit(detail: MarkdownTableEditDetail): void {
  window.dispatchEvent(new CustomEvent(MARKDOWN_TABLE_EDIT_EVENT, { detail }))
}
