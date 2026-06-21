import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../appCommandCatalog'
import type { CommandAction } from './types'
import type { SidebarSelection } from '../../types'

interface NavigationCommandsConfig {
  onQuickOpen: () => void
  onSelect: (sel: SidebarSelection) => void
  selection?: SidebarSelection
  onRenameFolder?: () => void
  onDeleteFolder?: () => void
  onRevealSelectedFolder?: () => void
  onCopySelectedFolderPath?: () => void
  showInbox?: boolean
  onGoBack?: () => void
  onGoForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  onOpenDailyNote?: () => void
  onQuickCapture?: () => void
  onAutoTypeInbox?: () => void
  onDailyRollup?: () => void
  onShowTasks?: () => void
  onQueryNotes?: () => void
  onVaultHealth?: () => void
  onVaultStats?: () => void
  onFindDuplicates?: () => void
  onFindRelated?: () => void
  onSaveVaultReport?: () => void
  onPrevDailyNote?: () => void
  onNextDailyNote?: () => void
}

interface FolderCommandsConfig {
  canMutateFolder: boolean
  folderSelected: boolean
  onCopySelectedFolderPath?: () => void
  onDeleteFolder?: () => void
  onRenameFolder?: () => void
  onRevealSelectedFolder?: () => void
}

function canRunFolderCommand(folderSelected: boolean, action?: () => void): boolean {
  return folderSelected && action !== undefined
}

function runOptionalCommand(action?: () => void) {
  action?.()
}

function buildFolderCommands({
  canMutateFolder,
  folderSelected,
  onCopySelectedFolderPath,
  onDeleteFolder,
  onRenameFolder,
  onRevealSelectedFolder,
}: FolderCommandsConfig): CommandAction[] {
  return [
    {
      id: 'reveal-selected-folder',
      label: 'Reveal Folder in Finder',
      group: 'Navigation',
      keywords: ['folder', 'directory', 'finder', 'reveal', 'show', 'filesystem'],
      enabled: canRunFolderCommand(folderSelected, onRevealSelectedFolder),
      execute: () => runOptionalCommand(onRevealSelectedFolder),
    },
    {
      id: 'copy-selected-folder-path',
      label: 'Copy Folder Path',
      group: 'Navigation',
      keywords: ['folder', 'directory', 'path', 'copy', 'clipboard'],
      enabled: canRunFolderCommand(folderSelected, onCopySelectedFolderPath),
      execute: () => runOptionalCommand(onCopySelectedFolderPath),
    },
    {
      id: 'rename-folder',
      label: 'Rename Folder',
      group: 'Navigation',
      keywords: ['folder', 'directory', 'sidebar', 'rename'],
      enabled: canRunFolderCommand(canMutateFolder, onRenameFolder),
      execute: () => runOptionalCommand(onRenameFolder),
    },
    {
      id: 'delete-folder',
      label: 'Delete Folder',
      group: 'Navigation',
      keywords: ['folder', 'directory', 'sidebar', 'delete', 'remove'],
      enabled: canRunFolderCommand(canMutateFolder, onDeleteFolder),
      execute: () => runOptionalCommand(onDeleteFolder),
    },
  ]
}

