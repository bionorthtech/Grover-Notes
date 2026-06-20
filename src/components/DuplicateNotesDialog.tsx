import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { ScrollArea } from './ui/scroll-area'
import { findDuplicateNotes } from '../lib/duplicateNotes'
import type { VaultEntry } from '../types'

interface DuplicateNotesDialogProps {
  open: boolean
  entries: VaultEntry[]
  onOpenNote: (path: string) => void
  onClose: () => void
}

/** Folder portion of a note path, for telling same-titled notes apart. */
function folderOf(path: string): string {
  const parts = path.split('/')
  parts.pop()
  return parts.join('/') || '/'
}

function DuplicateNotesBody({ entries, onOpenNote }: Omit<DuplicateNotesDialogProps, 'open' | 'onClose'>) {
  const groups = useMemo(() => findDuplicateNotes(entries), [entries])
  const totalDuplicates = groups.reduce((sum, group) => sum + group.notes.length, 0)

  return (
    <DialogContent className="sm:max-w-[520px]" data-testid="duplicate-notes-dialog">
      <DialogHeader>
        <DialogTitle>Duplicate notes</DialogTitle>
        <DialogDescription>
          {groups.length === 0
            ? 'No duplicate titles found. ✨'
            : `${totalDuplicates} notes share a title across ${groups.length} ${groups.length === 1 ? 'group' : 'groups'}.`}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[420px] pr-2">
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.title} className="rounded-lg border border-border">
              <div className="flex items-center justify-between px-3 py-1.5 text-sm font-medium text-foreground">
                <span className="truncate">{group.title}</span>
                <span className="tabular-nums text-xs text-muted-foreground">{group.notes.length}</span>
              </div>
              <ul className="m-0 list-none divide-y divide-border border-t border-border p-0">
                {group.notes.map((note) => (
                  <li key={note.path}>
                    <button
                      type="button"
                      onClick={() => onOpenNote(note.path)}
                      className="block w-full px-3 py-1.5 text-left transition-colors hover:bg-[var(--state-hover)]"
                    >
                      <span className="block truncate text-xs text-muted-foreground">{folderOf(note.path)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </ScrollArea>
    </DialogContent>
  )
}

/** Lists notes that share a title so they can be reviewed/merged. */
export function DuplicateNotesDialog({ open, entries, onOpenNote, onClose }: DuplicateNotesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      {open && <DuplicateNotesBody entries={entries} onOpenNote={onOpenNote} />}
    </Dialog>
  )
}
