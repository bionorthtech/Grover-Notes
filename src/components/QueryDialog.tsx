import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { QueryBlockView } from './QueryBlockView'
import type { SavedQuery, VaultEntry } from '../types'

interface QueryDialogProps {
  open: boolean
  entries: VaultEntry[]
  savedQueries: SavedQuery[]
  onSaveQuery: (name: string, source: string) => void
  onDeleteQuery: (name: string) => void
  onOpenNote: (path: string) => void
  onClose: () => void
}

const EXAMPLE_QUERY = 'from: Project\nwhere: status = Active\nsort: modified desc\nlimit: 20\nas: table\nfields: title, status, modified'

function SavedQueryChips({ saved, onLoad, onDelete }: { saved: SavedQuery[]; onLoad: (q: SavedQuery) => void; onDelete: (name: string) => void }) {
  if (saved.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {saved.map((query) => (
        <span key={query.name} className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--surface-app)] py-0.5 pl-2.5 pr-1 text-xs">
          <button type="button" onClick={() => onLoad(query)} className="text-foreground hover:underline">{query.name}</button>
          <button type="button" onClick={() => onDelete(query.name)} aria-label={`Delete ${query.name}`} className="flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-[var(--state-hover)] hover:text-foreground">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </span>
      ))}
    </div>
  )
}

function QueryDialogBody({ entries, savedQueries, onSaveQuery, onDeleteQuery, onOpenNote, onClose }: Omit<QueryDialogProps, 'open'>) {
  const [source, setSource] = useState(savedQueries[0]?.source ?? EXAMPLE_QUERY)
  const [name, setName] = useState('')

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSaveQuery(trimmed, source)
    setName('')
  }

  return (
    <DialogContent className="sm:max-w-[640px]" data-testid="query-dialog">
      <DialogHeader>
        <DialogTitle>Query notes</DialogTitle>
        <DialogDescription>
          Filter your vault live. Clauses: <code>from</code>, <code>where</code>, <code>sort</code>, <code>group</code>, <code>limit</code>, <code>as</code>, <code>fields</code>.
        </DialogDescription>
      </DialogHeader>

      <SavedQueryChips saved={savedQueries} onLoad={(q) => setSource(q.source)} onDelete={onDeleteQuery} />

      <Textarea
        value={source}
        onChange={(event) => setSource(event.target.value)}
        spellCheck={false}
        className="min-h-[120px] resize-none font-mono text-xs"
        aria-label="Query"
      />

      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); save() } }}
          placeholder="Save this query as…"
          className="h-8 text-sm"
        />
        <Button variant="outline" className="h-8 shrink-0" onClick={save} disabled={!name.trim()}>Save</Button>
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        <QueryBlockView source={source} entries={entries} onOpenNote={(path) => { onOpenNote(path); onClose() }} />
      </div>
    </DialogContent>
  )
}

/** Live query runner with saved queries. Mounted fresh on open. */
export function QueryDialog({ open, ...rest }: QueryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) rest.onClose() }}>
      {open && <QueryDialogBody {...rest} />}
    </Dialog>
  )
}
