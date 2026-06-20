import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Textarea } from './ui/textarea'
import { QueryBlockView } from './QueryBlockView'
import type { VaultEntry } from '../types'

interface QueryDialogProps {
  open: boolean
  entries: VaultEntry[]
  onOpenNote: (path: string) => void
  onClose: () => void
}

const EXAMPLE_QUERY = 'from: Project\nwhere: status = Active\nsort: modified desc\nlimit: 20\nas: table\nfields: title, status, modified'

function QueryDialogBody({ entries, onOpenNote, onClose }: Omit<QueryDialogProps, 'open'>) {
  const [source, setSource] = useState(EXAMPLE_QUERY)

  return (
    <DialogContent className="sm:max-w-[640px]" data-testid="query-dialog">
      <DialogHeader>
        <DialogTitle>Query notes</DialogTitle>
        <DialogDescription>
          Filter your vault live. Clauses: <code>from</code>, <code>where</code>, <code>sort</code>, <code>limit</code>, <code>as</code>, <code>fields</code>.
        </DialogDescription>
      </DialogHeader>

      <Textarea
        value={source}
        onChange={(event) => setSource(event.target.value)}
        spellCheck={false}
        className="min-h-[140px] resize-none font-mono text-xs"
        aria-label="Query"
      />

      <div className="max-h-[320px] overflow-y-auto">
        <QueryBlockView
          source={source}
          entries={entries}
          onOpenNote={(path) => { onOpenNote(path); onClose() }}
        />
      </div>
    </DialogContent>
  )
}

/** Live query runner for the grover-query engine. Mounted fresh on open. */
export function QueryDialog({ open, entries, onOpenNote, onClose }: QueryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      {open && <QueryDialogBody entries={entries} onOpenNote={onOpenNote} onClose={onClose} />}
    </Dialog>
  )
}
