import { useMemo } from 'react'
import type { VaultEntry } from '../types'
import { evaluateQuery, fieldValue, parseQuery } from '../lib/queryBlocks'

interface QueryBlockViewProps {
  /** Raw body of the ```grover-query block. */
  source: string
  entries: VaultEntry[]
  onOpenNote: (path: string) => void
}

function displayValue(entry: VaultEntry, field: string): string {
  const value = fieldValue(entry, field)
  if (value === null) return '—'
  if ((field === 'modified' || field === 'created') && typeof value === 'number') {
    return new Date(value * 1000).toLocaleDateString()
  }
  return String(value)
}

/** Renders a grover-query block as a live table or list of matching notes. */
export function QueryBlockView({ source, entries, onOpenNote }: QueryBlockViewProps) {
  const { query, results } = useMemo(() => {
    const parsed = parseQuery(source)
    return { query: parsed, results: evaluateQuery(parsed, entries) }
  }, [source, entries])

  return (
    <div className="grover-query-block my-2 overflow-hidden rounded-lg border border-border bg-[var(--surface-sidebar)]" data-testid="query-block">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span>{query.from ? `${query.from} notes` : 'Notes'}</span>
        <span className="tabular-nums">{results.length}</span>
      </div>

      {query.errors.length > 0 && (
        <div className="border-b border-border px-3 py-1.5 text-xs text-[var(--accent-red)]">
          {query.errors.join(' · ')}
        </div>
      )}

      {results.length === 0 ? (
        <div className="px-3 py-3 text-sm text-muted-foreground">No matching notes.</div>
      ) : query.render === 'list' ? (
        <ul className="m-0 list-none divide-y divide-border p-0">
          {results.map((entry) => (
            <li key={entry.path}>
              <button
                type="button"
                onClick={() => onOpenNote(entry.path)}
                className="block w-full px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-[var(--state-hover)]"
              >
                {entry.title || entry.filename}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              {query.fields.map((field) => (
                <th key={field} className="border-b border-border px-3 py-1.5 font-medium capitalize">{field}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((entry) => (
              <tr key={entry.path} className="transition-colors hover:bg-[var(--state-hover)]">
                {query.fields.map((field, index) => (
                  <td key={field} className="border-b border-border px-3 py-1.5 align-top">
                    {index === 0 ? (
                      <button
                        type="button"
                        onClick={() => onOpenNote(entry.path)}
                        className="text-left text-foreground hover:underline"
                      >
                        {displayValue(entry, field)}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">{displayValue(entry, field)}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
