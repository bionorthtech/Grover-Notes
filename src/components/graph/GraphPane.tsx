import { useState } from 'react'
import type { VaultEntry } from '../../types'
import { GraphView } from './GraphView'
import { GraphSettingsPanel } from './GraphSettingsPanel'
import { DEFAULT_GRAPH_PARAMS } from './graphParams'
import { GroverMark } from '../GroverMark'

interface GraphPaneProps {
  entries: VaultEntry[]
  onOpenNote: (path: string) => void
  onClose: () => void
}

/** In-pane graph surface that replaces the note list + editor while open. */
export function GraphPane({ entries, onOpenNote, onClose }: GraphPaneProps) {
  const [params, setParams] = useState(DEFAULT_GRAPH_PARAMS)
  const [showSettings, setShowSettings] = useState(true)

  return (
    <div data-testid="graph-pane" className="app__editor flex min-w-0 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <GroverMark size={16} />
          <span>Graph view</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSettings((open) => !open)}
            aria-label="Toggle graph settings"
            title="Graph settings"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--state-hover)] hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
              <circle cx="16" cy="7" r="2.2" /><circle cx="8" cy="17" r="2.2" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close graph"
            title="Close graph"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--state-hover)] hover:text-foreground"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <GraphView entries={entries} onOpenNote={onOpenNote} params={params} />
        </div>
        {showSettings && (
          <GraphSettingsPanel params={params} onChange={setParams} onClose={() => setShowSettings(false)} />
        )}
      </div>
    </div>
  )
}
