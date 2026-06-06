import { useEffect } from 'react'
import type { VaultEntry } from '../../types'
import { GraphView } from './GraphView'
import { GroverMark } from '../GroverMark'

interface GraphOverlayProps {
  entries: VaultEntry[]
  onOpenNote: (path: string) => void
  onClose: () => void
}

/** Full-screen overlay hosting the global note graph. */
export function GraphOverlay({ entries, onOpenNote, onClose }: GraphOverlayProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      data-testid="graph-overlay"
      className="grover-fade-up fixed inset-0 z-[1000] flex flex-col bg-[var(--surface-app)]"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <GroverMark size={18} />
          <span>Graph</span>
          <span className="text-xs text-muted-foreground">{entries.length > 0 ? 'click a node to open · scroll to zoom · drag to pan' : ''}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close graph"
          className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-[var(--state-hover)] hover:text-foreground"
        >
          Esc
        </button>
      </header>
      <div className="flex-1">
        <GraphView entries={entries} onOpenNote={(path) => { onOpenNote(path); onClose() }} />
      </div>
    </div>
  )
}
