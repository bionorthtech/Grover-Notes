import { useMemo } from 'react'
import type { VaultEntry } from '../types'
import { fieldValue, groupResults, parseQuery, type GroverQuery } from '../lib/queryBlocks'

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

function ResultList({ notes, onOpenNote }: { notes: VaultEntry[]; onOpenNote: (path: string) => void }) {
  return (
    <ul className="m-0 list-none divide-y divide-border p-0">
      {notes.map((entry) => (
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
  )
}

function ResultTable({ notes, fields, onOpenNote }: { notes: VaultEntry[]; fields: string[]; onOpenNote: (path: string) => void }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          {fields.map((field) => (
            <th key={field} className="border-b border-border px-3 py-1.5 font-medium capitalize">{field}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {notes.map((entry) => (
          <tr key={entry.path} className="transition-colors hover:bg-[var(--state-hover)]">
            {fields.map((field, index) => (
              <td key={field} className="border-b border-border px-3 py-1.5 align-top">
                {index === 0 ? (
                  <button type="button" onClick={() => onOpenNote(entry.path)} className="text-left text-foreground hover:underline">
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
  )
}

function ResultBody({ notes, query, onOpenNote }: { notes: VaultEntry[]; query: GroverQuery; onOpenNote: (path: string) => void }) {
  return query.render === 'list'
    ? <ResultList notes={notes} onOpenNote={onOpenNote} />
    : <ResultTable notes={notes} fields={query.fields} onOpenNote={onOpenNote} />
}

/** Renders a grover-query block as a live table/list, optionally grouped. */
export function QueryBlockView({ source, entries, onOpenNote }: QueryBlockViewProps) {
  const { query, groups, total } = useMemo(() => {
    const parsed = parseQuery(source)
    const grouped = groupResults(parsed, entries)
    return { query: parsed, groups: grouped, total: grouped.reduce((sum, group) => sum + group.notes.length, 0) }
  }, [source, entries])

  return (
    <div className="grover-query-block my-2 overflow-hidden rounded-lg border border-border bg-[var(--surface-sidebar)]" data-testid="query-block">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span>{query.from ? `${query.from} notes` : 'Notes'}{query.groupBy ? ` by ${query.groupBy}` : ''}</span>
        <span className="tabular-nums">{total}</span>
      </div>

      {query.errors.length > 0 && (
        <div className="border-b border-border px-3 py-1.5 text-xs text-[var(--accent-red)]">
          {query.errors.join(' · ')}
        </div>
      )}

      {total === 0 ? (
        <div className="px-3 py-3 text-sm text-muted-foreground">No matching notes.</div>
      ) : query.groupBy ? (
        groups.map((group) => (
          <div key={group.key}>
            <div className="flex items-center justify-between bg-[var(--surface-app)] px-3 py-1 text-xs font-medium text-foreground">
              <span>{group.key}</span>
              <span className="tabular-nums text-muted-foreground">{group.notes.length}</span>
            </div>
            <ResultBody notes={group.notes} query={query} onOpenNote={onOpenNote} />
          </div>
        ))
      ) : (
        <ResultBody notes={groups[0].notes} query={query} onOpenNote={onOpenNote} />
      )}
    </div>
  )
}
