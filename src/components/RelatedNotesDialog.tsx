import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { ScrollArea } from './ui/scroll-area'
import { getTypeColor } from '../utils/typeColors'
import { findRelatedNotes } from '../lib/relatedNotes'
import type { VaultEntry } from '../types'

interface RelatedNotesDialogProps {
  open: boolean
  activeEntry: VaultEntry | null
  entries: VaultEntry[]
  onOpenNote: (path: string) => void
  onClose: () => void
}

function RelatedNotesBody({ activeEntry, entries, onOpenNote }: Omit<RelatedNotesDialogProps, 'open' | 'onClose'>) {
  const related = useMemo(
    () => (activeEntry ? findRelatedNotes(activeEntry, entries) : []),
    [activeEntry, entries],
  )

  return (
    <DialogContent className="sm:max-w-[460px]" data-testid="related-notes-dialog">
      <DialogHeader>
        <DialogTitle>Related notes</DialogTitle>
        <DialogDescription>
          {related.length === 0
            ? `Nothing closely related to “${activeEntry?.title ?? ''}” yet.`
            : `Notes most connected to “${activeEntry?.title ?? ''}”.`}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[420px] pr-2">
        <ul className="m-0 list-none space-y-0.5 p-0">
          {related.map(({ entry, reason }) => (
            <li key={entry.path}>
              <button
                type="button"
                onClick={() => onOpenNote(entry.path)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--state-hover)]"
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: getTypeColor(entry.isA) }} />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{entry.title || entry.filename}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{reason}</span>
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </DialogContent>
  )
}

/** "More like this" for the active note, scored by shared connections. */
export function RelatedNotesDialog({ open, activeEntry, entries, onOpenNote, onClose }: RelatedNotesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      {open && <RelatedNotesBody activeEntry={activeEntry} entries={entries} onOpenNote={onOpenNote} />}
    </Dialog>
  )
}
