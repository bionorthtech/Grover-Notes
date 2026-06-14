import { useCallback, useMemo, useState } from 'react'
import type { VaultEntry } from '../../types'
import { buildTypeEntryMap, getTypeColor } from '../../utils/typeColors'
import { GraphView } from './GraphView'
import { GraphSettingsPanel, type GraphTypeLegendItem } from './GraphSettingsPanel'
import { DEFAULT_GRAPH_PARAMS } from './graphParams'
import { buildGraphData, graphTypes, UNTYPED_KEY, type GraphFilter } from './graphData'

function GraphGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="6" cy="6" r="2.1" /><circle cx="18" cy="9" r="2.1" /><circle cx="9" cy="18" r="2.1" />
      <path d="M7.7 7.1 16 8.6M7.9 16.3 8.9 9.1M16.1 10.8 10.5 16.4" />
    </svg>
  )
}

/**
 * In-pane graph surface that replaces the note list + editor while open.
 * Header mimics a tab strip (Obsidian-style) with a single "Graph view" tab.
 */
export function GraphPane({ entries, onOpenNote, onClose, activeNotePath = null }: {
  entries: VaultEntry[]
  onOpenNote: (path: string) => void
  onClose: () => void
  activeNotePath?: string | null
}) {
  const [params, setParams] = useState(DEFAULT_GRAPH_PARAMS)
  const [showSettings, setShowSettings] = useState(true)
  const [relayoutNonce, setRelayoutNonce] = useState(0)
  const [colorByType, setColorByType] = useState(true)
  const [includeOrphans, setIncludeOrphans] = useState(false)
  const [localMode, setLocalMode] = useState(false)
  const [localHops, setLocalHops] = useState(1)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(() => new Set())

  const typeMap = useMemo(() => buildTypeEntryMap(entries), [entries])
  // Untyped notes use the brand green too so the graph + legend stay cohesive
  // (elsewhere untyped stays neutral grey, but the graph is an all-green surface).
  const typeColorExpr = useCallback(
    (type: string) => (type === UNTYPED_KEY ? 'var(--accent-blue)' : getTypeColor(type, typeMap[type]?.color)),
    [typeMap],
  )

  // Types present in the full (unfiltered) graph drive a stable legend.
  const availableTypes = useMemo(
    () => graphTypes(buildGraphData(entries, { includeOrphans })),
    [entries, includeOrphans],
  )
  const legend: GraphTypeLegendItem[] = availableTypes.map((name) => ({
    name,
    color: typeColorExpr(name),
    hidden: hiddenTypes.has(name),
  }))

  const localRoot = localMode ? activeNotePath : null
  const filter: GraphFilter = useMemo(
    () => ({ hiddenTypes, localRoot, localHops }),
    [hiddenTypes, localRoot, localHops],
  )

  const toggleType = useCallback((name: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  return (
    <div data-testid="graph-pane" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-end justify-between border-b border-border bg-[var(--surface-sidebar)] px-2 pt-1.5">
        <div
          data-testid="graph-tab"
          className="flex items-center gap-2 rounded-t-lg border border-b-0 border-border bg-[var(--surface-app)] py-1.5 pl-3 pr-1.5 text-[12.5px] font-medium text-foreground"
        >
          <span className="text-muted-foreground"><GraphGlyph /></span>
          <span>Graph view</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close graph"
            title="Close graph"
            className="ml-1 flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-[var(--state-hover)] hover:text-foreground"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings((open) => !open)}
          aria-label="Toggle graph settings"
          title="Graph settings"
          className="mb-1 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--state-hover)] hover:text-foreground"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2.2" /><circle cx="8" cy="17" r="2.2" />
          </svg>
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <GraphView
          entries={entries}
          onOpenNote={onOpenNote}
          params={params}
          relayoutNonce={relayoutNonce}
          filter={filter}
          includeOrphans={includeOrphans}
          colorByType={colorByType}
          typeColorExpr={typeColorExpr}
        />
        {showSettings && (
          <GraphSettingsPanel
            params={params}
            onChange={setParams}
            onClose={() => setShowSettings(false)}
            onRelayout={() => setRelayoutNonce((nonce) => nonce + 1)}
            colorByType={colorByType}
            onColorByTypeChange={setColorByType}
            includeOrphans={includeOrphans}
            onIncludeOrphansChange={setIncludeOrphans}
            localMode={localMode}
            onLocalModeChange={setLocalMode}
            localModeDisabled={!activeNotePath}
            localHops={localHops}
            onLocalHopsChange={setLocalHops}
            legend={legend}
            onToggleType={toggleType}
          />
        )}
      </div>
    </div>
  )
}
