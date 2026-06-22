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
import { Input } from './ui/input'
import { Button } from './ui/button'
import { detectAndTransform, sourceTypeLabel, type SourceNote } from '../lib/ingest'
import { fetchAndDetect } from '../lib/ingest/fetchUrl'

interface ImportSourceDialogProps {
  open: boolean
  onImport: (note: SourceNote) => void
  onCancel: () => void
}

function SourcePreview({ note }: { note: SourceNote }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--surface-sidebar)] p-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{sourceTypeLabel(note.source)}</span>
        <span className="truncate font-medium text-foreground">{note.title}</span>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {note.assets.length} asset{note.assets.length === 1 ? '' : 's'} · {note.body.split('\n').length} lines
      </p>
    </div>
  )
}

function ImportSourceBody({ onImport, onCancel }: Omit<ImportSourceDialogProps, 'open'>) {
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchedNote, setFetchedNote] = useState<SourceNote | null>(null)

  const pasteResult = useMemo(() => (text.trim() ? detectAndTransform(text) : null), [text])
  const note = fetchedNote ?? (pasteResult?.ok ? pasteResult.note : null)

  async function handleFetch() {
    if (!url.trim() || fetching) return
    setFetching(true)
    setFetchError(null)
    setFetchedNote(null)
    const result = await fetchAndDetect(url)
    if (result.ok) {
      setFetchedNote(result.note)
    } else {
      setFetchError(result.error)
    }
    setFetching(false)
  }

  return (
    <DialogContent className="sm:max-w-[620px]" data-testid="import-source-dialog">
      <DialogHeader>
        <DialogTitle>Import source</DialogTitle>
        <DialogDescription>
          Archive external content as a typed note. Fetch a public URL (Reddit thread, forum topic, or article), or paste exported JSON/HTML below.
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-2">
        <Input
          value={url}
          onChange={(event) => { setUrl(event.target.value); setFetchedNote(null); setFetchError(null) }}
          onKeyDown={(event) => { if (event.key === 'Enter') void handleFetch() }}
          spellCheck={false}
          placeholder="https://www.reddit.com/r/…/comments/…"
          className="text-sm"
        />
        <Button variant="secondary" onClick={() => void handleFetch()} disabled={!url.trim() || fetching}>
          {fetching ? 'Fetching…' : 'Fetch'}
        </Button>
      </div>

      {fetchError && <p className="text-xs text-[var(--accent-red)]">{fetchError}</p>}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or paste content
        <span className="h-px flex-1 bg-border" />
      </div>

      <Textarea
        value={text}
        onChange={(event) => { setText(event.target.value); setFetchedNote(null) }}
        spellCheck={false}
        placeholder="Paste a Reddit thread’s .json, a Discord/forum export, or an article’s HTML…"
        className="min-h-[120px] resize-none font-mono text-xs"
      />

      {!fetchedNote && pasteResult && !pasteResult.ok && (
        <p className="text-xs text-[var(--accent-red)]">{pasteResult.error}</p>
      )}

      {note && <SourcePreview note={note} />}

      <DialogFooter className="flex-row items-center justify-end gap-2 sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => note && onImport(note)} disabled={!note}>Import note</Button>
      </DialogFooter>
    </DialogContent>
  )
}

/** Paste- or fetch-to-import: turns external Reddit/Discord/forum data into a typed Source note. */
export function ImportSourceDialog({ open, onImport, onCancel }: ImportSourceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      {open && <ImportSourceBody onImport={onImport} onCancel={onCancel} />}
    </Dialog>
  )
}