function buildBaseCommands(config: NavigationCommandsConfig): CommandAction[] {
  const {
    onQuickOpen,
    onSelect,
    onGoBack,
    onGoForward,
    canGoBack,
    canGoForward,
    onOpenDailyNote,
    onQuickCapture,
    onAutoTypeInbox,
    onDailyRollup,
    onShowTasks,
    onQueryNotes,
    onVaultHealth,
    onVaultStats,
    onFindDuplicates,
    onFindRelated,
    onSaveVaultReport,
    onPrevDailyNote,
    onNextDailyNote,
  } = config

  return [
    { id: 'search-notes', label: 'Search Notes', group: 'Navigation', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.fileQuickOpen), keywords: ['find', 'open', 'quick'], enabled: true, execute: onQuickOpen },
    { id: 'open-daily-note', label: 'Open daily note…', group: 'Navigation', keywords: ['daily', 'today', 'journal', 'calendar', 'date', 'diary'], enabled: !!onOpenDailyNote, execute: () => onOpenDailyNote?.() },
    { id: 'prev-daily-note', label: 'Previous daily note', group: 'Navigation', keywords: ['daily', 'previous', 'yesterday', 'back', 'journal'], enabled: !!onPrevDailyNote, execute: () => onPrevDailyNote?.() },
    { id: 'next-daily-note', label: 'Next daily note', group: 'Navigation', keywords: ['daily', 'next', 'tomorrow', 'forward', 'journal'], enabled: !!onNextDailyNote, execute: () => onNextDailyNote?.() },
    { id: 'quick-capture', label: 'Quick capture', group: 'Navigation', keywords: ['capture', 'jot', 'inbox', 'note', 'quick', 'idea', 'todo'], enabled: !!onQuickCapture, execute: () => onQuickCapture?.() },
    { id: 'auto-type-inbox', label: 'Auto-type inbox notes (AI)', group: 'Navigation', keywords: ['ai', 'type', 'classify', 'inbox', 'organize', 'tag', 'auto'], enabled: !!onAutoTypeInbox, execute: () => onAutoTypeInbox?.() },
    { id: 'daily-rollup', label: 'Summarize today (AI rollup)', group: 'Navigation', keywords: ['ai', 'summary', 'rollup', 'today', 'daily', 'recap', 'digest'], enabled: !!onDailyRollup, execute: () => onDailyRollup?.() },
    { id: 'show-tasks', label: 'Show all tasks', group: 'Insights', keywords: ['task', 'tasks', 'todo', 'checkbox', 'todos', 'checklist'], enabled: !!onShowTasks, execute: () => onShowTasks?.() },
    { id: 'query-notes', label: 'Query notes', group: 'Insights', keywords: ['query', 'filter', 'table', 'dataview', 'search', 'list', 'where'], enabled: !!onQueryNotes, execute: () => onQueryNotes?.() },
    { id: 'vault-health', label: 'Vault health report', group: 'Insights', keywords: ['health', 'report', 'orphan', 'broken', 'stub', 'stale', 'untyped', 'audit', 'cleanup'], enabled: !!onVaultHealth, execute: () => onVaultHealth?.() },
    { id: 'vault-stats', label: 'Vault stats', group: 'Insights', keywords: ['stats', 'statistics', 'overview', 'dashboard', 'counts', 'metrics', 'insights'], enabled: !!onVaultStats, execute: () => onVaultStats?.() },
    { id: 'find-duplicates', label: 'Find duplicate notes', group: 'Insights', keywords: ['duplicate', 'duplicates', 'dupes', 'merge', 'same', 'title', 'cleanup'], enabled: !!onFindDuplicates, execute: () => onFindDuplicates?.() },
    { id: 'find-related', label: 'Find related notes', group: 'Insights', keywords: ['related', 'similar', 'connections', 'more like this', 'discover', 'suggest'], enabled: !!onFindRelated, execute: () => onFindRelated?.() },
    { id: 'save-vault-report', label: 'Save vault report', group: 'Insights', keywords: ['report', 'snapshot', 'export', 'stats', 'health', 'audit'], enabled: !!onSaveVaultReport, execute: () => onSaveVaultReport?.() },
    { id: 'go-all', label: 'Go to All Notes', group: 'Navigation', keywords: ['filter'], enabled: true, execute: () => onSelect({ kind: 'filter', filter: 'all' }) },
    { id: 'go-archived', label: 'Go to Archived', group: 'Navigation', keywords: [], enabled: true, execute: () => onSelect({ kind: 'filter', filter: 'archived' }) },
    { id: 'go-changes', label: 'Go to Changes', group: 'Navigation', keywords: ['git', 'modified', 'pending'], enabled: true, execute: () => onSelect({ kind: 'filter', filter: 'changes' }) },
    { id: 'go-pulse', label: 'Go to History', group: 'Navigation', keywords: ['activity', 'history', 'commits', 'git', 'feed'], enabled: true, execute: () => onSelect({ kind: 'filter', filter: 'pulse' }) },
    { id: 'go-back', label: 'Go Back', group: 'Navigation', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewGoBack), keywords: ['previous', 'history', 'back'], enabled: !!canGoBack, execute: () => onGoBack?.() },
    { id: 'go-forward', label: 'Go Forward', group: 'Navigation', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewGoForward), keywords: ['next', 'history', 'forward'], enabled: !!canGoForward, execute: () => onGoForward?.() },
  ]
}

function insertInboxCommand(commands: CommandAction[], showInbox: boolean, onSelect: (sel: SidebarSelection) => void) {
  if (!showInbox) return commands

  commands.splice(5, 0, {
    id: 'go-inbox',
    label: 'Go to Inbox',
    group: 'Navigation',
    keywords: ['inbox', 'unlinked', 'orphan', 'unorganized', 'triage'],
    enabled: true,
    execute: () => onSelect({ kind: 'filter', filter: 'inbox' }),
  })
  return commands
}

export function buildNavigationCommands(config: NavigationCommandsConfig): CommandAction[] {
  const {
    onSelect,
    selection,
    onRenameFolder,
    onDeleteFolder,
    onRevealSelectedFolder,
    onCopySelectedFolderPath,
    showInbox = true,
  } = config
  const folderSelected = selection?.kind === 'folder'
  const canMutateFolder = folderSelected && selection.path.length > 0
  const commands = [
    ...buildBaseCommands(config),
    ...buildFolderCommands({
      canMutateFolder,
      folderSelected,
      onRenameFolder,
      onDeleteFolder,
      onRevealSelectedFolder,
      onCopySelectedFolderPath,
    }),
  ]
  return insertInboxCommand(commands, showInbox, onSelect)
}
