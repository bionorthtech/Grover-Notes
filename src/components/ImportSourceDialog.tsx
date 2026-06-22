import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { detectAndTransform, sourceTypeLabel, type SourceNote } from '../lib/ingest'

interface ImportSourceDialogProps {
  open: boolean
  onImport: (note: SourceNote) => void
  onCancel: () => void
}

function ImportSourceBody({ onImport, onCancel }: Omit<ImportSourceDialogProps, 'open'>) {
  const [text, setText] = useState('')
  const result = useMemo(() => (text.trim() ? detectAndTransform(text) : null), [text])
  const note = result?.ok ? result.note : null

  return (
    <DialogContent className="sm:max-w-[620px]" data-testid="import-source-dialog">
      <DialogHeader>
        <DialogTitle>Import source</DialogTitle>
        <DialogDescription>
          Archive external content as a typed note. Paste a Reddit thread’s <code>.json</code> or a Discord export (JSON).
        </DialogDescription>
      </DialogHeader>

      <Textarea
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        placeholder="Paste JSON here…"
        className="min-h-[140px] resize-none font-mono text-xs"
      />

      {result && !result.ok && <p className="text-xs text-[var(--accent-red)]">{result.error}</p>}

      {note && (
        <div className="rounded-lg border border-border bg-[var(--surface-sidebar)] p-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{sourceTypeLabel(note.source)}</span>
            <span className="truncate font-medium text-foreground">{note.title}</span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {note.assets.length} asset{note.assets.length === 1 ? '' : 's'} · {note.body.split('\n').length} lines
          </p>
        </div>
      )}

      <DialogFooter className="flex-row items-center justify-end gap-2 sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => note && onImport(note)} disabled={!note}>Import note</Button>
      </DialogFooter>
    </DialogContent>
  )
}

/** Paste-to-import: turns pasted Reddit/Discord data into a typed Source note. */
export function ImportSourceDialog({ open, onImport, onCancel }: ImportSourceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      {open && <ImportSourceBody onImport={onImport} onCancel={onCancel} />}
    </Dialog>
  )
}
