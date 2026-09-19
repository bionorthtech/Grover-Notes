import { requestMarkdownOutlineEdit, type OutlineAction } from '../../components/markdownOutlineEvents'
import { trackEvent } from '../../lib/telemetry'
import type { CommandAction } from './types'

interface OutlineCommandsConfig {
  activeFileKind?: 'markdown' | 'text' | 'binary'
  hasActiveNote: boolean
  /** True when the CodeMirror raw editor is the active surface. */
  rawEditorActive: boolean
}

interface OutlineCommandSpec {
  id: string
  label: string
  keywords: string[]
  action: OutlineAction
}

const SPECS: OutlineCommandSpec[] = [
  { id: 'outline-indent', label: 'List: indent item', keywords: ['list', 'outline', 'indent', 'nest', 'demote'], action: 'indent' },
  { id: 'outline-outdent', label: 'List: outdent item', keywords: ['list', 'outline', 'outdent', 'unindent', 'promote'], action: 'outdent' },
  { id: 'outline-move-up', label: 'List: move item up', keywords: ['list', 'outline', 'move', 'up', 'reorder'], action: 'move-up' },
  { id: 'outline-move-down', label: 'List: move item down', keywords: ['list', 'outline', 'move', 'down', 'reorder'], action: 'move-down' },
]

/**
 * Outline actions rewrite raw markdown, so like the table commands they need
 * the CodeMirror raw editor showing — the rich editor manages list structure
 * itself. Each is still a no-op unless the cursor sits on a list item.
 */
export function buildOutlineCommands(config: OutlineCommandsConfig): CommandAction[] {
  const activeFileKind = config.activeFileKind ?? 'markdown'
  const enabled = config.hasActiveNote && activeFileKind !== 'binary' && config.rawEditorActive

  return SPECS.map((spec) => ({
    id: spec.id,
    label: spec.label,
    group: 'Note' as const,
    keywords: spec.keywords,
    enabled,
    execute: () => {
      // Command id only — never note content.
      trackEvent('outline_command_used', { command: spec.id })
      requestMarkdownOutlineEdit(spec.action)
    },
  }))
}
