import { requestMarkdownTableEdit } from '../../components/markdownTableEvents'
import { trackEvent } from '../../lib/telemetry'
import type { TableEdit } from '../../lib/markdownTableEditing'
import type { CommandAction } from './types'

interface TableCommandsConfig {
  activeFileKind?: 'markdown' | 'text' | 'binary'
  hasActiveNote: boolean
}

interface TableCommandSpec {
  id: string
  label: string
  keywords: string[]
  detail: { edit: TableEdit } | { format: true }
}

const SPECS: TableCommandSpec[] = [
  { id: 'table-format', label: 'Format table', keywords: ['table', 'format', 'align', 'tidy', 'pretty'], detail: { format: true } },
  { id: 'table-insert-row-below', label: 'Table: insert row below', keywords: ['table', 'row', 'insert', 'add'], detail: { edit: { kind: 'insert-row-below' } } },
  { id: 'table-insert-row-above', label: 'Table: insert row above', keywords: ['table', 'row', 'insert', 'add'], detail: { edit: { kind: 'insert-row-above' } } },
  { id: 'table-delete-row', label: 'Table: delete row', keywords: ['table', 'row', 'delete', 'remove'], detail: { edit: { kind: 'delete-row' } } },
  { id: 'table-insert-column-right', label: 'Table: insert column right', keywords: ['table', 'column', 'insert', 'add'], detail: { edit: { kind: 'insert-column-right' } } },
  { id: 'table-insert-column-left', label: 'Table: insert column left', keywords: ['table', 'column', 'insert', 'add'], detail: { edit: { kind: 'insert-column-left' } } },
  { id: 'table-delete-column', label: 'Table: delete column', keywords: ['table', 'column', 'delete', 'remove'], detail: { edit: { kind: 'delete-column' } } },
  { id: 'table-sort-asc', label: 'Table: sort by column (ascending)', keywords: ['table', 'sort', 'order', 'asc'], detail: { edit: { kind: 'sort', direction: 'asc' } } },
  { id: 'table-sort-desc', label: 'Table: sort by column (descending)', keywords: ['table', 'sort', 'order', 'desc'], detail: { edit: { kind: 'sort', direction: 'desc' } } },
  { id: 'table-align-left', label: 'Table: align column left', keywords: ['table', 'align', 'column', 'left'], detail: { edit: { kind: 'align', alignment: 'left' } } },
  { id: 'table-align-center', label: 'Table: align column center', keywords: ['table', 'align', 'column', 'center', 'centre'], detail: { edit: { kind: 'align', alignment: 'center' } } },
  { id: 'table-align-right', label: 'Table: align column right', keywords: ['table', 'align', 'column', 'right'], detail: { edit: { kind: 'align', alignment: 'right' } } },
]

/**
 * Table actions operate on the raw markdown under the cursor, so they only
 * apply to editable text notes. Each is a no-op unless the cursor is actually
 * inside a table — the editor layer decides that.
 */
export function buildTableCommands(config: TableCommandsConfig): CommandAction[] {
  const activeFileKind = config.activeFileKind ?? 'markdown'
  const enabled = config.hasActiveNote && activeFileKind !== 'binary'

  return SPECS.map((spec) => ({
    id: spec.id,
    label: spec.label,
    group: 'Note' as const,
    keywords: spec.keywords,
    enabled,
    execute: () => {
      // Command id only — never note content.
      trackEvent('table_command_used', { command: spec.id })
      requestMarkdownTableEdit(spec.detail)
    },
  }))
}
