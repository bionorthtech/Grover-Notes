import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { ScrollArea } from './ui/scroll-area'
import { Button } from './ui/button'
import { analyzeVaultHealth, formatHealthReportMarkdown, type HealthCategory } from '../lib/noteHealth'
import { writeClipboardText } from '../utils/clipboardText'
import type { VaultEntry } from '../types'

interface NoteHealthDialogProps {
  open: boolean
  entries: VaultEntry[]
  onOpenNote: (path: string) => void
  onClose: () => void
}

function CategorySection({ category, onOpenNote }: { category: HealthCategory; onOpenNote: (path: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`}>
          <path d="M6 3.5 11 8l-5 4.5" />
        </svg>
        <span className="text-sm font-medium text-foreground">{category.label}</span>
        <span className="ml-auto tabular-nums text-xs text-muted-foreground">{category.notes.length}</span>
      </button>
      {open && (
        <div className="border-t border-border">
          <p className="px-3 py-1.5 text-xs text-muted-foreground">{category.description}</p>
          <ul className="m-0 list-none divide-y divide-border p-0">
            {category.notes.map((note) => (
              <li key={note.path}>
                <button
                  type="button"
                  onClick={() => onOpenNote(note.path)}
                  className="block w-full truncate px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-[var(--state-hover)]"
                >
                  {note.title || note.filename}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function NoteHealthBody({ entries, onOpenNote }: Omit<NoteHealthDialogProps, 'open' | 'onClose'>) {
  const report = useMemo(() => analyzeVaultHealth(entries), [entries])
  const healthyPct = report.scanned > 0 ? Math.round((report.healthy / report.scanned) * 100) : 100

  return (
    <DialogContent className="sm:max-w-[520px]" data-testid="note-health-dialog">
      <DialogHeader>
        <DialogTitle>Vault health</DialogTitle>
        <DialogDescription>
          {report.healthy} of {report.scanned} notes look healthy ({healthyPct}%).
          {report.categories.length > 0 ? ' Expand a category to review and fix.' : ' Nothing needs attention.'}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[440px] pr-2">
        <div className="space-y-2">
          {report.categories.map((category) => (
            <CategorySection key={category.kind} category={category} onOpenNote={onOpenNote} />
          ))}
        </div>
      </ScrollArea>

      {report.categories.length > 0 && (
        <div className="flex justify-end border-t border-border pt-3">
          <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => void writeClipboardText(formatHealthReportMarkdown(report))}>
            Copy markdown
          </Button>
        </div>
      )}
    </DialogContent>
  )
}

/** Vault-wide health report grouped by issue kind. Mounted fresh on open. */
export function NoteHealthDialog({ open, entries, onOpenNote, onClose }: NoteHealthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      {open && <NoteHealthBody entries={entries} onOpenNote={onOpenNote} />}
    </Dialog>
  )
}
