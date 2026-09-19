/**
 * Command-palette outline actions reach the raw editor through a window event,
 * mirroring `grover:markdown-table-edit`. The palette holds no reference to the
 * CodeMirror view, and threading one through the app would be far more plumbing
 * than this needs.
 */
export const MARKDOWN_OUTLINE_EDIT_EVENT = 'grover:markdown-outline-edit'

export type OutlineAction = 'indent' | 'outdent' | 'move-up' | 'move-down'

export function requestMarkdownOutlineEdit(action: OutlineAction): void {
  window.dispatchEvent(new CustomEvent(MARKDOWN_OUTLINE_EDIT_EVENT, { detail: { action } }))
}
